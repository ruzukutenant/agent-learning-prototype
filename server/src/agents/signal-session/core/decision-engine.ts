/**
 * Signal Session Agent - Decision Engine
 *
 * Selects the next action based on current state and signals.
 * Manages phase transitions with hard gates where required.
 */

import type {
  SignalSessionState,
  Signals,
  Phase,
  Action,
  Decision
} from './types.js';

// =============================================================================
// PHASE TRANSITION LOGIC
// =============================================================================

/**
 * Determine if we should transition to a new phase
 */
export function evaluatePhaseTransition(
  state: SignalSessionState,
  signals: Signals
): Phase | null {
  const { phase, turns_in_phase } = state;

  switch (phase) {
    case 'thread_opening':
      // Transition when idea is at least vague and response has substance
      if (
        (signals.idea_state === 'vague' ||
          signals.idea_state === 'emerging' ||
          signals.idea_state === 'clear') &&
        (signals.response_substance === 'adequate' ||
          signals.response_substance === 'rich')
      ) {
        return 'deepening';
      }
      break;

    case 'deepening':
      // Transition when depth is reached, or approaching depth after 3+ turns
      if (signals.depth_state === 'deep') {
        return 'insight_crystallization';
      }
      if (signals.depth_state === 'approaching' && turns_in_phase >= 3) {
        return 'insight_crystallization';
      }
      break;

    case 'insight_crystallization':
      // HARD GATE: requires explicit confirmation AND specific insight
      if (
        signals.insight_state === 'confirmed' &&
        signals.confirmation_state === 'confirmed'
      ) {
        return 'arc_building';
      }
      break;

    case 'arc_building':
      // Transition when all three arc elements are clear
      if (
        signals.arc_opening === 'clear' &&
        signals.arc_progression === 'clear' &&
        signals.arc_destination === 'clear'
      ) {
        return 'arc_validation';
      }
      break;

    case 'arc_validation':
      // HARD GATE: requires explicit confirmation AND strong coherence
      if (
        signals.arc_coherence === 'strong' &&
        signals.confirmation_state === 'confirmed'
      ) {
        return 'brief_generation';
      }
      break;

    case 'brief_generation':
      // Transition when brief is confirmed
      if (
        state.generated_brief !== null &&
        signals.confirmation_state === 'confirmed'
      ) {
        return 'complete';
      }
      break;

    default:
      break;
  }

  return null;
}

// =============================================================================
// ACTION SELECTION LOGIC
// =============================================================================

/**
 * Select the appropriate action based on phase and signals
 */
export function selectAction(
  state: SignalSessionState,
  signals: Signals
): Action {
  const { phase } = state;

  // ===================
  // GLOBAL GUARDRAILS (check first, any phase)
  // ===================

  // High premature closure risk - slow down
  if (signals.premature_closure_risk === 'high') {
    return 'slow_down_guardrail';
  }

  // Stuck in circular exploration - redirect
  if (signals.circular_exploration === 'stuck') {
    return 'redirect_forward';
  }

  // ===================
  // PHASE-SPECIFIC ACTIONS
  // ===================

  switch (phase) {
    case 'thread_opening':
      return selectThreadOpeningAction(state, signals);

    case 'deepening':
      return selectDeepeningAction(state, signals);

    case 'insight_crystallization':
      return selectInsightCrystallizationAction(state, signals);

    case 'arc_building':
      return selectArcBuildingAction(state, signals);

    case 'arc_validation':
      return selectArcValidationAction(state, signals);

    case 'brief_generation':
      return selectBriefGenerationAction(state, signals);

    case 'complete':
      return 'complete_session';

    default:
      return 'invite_thread';
  }
}

/**
 * Thread Opening phase actions
 */
function selectThreadOpeningAction(
  state: SignalSessionState,
  signals: Signals
): Action {
  // First turn - invite the thread
  if (state.turns_total === 0) {
    return 'invite_thread';
  }

  // No idea yet
  if (signals.idea_state === 'none') {
    return 'invite_thread';
  }

  // Thin response - probe gently
  if (signals.response_substance === 'thin') {
    return 'gentle_probe';
  }

  // Have something - reflect and open
  return 'reflect_and_open';
}

/**
 * Deepening phase actions
 */
function selectDeepeningAction(
  state: SignalSessionState,
  signals: Signals
): Action {
  // Thin response - probe gently
  if (signals.response_substance === 'thin') {
    return 'probe_gently';
  }

  // Still at surface - push deeper
  if (signals.depth_state === 'surface') {
    return 'push_deeper';
  }

  // Approaching depth - keep going
  if (signals.depth_state === 'approaching') {
    return 'deepen_further';
  }

  // Reached depth - acknowledge
  if (signals.depth_state === 'deep') {
    return 'acknowledge_depth';
  }

  return 'push_deeper';
}

/**
 * Insight Crystallization phase actions
 */
function selectInsightCrystallizationAction(
  state: SignalSessionState,
  signals: Signals
): Action {
  // No insight yet - seek it
  if (signals.insight_state === 'none') {
    return 'seek_insight';
  }

  // Generic insight - push for specificity
  if (signals.insight_state === 'generic') {
    return 'push_for_specificity';
  }

  // Specific insight but not confirmed - seek confirmation
  if (
    signals.insight_state === 'specific' &&
    signals.confirmation_state !== 'confirmed'
  ) {
    return 'reflect_insight_seek_confirmation';
  }

  // User is hesitant - explore the hesitation
  if (signals.confirmation_state === 'hesitant') {
    return 'explore_hesitation';
  }

  // Waiting for confirmation
  return 'hold_for_confirmation';
}

