// Diagnosis readiness detection - when to auto-transition to diagnosis

import type { StateInference, ConversationSignals, ConversationState, DiagnosisDecision, ConstraintCategory } from './types.js'

/**
 * Detect if diagnosis criteria are met
 * This replaces the LLM's identify_constraint tool call
 */
export function detectDiagnosisReadiness(
  inference: StateInference,
  signals: ConversationSignals,
  state: ConversationState
): DiagnosisDecision {

  // Check all readiness criteria
  const criteria = {
    has_hypothesis: inference.constraint_hypothesis.category !== null,
    high_confidence: inference.constraint_hypothesis.confidence > 0.75,
    hypothesis_validated: inference.hypothesis_validated,
    clarity_high: signals.clarity_level === 'high',
    no_contradictions: !signals.contradiction_detected,
    sufficient_depth: state.turns_in_phase >= 5,
    no_overwhelm: !signals.overwhelm_detected
  }

  // Count how many criteria are met
  const metCriteria = Object.values(criteria).filter(Boolean).length
  const totalCriteria = Object.keys(criteria).length

  // Calculate confidence (percentage of criteria met)
  const confidence = metCriteria / totalCriteria

  // Determine if ready (need at least 5/7 criteria)
  const ready = metCriteria >= 5 && criteria.has_hypothesis && criteria.hypothesis_validated

  // Determine action
  let action: 'transition_to_diagnosis' | 'request_validation' | 'continue_exploration'

  if (ready) {
    action = 'transition_to_diagnosis'
  } else if (criteria.has_hypothesis && !criteria.hypothesis_validated) {
    action = 'request_validation'
  } else {
    action = 'continue_exploration'
  }

  // Extract constraint and summary
  const constraint = inference.constraint_hypothesis.category
  const summary = state.constraint_summary || generateDefaultSummary(constraint, inference)

  return {
    ready,
    confidence,
    constraint,
    summary,
    action
  }
}

/**
 * Generate a default constraint summary from inference evidence
 */
function generateDefaultSummary(
  category: ConstraintCategory | null,
  inference: StateInference
): string | null {
  if (!category) return null

  const evidence = inference.constraint_hypothesis.evidence.join('; ')

  switch (category) {
    case 'strategy':
      return `Unclear positioning and messaging - ${evidence}`
    case 'execution':
      return `Systems and capacity bottleneck - ${evidence}`
    case 'energy':
      return `Burnout and disconnection - ${evidence}`
    default:
      return null
  }
}

/**
 * Check if validation is needed
 * Returns true if hypothesis exists but hasn't been validated
 */
export function needsValidation(
  inference: StateInference,
  state: ConversationState
): boolean {
  return (
    inference.validation_needed &&
    !inference.hypothesis_validated &&
    inference.constraint_hypothesis.category !== null
  )
}

/**
 * Determine if we should wait longer before diagnosing
 * Even if criteria met, sometimes depth is missing
 */
export function shouldDeepen(
  state: ConversationState,
  signals: ConversationSignals
): boolean {
  // If user is being very brief (< 20 words), ask for more depth
  if (signals.response_length < 20 && state.turns_in_phase < 8) {
    return true
  }

  // If contradiction detected, need to resolve it first
  if (signals.contradiction_detected) {
    return true
  }

  // If complexity is high but we don't have enough turns, deepen
  if (state.complexity_level === 'complex' && state.turns_in_phase < 7) {
    return true
  }

  return false
}
