/**
 * Signal Session Agent - Unified Analysis
 *
 * Single LLM call that extracts all signals from the user's message.
 * This follows the CoachMira pattern of separating analysis from response generation.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  Signals,
  SignalSessionState,
  UnifiedAnalysisResult,
  Message
} from './types.js';
import { DEFAULT_SIGNALS } from './types.js';

// Lazy-initialize Anthropic client
let _anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic();
  }
  return _anthropic;
}

/**
 * Build the analysis prompt based on current state
 */
function buildAnalysisPrompt(state: SignalSessionState): string {
  const phaseContext = getPhaseContextForAnalysis(state);

  return `You are analyzing a message in a Signal Session — a design-before-writing conversation that helps someone clarify an idea and build a narrative arc.

${phaseContext}

Your job is to extract signals from the user's latest message. Be precise and evidence-based.

<signal_definitions>
CONTENT STATE:
- idea_state: How clear is their idea?
  - "none": No idea articulated yet
  - "vague": Something mentioned but unclear
  - "emerging": Taking shape, some specifics
  - "clear": Well-articulated, specific

- depth_state: How deep have they gone?
  - "surface": Generic statements, common wisdom
  - "approaching": Specific experiences, tensions, questions they're sitting with
  - "deep": Risky to say, assumptions being questioned, previously unnamed

- insight_state: Quality of the core insight
  - "none": No insight articulated
  - "generic": True but safe ("be authentic")
  - "specific": Particular, risky, does real work
  - "confirmed": User explicitly confirmed it's the heart of the matter

- insight_text: The insight as articulated (null if none)

ARC STATE:
- arc_opening: Opening tension articulated?
  - "absent": Not discussed
  - "partial": Mentioned but unclear
  - "clear": Specific, concrete

- arc_progression: Progression articulated?
  - "absent": Not discussed
  - "partial": Mentioned but unclear
  - "clear": Specific shifts identified

- arc_destination: Destination articulated?
  - "absent": Not discussed
  - "partial": Mentioned but unclear
  - "clear": Specific landing identified

- arc_coherence: Do the elements work together?
  - "untested": Haven't stress-tested yet
  - "weak": Elements don't connect well
  - "strong": Arc flows and supports the insight

USER STATE:
- response_substance: How much meat in their response?
  - "thin": Very short, deflecting, not engaging
  - "adequate": Reasonable engagement
  - "rich": Substantive, specific, generative

- engagement: Energy/investment level
  - "low": Disengaged, going through motions
  - "medium": Present and participating
  - "high": Energized, invested, leaning in

- confirmation_state: Have they explicitly confirmed?
  - "none": No confirmation requested or given
  - "hesitant": Partial confirmation with qualifiers
  - "confirmed": Clear, explicit "yes"

- hesitation_indicators: Any phrases indicating doubt (array of strings)

PROCESS RISKS:
- premature_closure_risk: Trying to skip ahead?
  - "low": Appropriate pacing
  - "medium": Some rushing signals
  - "high": Clearly trying to jump ahead

- circular_exploration: Revisiting same ground?
  - "none": Fresh territory
  - "emerging": Starting to repeat
  - "stuck": Clearly circling

TURN DYNAMICS:
- clarity_shift: Did clarity increase this turn?
  - "none": No change
  - "incremental": Small improvement
  - "breakthrough": Significant clarification

- energy_shift: Did engagement shift?
  - "decreased": Less engaged than before
  - "stable": Same level
  - "increased": More engaged

- user_intent: What is the user trying to do?
  - "exploring": Thinking out loud, searching
  - "answering": Responding to a question
  - "questioning": Asking for clarification
  - "confirming": Affirming something
  - "deflecting": Avoiding depth
  - "rushing": Trying to skip ahead
</signal_definitions>

Analyze the message and return a JSON object with all signals plus:
- "reasoning": Brief explanation of your assessments (2-3 sentences)
- "suggested_action": What action seems most appropriate given the signals

Return ONLY valid JSON, no markdown formatting.`;
}

/**
 * Get phase-specific context for analysis
 */
function getPhaseContextForAnalysis(state: SignalSessionState): string {
  const phase = state.phase;

  let context = `<current_state>
Phase: ${phase}
Turn: ${state.turns_total}
Turns in phase: ${state.turns_in_phase}
</current_state>

`;

  switch (phase) {
    case 'thread_opening':
      context += `<phase_focus>
Looking for: Any idea, tension, or observation articulated
Key signals: idea_state, response_substance, user_intent
</phase_focus>`;
      break;

    case 'deepening':
      context += `<phase_focus>
Looking for: Movement from surface to depth
Key signals: depth_state, response_substance, circular_exploration
Watch for: Premature closure attempts, thin responses
</phase_focus>`;
      break;

    case 'insight_crystallization':
      context += `<phase_focus>
Looking for: A specific, non-generic insight
Key signals: insight_state, insight_text, confirmation_state
${state.confirmed_insight ? `Working toward confirming: "${state.confirmed_insight}"` : 'No insight captured yet'}
Watch for: Generic formulations that feel specific but aren't
</phase_focus>`;
      break;

    case 'arc_building':
      context += `<phase_focus>
Looking for: Clear arc elements (opening tension, progression, destination)
Key signals: arc_opening, arc_progression, arc_destination
Currently working on: ${state.current_arc_element || 'opening'}
${state.arc_opening ? `Opening: "${state.arc_opening}"` : ''}
${state.arc_progression ? `Progression: "${state.arc_progression}"` : ''}
${state.arc_destination ? `Destination: "${state.arc_destination}"` : ''}
</phase_focus>`;
      break;

    case 'arc_validation':
      context += `<phase_focus>
Looking for: Confirmation that the arc works, or identification of weaknesses
Key signals: arc_coherence, confirmation_state, hesitation_indicators
The arc:
- Opening: "${state.arc_opening}"
- Progression: "${state.arc_progression}"
- Destination: "${state.arc_destination}"
</phase_focus>`;
      break;

    case 'brief_generation':
      context += `<phase_focus>
Looking for: Confirmation of the brief, or revision requests
Key signals: confirmation_state, hesitation_indicators
</phase_focus>`;
      break;

    default:
      break;
  }

  return context;
}

