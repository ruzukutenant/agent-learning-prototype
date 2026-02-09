/**
 * Signal Session Agent - Main Orchestrator
 *
 * This is the main conversation loop that:
 * 1. Runs unified analysis on the user message
 * 2. Makes a decision (action + phase transition)
 * 3. Builds the system prompt
 * 4. Generates the response
 * 5. Validates and potentially regenerates
 * 6. Updates state
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  SignalSessionState,
  Message,
  OrchestratorResult,
  CreativeBrief,
  Decision
} from '../core/types.js';
import { createInitialState } from '../core/types.js';
import { runUnifiedAnalysis } from '../core/unified-analysis.js';
import { makeDecision, applyDecisionToState } from '../core/decision-engine.js';
import {
  buildSystemPrompt,
  buildCorrectionPrompt,
  validateResponse,
  updateVarietyTracker
} from '../core/prompt-builder.js';
import { generateCreativeBrief, parseCreativeBrief } from '../output/brief-generator.js';

// Lazy-initialize Anthropic client (allows env vars to be loaded first)
let _anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic();
  }
  return _anthropic;
}

// Configuration
const CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 1024,
  temperature: 0.75,
  retryTemperature: 0.5,
  maxRetries: 1
};

/**
 * Format messages for the LLM
 */
function formatMessagesForLLM(
  messages: Message[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages.map(m => ({
    role: m.role,
    content: m.content
  }));
}

/**
 * Generate LLM response
 */
async function generateLLMResponse(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  temperature: number = CONFIG.temperature
): Promise<string> {
  const response = await getAnthropicClient().messages.create({
    model: CONFIG.model,
    max_tokens: CONFIG.maxTokens,
    temperature,
    system: systemPrompt,
    messages
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return content.text;
}

/**
 * Process the opening message (no user input yet)
 */
export async function processOpeningMessage(
  sessionId: string,
  userContext?: Partial<SignalSessionState['user_context']>
): Promise<OrchestratorResult> {
  // Create initial state
  const state = createInitialState(sessionId, userContext);

  // For opening, action is always invite_thread
  const decision: Decision = {
    action: 'invite_thread',
    reasoning: 'Opening message - inviting the thread'
  };

  // Build system prompt
  const systemPrompt = buildSystemPrompt(state, decision.action);

  // Generate response (use a trigger message since API requires at least one message)
  const response = await generateLLMResponse(systemPrompt, [
    { role: 'user', content: 'Begin the Signal Session.' }
  ]);

  // Update state
  const newState = {
    ...state,
    turns_total: 1,
    turns_in_phase: 1,
    updated_at: new Date()
  };

  return {
    message: response,
    state: newState,
    decision,
    complete: false
  };
}

/**
 * Process a user message
 */
export async function processMessage(
  userMessage: string,
  conversationHistory: Message[],
  currentState: SignalSessionState
): Promise<OrchestratorResult> {
  // 1. Run unified analysis
  const analysis = await runUnifiedAnalysis(
    userMessage,
    conversationHistory,
    currentState
  );

  console.log('[Signal Session] Analysis:', {
    signals: analysis.signals,
    reasoning: analysis.reasoning
  });

  // 2. Make decision
  const decision = makeDecision(currentState, analysis.signals);

  console.log('[Signal Session] Decision:', decision);

  // 3. Apply decision to state (phase transition, turn counts)
  let newState = applyDecisionToState(currentState, decision, analysis.signals);

  // 4. Build system prompt
  let systemPrompt = buildSystemPrompt(newState, decision.action);

  // 5. Format conversation history + new user message
  const llmMessages = [
    ...formatMessagesForLLM(conversationHistory),
    { role: 'user' as const, content: userMessage }
  ];

  // 6. Generate response
  let response: string;

  // Special handling for brief generation
  if (decision.action === 'generate_brief') {
    const brief = await generateCreativeBrief(newState, conversationHistory);
    response = formatBriefAsResponse(brief);
    newState.generated_brief = brief;
  } else {
    response = await generateLLMResponse(systemPrompt, llmMessages);
  }

  // 7. Validate response
  const validationFailure = validateResponse(response, decision.action, newState);

  if (validationFailure) {
    console.log('[Signal Session] Validation failed:', validationFailure);

    // Build correction prompt and retry
    const correctionPrompt = buildCorrectionPrompt(
      systemPrompt,
      validationFailure,
      decision.action
    );

    response = await generateLLMResponse(
      correctionPrompt,
      llmMessages,
      CONFIG.retryTemperature
    );

    // Check again but don't retry further
    const secondValidation = validateResponse(response, decision.action, newState);
    if (secondValidation) {
      console.warn('[Signal Session] Second validation also failed:', secondValidation);
      // Continue anyway - better to have an imperfect response than none
    }
  }

  // 8. Update variety tracker
  newState = updateVarietyTracker(newState, response, decision.action);

  // 9. Check if complete
  const isComplete = newState.phase === 'complete';

  return {
    message: response,
    state: newState,
    decision,
    complete: isComplete,
    brief: newState.generated_brief || undefined
  };
}

/**
 * Format a creative brief as a chat response
 */
function formatBriefAsResponse(brief: CreativeBrief): string {
  const lines: string[] = [
    `Here's your creative brief based on what we've confirmed:`,
    '',
    `**Working Title:** ${brief.working_title}`,
    '',
    `**Core Insight:**`,
    brief.core_insight,
    '',
    `**Narrative Arc:**`,
    `- Opening tension: ${brief.narrative_arc.opening_tension}`,
    ...brief.narrative_arc.progression_beats.map(b => `- ${b}`),
    `- Insight crystallization: ${brief.narrative_arc.insight_crystallization}`,
    `- Close: ${brief.narrative_arc.close}`,
    '',
    `**Intended Reader:**`,
    `- Who: ${brief.intended_reader.who}`,
    `- Struggling with: ${brief.intended_reader.struggling_with}`,
  ];

  if (brief.intended_reader.current_misunderstanding) {
    lines.push(`- Misunderstanding: ${brief.intended_reader.current_misunderstanding}`);
  }

  lines.push(
    '',
    `**What This Clarifies:**`,
    ...brief.what_this_clarifies.map(c => `- ${c}`),
    '',
    `**Tone & Guardrails:**`,
    `- Qualities: ${brief.tone_and_guardrails.qualities.join(', ')}`,
    `- Do nots: ${brief.tone_and_guardrails.do_nots.join(', ')}`
  );

  if (brief.key_language_or_metaphors && brief.key_language_or_metaphors.length > 0) {
    lines.push(
      '',
      `**Key Language/Metaphors:**`,
      ...brief.key_language_or_metaphors.map(m => `- ${m}`)
    );
  }

  lines.push(
    '',
    `---`,
    '',
    `Does this brief feel true, clear, and worth finishing — or is there anything here that still feels off?`
  );

  return lines.join('\n');
}

/**
 * Create a new Signal Session
 */
export function createSession(
  sessionId: string,
  userContext?: Partial<SignalSessionState['user_context']>
): SignalSessionState {
  return createInitialState(sessionId, userContext);
}

/**
 * Get a summary of the current session state for debugging/display
 */
export function getSessionSummary(state: SignalSessionState): {
  phase: string;
  turn: number;
  hasInsight: boolean;
  hasArc: boolean;
  hasBrief: boolean;
} {
  return {
    phase: state.phase,
    turn: state.turns_total,
    hasInsight: state.confirmed_insight !== null,
    hasArc:
      state.arc_opening !== null &&
      state.arc_progression !== null &&
      state.arc_destination !== null,
    hasBrief: state.generated_brief !== null
  };
}
