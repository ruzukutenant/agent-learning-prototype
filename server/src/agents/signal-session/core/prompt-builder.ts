/**
 * Signal Session Agent - Prompt Builder
 *
 * Composes the final system prompt from:
 * - Base identity
 * - Phase overlay
 * - Action overlay
 * - Accumulated context (insight, arc elements)
 * - Variety guidance
 * - Turn context
 */

import type { SignalSessionState, Action, Phase } from './types.js';
import { buildBaseIdentity } from '../prompts/base-identity.js';
import {
  getPhaseOverlay,
  getActionOverlay,
  buildAccumulatedContext,
  buildArcElementTracking,
  buildArcForValidation,
  buildVarietyGuidance,
  buildTurnContext
} from '../prompts/overlays.js';

/**
 * Build the complete system prompt for response generation
 */
export function buildSystemPrompt(
  state: SignalSessionState,
  action: Action
): string {
  const parts: string[] = [];

  // 1. Base identity (always included)
  parts.push(buildBaseIdentity(state.user_context));

  // 2. Phase overlay
  parts.push(getPhaseOverlay(state.phase));

  // 3. Action overlay
  parts.push(getActionOverlay(action));

  // 4. Accumulated context (insight, arc elements if we have them)
  const accumulated = buildAccumulatedContext(state);
  if (accumulated) {
    parts.push(accumulated);
  }

  // 5. Arc element tracking (for arc_building phase)
  const arcTracking = buildArcElementTracking(state);
  if (arcTracking) {
    parts.push(arcTracking);
  }

  // 6. Arc for validation (for arc_validation and brief_generation phases)
  const arcForValidation = buildArcForValidation(state);
  if (arcForValidation) {
    parts.push(arcForValidation);
  }

  // 7. Variety guidance
  const variety = buildVarietyGuidance(state);
  if (variety) {
    parts.push(variety);
  }

  // 8. Turn context
  parts.push(buildTurnContext(state));

  return parts.join('\n\n');
}

/**
 * Build a correction prompt for response regeneration
 * Used when the initial response fails validation
 */
export function buildCorrectionPrompt(
  originalPrompt: string,
  validationFailure: string,
  action: Action
): string {
  return `${originalPrompt}

<correction_required>
Your previous response failed validation: ${validationFailure}

You MUST fix this in your next response. The action is: ${action}

ABSOLUTE REQUIREMENTS:
- Ask only ONE question
- Do not bundle multiple questions
- Do not offer praise or motivational language
- Do not jump ahead in the process
- Follow the action overlay exactly
</correction_required>
`;
}

/**
 * Validate that a response matches the expected action intent
 * Returns null if valid, or a failure reason if not
 */
export function validateResponse(
  response: string,
  action: Action,
  state: SignalSessionState
): string | null {
  // Check for multiple questions (except in certain actions)
  const questionCount = (response.match(/\?/g) || []).length;
  const allowMultipleQuestions = [
    'generate_brief',
    'revise_brief',
    'complete_session',
    'acknowledge_arc_ready'
  ];

  if (questionCount > 1 && !allowMultipleQuestions.includes(action)) {
    return `Multiple questions detected (${questionCount}). Ask only ONE question at a time.`;
  }

  // Check for prohibited praise language
  const praisePatterns = [
    /great insight/i,
    /that's powerful/i,
    /i love that/i,
    /that's really insightful/i,
    /you're onto something/i,
    /brilliant/i,
    /excellent point/i
  ];

  for (const pattern of praisePatterns) {
    if (pattern.test(response)) {
      return `Prohibited praise language detected: "${response.match(pattern)?.[0]}"`;
    }
  }

  // Check for premature CTA language (unless in brief_generation or complete)
  if (
    state.phase !== 'brief_generation' &&
    state.phase !== 'complete'
  ) {
    const ctaPatterns = [
      /click below/i,
      /here's your brief/i,
      /ready to write/i,
      /let me generate/i
    ];

    for (const pattern of ctaPatterns) {
      if (pattern.test(response)) {
        return `Premature CTA language detected: "${response.match(pattern)?.[0]}"`;
      }
    }
  }

  // Check that non-opening actions don't start from scratch
  if (
    state.turns_total > 0 &&
    action === 'invite_thread' &&
    state.phase !== 'thread_opening'
  ) {
    return 'invite_thread should only be used in thread_opening phase';
  }

  // Response length check (2-4 sentences for most actions)
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const longResponseActions = [
    'generate_brief',
    'revise_brief',
    'stress_test_arc',
    'summarize_arc'
  ];

  if (sentences.length > 6 && !longResponseActions.includes(action)) {
    return `Response too long (${sentences.length} sentences). Keep to 2-4 sentences.`;
  }

  return null;
}

/**
 * Extract phrases for variety tracking
 * Call this after generating a response to track what was used
 */
export function extractPhrasesForVariety(response: string): {
  openers: string[];
  reflections: string[];
  probes: string[];
} {
  const openers: string[] = [];
  const reflections: string[] = [];
  const probes: string[] = [];

  // Common opener patterns
  const openerPatterns = [
    /^(So|Okay|Alright|Right|I see|I notice|Interesting)/i,
    /^(Let me|Let's|Before we)/i,
    /^(That|This|What you're)/i
  ];

  const firstSentence = response.split(/[.!?]/)[0] || '';
  for (const pattern of openerPatterns) {
    const match = firstSentence.match(pattern);
    if (match) {
      openers.push(match[0].toLowerCase());
    }
  }

  // Reflection patterns
  const reflectionPatterns = [
    /what I'm hearing is/i,
    /if I'm tracking/i,
    /so the core of this is/i,
    /it sounds like/i,
    /what you're saying is/i
  ];

  for (const pattern of reflectionPatterns) {
    if (pattern.test(response)) {
      const match = response.match(pattern);
      if (match) {
        reflections.push(match[0].toLowerCase());
      }
    }
  }

  // Probe patterns (questions)
  const probePatterns = [
    /what's the part/i,
    /what would be risky/i,
    /what do people usually/i,
    /is there something/i,
    /can you say more/i
  ];

  for (const pattern of probePatterns) {
    if (pattern.test(response)) {
      const match = response.match(pattern);
      if (match) {
        probes.push(match[0].toLowerCase());
      }
    }
  }

  return { openers, reflections, probes };
}

/**
 * Update variety tracker after generating a response
 */
export function updateVarietyTracker(
  state: SignalSessionState,
  response: string,
  action: Action
): SignalSessionState {
  const newState = { ...state };
  const extracted = extractPhrasesForVariety(response);

  // Add new phrases to tracker (keep last 10 of each type)
  newState.variety_tracker = {
    ...state.variety_tracker,
    used_openers: [...state.variety_tracker.used_openers, ...extracted.openers].slice(-10),
    used_reflections: [...state.variety_tracker.used_reflections, ...extracted.reflections].slice(-10),
    used_probes: [...state.variety_tracker.used_probes, ...extracted.probes].slice(-10)
  };

  // Track reflection moments
  const reflectionActions: Action[] = [
    'reflect_and_open',
    'reflect_insight_seek_confirmation',
    'stress_test_arc',
    'summarize_arc'
  ];

  if (reflectionActions.includes(action)) {
    newState.variety_tracker.reflection_count = state.variety_tracker.reflection_count + 1;
    newState.variety_tracker.last_reflection_turn = state.turns_total;
  }

  return newState;
}