/**
 * Arc Building phase actions - work through elements sequentially
 */
function selectArcBuildingAction(
  state: SignalSessionState,
  signals: Signals
): Action {
  // OPENING TENSION
  if (signals.arc_opening === 'absent') {
    return 'ask_opening_tension';
  }
  if (signals.arc_opening === 'partial') {
    return 'clarify_opening';
  }

  // PROGRESSION (only after opening is clear)
  if (signals.arc_progression === 'absent') {
    return 'ask_progression';
  }
  if (signals.arc_progression === 'partial') {
    return 'clarify_progression';
  }

  // DESTINATION (only after progression is clear)
  if (signals.arc_destination === 'absent') {
    return 'ask_destination';
  }
  if (signals.arc_destination === 'partial') {
    return 'clarify_destination';
  }

  // All elements clear - summarize before validation
  return 'summarize_arc';
}

/**
 * Arc Validation phase actions
 */
function selectArcValidationAction(
  state: SignalSessionState,
  signals: Signals
): Action {
  // Haven't stress-tested yet
  if (signals.arc_coherence === 'untested') {
    return 'stress_test_arc';
  }

  // Arc is weak - explore the weakness
  if (signals.arc_coherence === 'weak') {
    return 'explore_arc_weakness';
  }

  // Arc is strong but not confirmed
  if (
    signals.arc_coherence === 'strong' &&
    signals.confirmation_state !== 'confirmed'
  ) {
    return 'seek_arc_confirmation';
  }

  // Ready to proceed
  return 'acknowledge_arc_ready';
}

/**
 * Brief Generation phase actions
 */
function selectBriefGenerationAction(
  state: SignalSessionState,
  signals: Signals
): Action {
  // Haven't generated brief yet
  if (state.generated_brief === null) {
    return 'generate_brief';
  }

  // User is hesitant about the brief
  if (signals.confirmation_state === 'hesitant') {
    return 'revise_brief';
  }

  // Brief is confirmed
  if (signals.confirmation_state === 'confirmed') {
    return 'complete_session';
  }

  // Waiting for response
  return 'generate_brief';
}

// =============================================================================
// MAIN DECISION FUNCTION
// =============================================================================

/**
 * Make a decision: select action and determine phase transition
 */
export function makeDecision(
  state: SignalSessionState,
  signals: Signals
): Decision {
  // Check for phase transition first
  const newPhase = evaluatePhaseTransition(state, signals);

  // Select action based on current (or new) phase
  const effectiveState = newPhase
    ? { ...state, phase: newPhase, turns_in_phase: 0 }
    : state;

  const action = selectAction(effectiveState, signals);

  // Build reasoning
  let reasoning = `Phase: ${state.phase}`;
  if (newPhase) {
    reasoning += ` → transitioning to ${newPhase}`;
  }
  reasoning += `. Selected action: ${action}`;
  reasoning += `. Key signals: idea_state=${signals.idea_state}, depth_state=${signals.depth_state}, insight_state=${signals.insight_state}`;

  return {
    action,
    reasoning,
    phase_transition: newPhase || undefined
  };
}

// =============================================================================
// STATE UPDATE HELPERS
// =============================================================================

/**
 * Update state after a decision is made
 */
export function applyDecisionToState(
  state: SignalSessionState,
  decision: Decision,
  signals: Signals
): SignalSessionState {
  const newState = { ...state };

  // Apply phase transition if any
  if (decision.phase_transition) {
    newState.phase = decision.phase_transition;
    newState.turns_in_phase = 0;

    // Set current arc element when entering arc_building
    if (decision.phase_transition === 'arc_building') {
      newState.current_arc_element = 'opening';
    }
  } else {
    newState.turns_in_phase = state.turns_in_phase + 1;
  }

  // Always increment total turns
  newState.turns_total = state.turns_total + 1;

  // Update current signals
  newState.current_signals = signals;

  // Capture confirmed insight
  if (
    signals.insight_state === 'confirmed' &&
    signals.insight_text &&
    !state.confirmed_insight
  ) {
    newState.confirmed_insight = signals.insight_text;
  }

  // Update current arc element based on progress
  if (newState.phase === 'arc_building') {
    if (signals.arc_opening === 'clear' && signals.arc_progression !== 'clear') {
      newState.current_arc_element = 'progression';
    } else if (
      signals.arc_opening === 'clear' &&
      signals.arc_progression === 'clear' &&
      signals.arc_destination !== 'clear'
    ) {
      newState.current_arc_element = 'destination';
    }
  }

  // Update timestamp
  newState.updated_at = new Date();

  return newState;
}

/**
 * Update state with extracted arc content
 * This is called separately when we need to capture arc element text
 */
export function captureArcContent(
  state: SignalSessionState,
  element: 'opening' | 'progression' | 'destination',
  content: string
): SignalSessionState {
  const newState = { ...state };

  switch (element) {
    case 'opening':
      newState.arc_opening = content;
      break;
    case 'progression':
      newState.arc_progression = content;
      break;
    case 'destination':
      newState.arc_destination = content;
      break;
  }

  newState.updated_at = new Date();
  return newState;
}