/**
 * Format conversation history for analysis
 */
function formatConversationHistory(messages: Message[]): string {
  return messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');
}

/**
 * Parse the LLM response into signals
 */
function parseAnalysisResponse(response: string): UnifiedAnalysisResult | null {
  try {
    // Try to extract JSON from the response
    let jsonStr = response.trim();

    // Handle markdown code blocks
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    // Validate required fields exist
    const requiredSignalFields = [
      'idea_state', 'depth_state', 'insight_state',
      'arc_opening', 'arc_progression', 'arc_destination', 'arc_coherence',
      'response_substance', 'engagement', 'confirmation_state',
      'premature_closure_risk', 'circular_exploration',
      'clarity_shift', 'energy_shift', 'user_intent'
    ];

    for (const field of requiredSignalFields) {
      if (!(field in parsed)) {
        console.warn(`Missing field in analysis: ${field}`);
      }
    }

    return {
      signals: {
        idea_state: parsed.idea_state || 'none',
        depth_state: parsed.depth_state || 'surface',
        insight_state: parsed.insight_state || 'none',
        insight_text: parsed.insight_text || null,
        arc_opening: parsed.arc_opening || 'absent',
        arc_progression: parsed.arc_progression || 'absent',
        arc_destination: parsed.arc_destination || 'absent',
        arc_coherence: parsed.arc_coherence || 'untested',
        response_substance: parsed.response_substance || 'adequate',
        engagement: parsed.engagement || 'medium',
        confirmation_state: parsed.confirmation_state || 'none',
        hesitation_indicators: parsed.hesitation_indicators || [],
        premature_closure_risk: parsed.premature_closure_risk || 'low',
        circular_exploration: parsed.circular_exploration || 'none',
        clarity_shift: parsed.clarity_shift || 'none',
        energy_shift: parsed.energy_shift || 'stable',
        user_intent: parsed.user_intent || 'exploring'
      },
      reasoning: parsed.reasoning || '',
      suggested_action: parsed.suggested_action || 'invite_thread'
    };
  } catch (error) {
    console.error('Failed to parse analysis response:', error);
    console.error('Raw response:', response);
    return null;
  }
}

/**
 * Run unified analysis on a user message
 */
export async function runUnifiedAnalysis(
  userMessage: string,
  conversationHistory: Message[],
  state: SignalSessionState
): Promise<UnifiedAnalysisResult> {
  const systemPrompt = buildAnalysisPrompt(state);
  const historyText = formatConversationHistory(conversationHistory);

  const userPrompt = `<conversation_history>
${historyText}
</conversation_history>

<latest_user_message>
${userMessage}
</latest_user_message>

Analyze this message and return the signals as JSON.`;

  try {
    const response = await getAnthropicClient().messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const result = parseAnalysisResponse(content.text);

    if (!result) {
      // Return default signals on parse failure
      console.warn('Using default signals due to parse failure');
      return {
        signals: { ...DEFAULT_SIGNALS } as Signals,
        reasoning: 'Analysis parse failed, using defaults',
        suggested_action: 'invite_thread'
      };
    }

    return result;
  } catch (error) {
    console.error('Unified analysis failed:', error);
    // Return default signals on error
    return {
      signals: { ...DEFAULT_SIGNALS } as Signals,
      reasoning: 'Analysis failed, using defaults',
      suggested_action: 'invite_thread'
    };
  }
}

/**
 * Extract and update accumulated content from analysis
 * This captures confirmed insights and arc elements
 */
export function extractAccumulatedContent(
  analysis: UnifiedAnalysisResult,
  state: SignalSessionState,
  userMessage: string
): Partial<SignalSessionState> {
  const updates: Partial<SignalSessionState> = {};

  // If insight is confirmed and we don't have one yet, capture it
  if (
    analysis.signals.insight_state === 'confirmed' &&
    !state.confirmed_insight &&
    analysis.signals.insight_text
  ) {
    updates.confirmed_insight = analysis.signals.insight_text;
  }

  // For arc elements, we need to be more careful - capture when they become clear
  // This would typically be done with more sophisticated extraction
  // For POC, we'll rely on the decision engine to manage this

  return updates;
}
