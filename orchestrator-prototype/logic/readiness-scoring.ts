// Readiness scoring - continuous 3-axis assessment
// Clarity: Can they articulate the constraint clearly?
// Confidence: Do they own insights or seek validation?
// Capacity: Do they have bandwidth to take action?

import type { ConversationSignals, StateInference, ConversationState, ReadinessLevel } from '../core/types.js'

interface ReadinessScores {
  clarity: ReadinessLevel
  confidence: ReadinessLevel
  capacity: ReadinessLevel
}

/**
 * Compute 3-axis readiness from signals and inference
 * This runs continuously throughout the conversation
 */
export function computeReadiness(
  signals: ConversationSignals,
  inference: StateInference,
  state: ConversationState
): ReadinessScores {

  return {
    clarity: scoreClarity(signals, inference, state),
    confidence: scoreConfidence(signals, inference),
    capacity: scoreCapacity(signals, inference, state)
  }
}

/**
 * CLARITY: Can they articulate the constraint clearly?
 *
 * Indicators:
 * - HIGH: Specific language, no hedging, clear problem statement
 * - MEDIUM: Some clarity but still exploring, occasional hedging
 * - LOW: Vague, "I don't know", lots of hedging
 */
function scoreClarity(
  signals: ConversationSignals,
  inference: StateInference,
  state: ConversationState
): ReadinessLevel {

  // Strong clarity signals (override everything else)
  const hasStrongClarity =
    inference.diagnosis_ready.ready ||
    inference.hypothesis_validated ||
    (inference.constraint_hypothesis.confidence >= 0.8 && state.turns_total >= 5)

  if (hasStrongClarity) {
    return 'high'
  }

  // Start with signal-detected clarity level
  let clarityScore = signals.clarity_level

  // Boost if hypothesis is forming
  if (inference.constraint_hypothesis.confidence > 0.7) {
    clarityScore = clarityScore === 'low' ? 'medium' : 'high'
  }

  // Reduce if contradictions present
  if (signals.contradiction_detected || state.contradiction_count > 0) {
    clarityScore = clarityScore === 'high' ? 'medium' : 'low'
  }

  // Reduce if very early in conversation
  if (state.turns_total < 3) {
    clarityScore = clarityScore === 'high' ? 'medium' : clarityScore
  }

  return clarityScore
}

/**
 * CONFIDENCE: Do they own insights or seek validation?
 *
 * Indicators:
 * - HIGH: "That's exactly it", "I know", ownership language
 * - MEDIUM: Curious but not convinced, neutral exploration
 * - LOW: "Right?", "Does that make sense?", validation-seeking
 */
function scoreConfidence(
  signals: ConversationSignals,
  inference: StateInference
): ReadinessLevel {

  // Start with signal-detected confidence level
  let confidenceScore = signals.confidence_level

  // Boost if hypothesis has been validated
  if (inference.hypothesis_validated) {
    confidenceScore = 'high'
  }

  // Reduce if validation is needed but hasn't happened
  if (inference.validation_needed && !inference.hypothesis_validated) {
    confidenceScore = confidenceScore === 'high' ? 'medium' : 'low'
  }

  return confidenceScore
}

/**
 * CAPACITY: Do they have bandwidth to take action?
 *
 * Indicators:
 * - HIGH: No capacity concerns, ready to act
 * - MEDIUM: Some capacity issues but manageable
 * - LOW: Overwhelmed, burned out, no bandwidth
 */
function scoreCapacity(
  signals: ConversationSignals,
  inference: StateInference,
  state: ConversationState
): ReadinessLevel {

  // ENERGY constraint = low capacity by definition (burned out, depleted)
  if (inference.constraint_hypothesis.category === 'energy' &&
      inference.constraint_hypothesis.confidence > 0.6) {
    return 'low'
  }

  // STRATEGY constraint + overwhelm signals = low capacity
  if (inference.constraint_hypothesis.category === 'strategy' &&
      inference.constraint_hypothesis.confidence > 0.6) {
    // Check for overwhelm indicators
    if (signals.overwhelm_detected || state.overwhelm_detected ||
        signals.capacity_signals.length >= 2 || state.emotional_charge === 'high') {
      return 'low'
    }
    // Some stress but manageable
    if (signals.capacity_signals.length === 1 || state.emotional_charge === 'moderate') {
      return 'medium'
    }
    return 'high'
  }

  // EXECUTION constraint - fear/avoidance doesn't necessarily mean low capacity
  if (inference.constraint_hypothesis.category === 'execution' &&
      inference.constraint_hypothesis.confidence > 0.6) {
    // Only mark low if truly overwhelmed
    if (signals.overwhelm_detected && signals.capacity_signals.length >= 2) {
      return 'low'
    }
    // Default to medium for execution - they have capability but emotional blocks
    return 'medium'
  }

  // Fallback to signal-based scoring if no clear hypothesis
  if (signals.overwhelm_detected || state.overwhelm_detected) {
    return 'low'
  }

  if (signals.capacity_signals.length >= 2 || state.emotional_charge === 'high') {
    return 'low'
  }

  if (signals.capacity_signals.length === 1 || state.emotional_charge === 'moderate') {
    return 'medium'
  }

  return 'high'
}

/**
 * Determine recommended endpoint based on readiness profile
 *
 * EC (Expert Call) → High clarity + High confidence
 * MIST (Done-for-you) → High clarity + Low capacity
 * NURTURE (Self-guided) → Medium clarity OR Low confidence
 */
export function recommendEndpoint(readiness: ReadinessScores): 'EC' | 'MIST' | 'NURTURE' {

  const { clarity, confidence, capacity } = readiness

  // EC: Ready to strategize and implement themselves
  if (clarity === 'high' && confidence === 'high' && capacity !== 'low') {
    return 'EC'
  }

  // MIST: Clear on problem but need help executing
  if (clarity === 'high' && capacity === 'low') {
    return 'MIST'
  }

  // NURTURE: Still need more clarity or confidence
  if (clarity !== 'high' || confidence === 'low') {
    return 'NURTURE'
  }

  // Default to EC (primary path)
  return 'EC'
}

/**
 * Check if readiness has evolved (for logging/observability)
 */
export function hasReadinessChanged(
  current: ReadinessScores,
  previous: ReadinessScores
): boolean {
  return (
    current.clarity !== previous.clarity ||
    current.confidence !== previous.confidence ||
    current.capacity !== previous.capacity
  )
}
