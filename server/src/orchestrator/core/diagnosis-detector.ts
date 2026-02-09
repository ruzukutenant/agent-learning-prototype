// Diagnosis readiness detection - when to auto-transition to diagnosis

import type { StateInference, ConversationSignals, ConversationState, DiagnosisDecision, ConstraintCategory } from './types.js'
import { shouldAccelerate } from './acceleration-detector.js'

/**
 * Detect if diagnosis criteria are met
 * This replaces the LLM's identify_constraint tool call
 */
export function detectDiagnosisReadiness(
  inference: StateInference,
  signals: ConversationSignals,
  state: ConversationState
): DiagnosisDecision {

  // FAST PATH: Check for acceleration triggers
  // If conversation quality signals indicate we're ready, skip strict criteria
  const accelerationResult = shouldAccelerate(state, signals, inference)

  if (accelerationResult.accelerate && inference.constraint_hypothesis.category) {
    console.log('[DiagnosisDetector] ACCELERATION FAST PATH:', accelerationResult.reason)

    return {
      ready: true,
      confidence: Math.max(0.75, inference.constraint_hypothesis.confidence),
      constraint: inference.constraint_hypothesis.category,
      summary: state.constraint_summary || generateDefaultSummary(
        inference.constraint_hypothesis.category,
        inference
      ),
      action: 'transition_to_diagnosis'
    }
  }

  // STANDARD PATH: Check readiness criteria
  // CRITICAL: Once validated, move to diagnosis quickly (within 1-2 turns)
  const criteria = {
    // BLOCKING - must have these
    has_hypothesis: inference.constraint_hypothesis.category !== null,
    hypothesis_validated: inference.hypothesis_validated,
    sufficient_total_turns: state.turns_total >= 8, // Minimum depth
    validation_has_settled: state.turns_since_validation >= 1, // At least 1 turn after validation

    // NON-BLOCKING - nice to have but don't wait for perfect
    high_confidence: inference.constraint_hypothesis.confidence > 0.7, // Lowered from 0.75
    clarity_high: signals.clarity_level === 'high',
    no_contradictions: !signals.contradiction_detected,
    reasonable_depth: state.turns_in_phase >= 6, // Some exploration depth
    not_overwhelmed: !signals.overwhelm_detected
  }

  // Separate critical vs. supportive criteria
  const criticalCriteria = {
    has_hypothesis: criteria.has_hypothesis,
    hypothesis_validated: criteria.hypothesis_validated,
    sufficient_total_turns: criteria.sufficient_total_turns,
    validation_has_settled: criteria.validation_has_settled
  }

  const supportiveCriteria = {
    high_confidence: criteria.high_confidence,
    clarity_high: criteria.clarity_high,
    no_contradictions: criteria.no_contradictions,
    reasonable_depth: criteria.reasonable_depth,
    not_overwhelmed: criteria.not_overwhelmed
  }

  const criticalMet = Object.values(criticalCriteria).filter(Boolean).length
  const supportiveMet = Object.values(supportiveCriteria).filter(Boolean).length

  // Calculate confidence
  const confidence = (criticalMet / 4) * 0.7 + (supportiveMet / 5) * 0.3

  // Ready if: ALL critical criteria + at least 2 supportive criteria
  // This ensures validation leads to diagnosis within 1-2 turns
  const ready = criticalMet === 4 && supportiveMet >= 2

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
    case 'psychology':
      return `Internal blocks (fear, self-doubt, burnout) - ${evidence}`
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
