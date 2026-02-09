// Decision engine - determine next action based on state

import type {
  ConversationState,
  ConversationSignals,
  StateInference,
  OrchestratorDecision,
  ConstraintCategory
} from './types.js'

import { detectDiagnosisReadiness, needsValidation, shouldDeepen } from './diagnosis-detector.js'
import { detectUpstreamConstraint, shouldAttemptCrossMapping } from '../logic/cross-mapping.js'
import { needsContainment } from '../logic/containment.js'

/**
 * Core decision engine
 * Determines what the orchestrator should do next
 *
 * Decision priority:
 * 1. Containment (if overwhelm detected)
 * 2. Diagnosis (if all criteria met)
 * 3. Validation (if hypothesis needs confirming)
 * 4. Cross-mapping (if upstream constraint suspected)
 * 5. Deepen (if need more information)
 * 6. Explore (default - continue gathering context)
 */
export function makeDecision(
  state: ConversationState,
  signals: ConversationSignals,
  inference: StateInference
): OrchestratorDecision {

  // Priority 1: Containment (if overwhelm detected)
  if (needsContainment(signals, state)) {
    return {
      action: 'contain',
      reasoning: 'Emotional overwhelm detected - pause exploration and validate feelings',
      prompt_overlays: ['containment'],
      available_tools: [], // No tools in this architecture
      confidence: 0.9
    }
  }

  // Priority 2: Diagnosis ready (all criteria met)
  const diagnosisDecision = detectDiagnosisReadiness(inference, signals, state)

  if (diagnosisDecision.ready && diagnosisDecision.action === 'transition_to_diagnosis') {
    return {
      action: 'diagnose',
      reasoning: `Diagnosis criteria met (${diagnosisDecision.confidence.toFixed(2)} confidence) - ready to identify constraint: ${diagnosisDecision.constraint}`,
      prompt_overlays: [],
      available_tools: [],
      confidence: diagnosisDecision.confidence
    }
  }

  // Priority 3: Validation needed (hypothesis exists but not confirmed)
  if (needsValidation(inference, state)) {
    return {
      action: 'validate',
      reasoning: `Hypothesis formed (${inference.constraint_hypothesis.category}) but needs user validation`,
      prompt_overlays: ['validation'],
      available_tools: [],
      confidence: 0.8,
      hypothesis_to_validate: inference.constraint_hypothesis.category || undefined
    }
  }

  // Priority 4: Cross-mapping (check for upstream constraints)
  if (
    shouldAttemptCrossMapping(state.turns_in_phase, state.cross_map_applied) &&
    inference.constraint_hypothesis.category
  ) {
    const crossMapResult = detectUpstreamConstraint(
      inference.constraint_hypothesis.category,
      inference,
      signals
    )

    if (crossMapResult.should_redirect) {
      return {
        action: 'cross_map',
        reasoning: crossMapResult.reasoning,
        prompt_overlays: ['cross_map'],
        available_tools: [],
        confidence: crossMapResult.confidence,
        redirect_to: crossMapResult.upstream_category || undefined,
        focus_area: crossMapResult.upstream_category
      }
    }
  }

  // Priority 5: Deepen (need more information despite hypothesis)
  if (shouldDeepen(state, signals)) {
    return {
      action: 'deepen',
      reasoning: 'Hypothesis exists but need more depth before diagnosis',
      prompt_overlays: ['depth_inquiry'],
      available_tools: [],
      confidence: 0.7,
      focus_area: inference.sub_dimension.dimension
    }
  }

  // Priority 6: Explore (default - continue gathering context)
  return {
    action: 'explore',
    reasoning: 'Continue exploration - gathering context and forming hypothesis',
    prompt_overlays: getExplorationOverlays(state, inference),
    available_tools: [],
    confidence: 0.6,
    focus_area: inference.sub_dimension.dimension
  }
}

/**
 * Determine which exploration overlays to use
 * Based on conversation state and emerging patterns
 */
function getExplorationOverlays(
  state: ConversationState,
  inference: StateInference
): string[] {

  const overlays: string[] = ['exploration']

  // Add complexity overlay if case is complex
  if (state.complexity_level === 'complex') {
    overlays.push('depth_inquiry')
  }

  // Add hypothesis guidance if forming
  if (inference.constraint_hypothesis.category && inference.constraint_hypothesis.confidence > 0.5) {
    overlays.push('hypothesis_forming')
  }

  return overlays
}

/**
 * Determine if phase should transition
 * This is for explicit phase changes (context → exploration → diagnosis)
 */
export function shouldTransitionPhase(
  currentPhase: string,
  state: ConversationState,
  decision: OrchestratorDecision
): boolean {

  switch (currentPhase) {
    case 'context':
      // Transition to exploration after ~3 turns
      return state.turns_in_phase >= 3

    case 'exploration':
      // Transition to diagnosis when ready
      return decision.action === 'diagnose'

    case 'diagnosis':
      // Transition to complete when diagnosis confirmed
      return state.hypothesis_validated && state.constraint_summary !== null

    default:
      return false
  }
}

/**
 * Get next phase
 */
export function getNextPhase(currentPhase: string): string {
  switch (currentPhase) {
    case 'context':
      return 'exploration'
    case 'exploration':
      return 'diagnosis'
    case 'diagnosis':
      return 'complete'
    default:
      return currentPhase
  }
}
