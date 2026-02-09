// Acceleration detector - determines when to exit exploration phase early
// Based on conversation quality signals, not just turn counts

import type {
  ConversationState,
  ConversationSignals,
  StateInference,
  ClarityTrend
} from './types.js'
import { detectClarityTrend } from './conversation-memory.js'

/**
 * Acceleration criteria - any 2 of these = accelerate
 */
export interface AccelerationCriteria {
  userArticulatedConstraint: boolean    // User named the constraint themselves
  clarityTrendIncreasing: boolean       // Clarity improving for 3+ turns
  groundCoveredHigh: boolean            // Ground covered score > 0.7
  repetitionDetected: boolean           // Same topic explored 3+ times
  highConfidenceWithOwnership: boolean  // Confidence > 0.65 + ownership language
}

/**
 * Result of acceleration check
 */
export interface AccelerationResult {
  accelerate: boolean
  reason: string
  criteriaCount: number
  criteria: AccelerationCriteria
}

/**
 * Minimum turns before acceleration can trigger
 * (Don't accelerate too early)
 */
const MIN_TURNS_FOR_ACCELERATION = 6

/**
 * Threshold for "high" ground covered score
 */
const HIGH_GROUND_COVERED_THRESHOLD = 0.7

/**
 * Threshold for "high" confidence
 */
const HIGH_CONFIDENCE_THRESHOLD = 0.65

/**
 * Number of criteria required to accelerate
 */
const CRITERIA_THRESHOLD = 2

/**
 * Check if conversation should accelerate out of exploration
 */
export function shouldAccelerate(
  state: ConversationState,
  signals: ConversationSignals,
  inference: StateInference
): AccelerationResult {
  // Don't accelerate too early
  if (state.turns_total < MIN_TURNS_FOR_ACCELERATION) {
    return {
      accelerate: false,
      reason: `Too early (turn ${state.turns_total}, need ${MIN_TURNS_FOR_ACCELERATION})`,
      criteriaCount: 0,
      criteria: emptyAcceleration()
    }
  }

  // Don't accelerate if already past exploration
  if (state.phase !== 'exploration') {
    return {
      accelerate: false,
      reason: `Not in exploration phase (currently ${state.phase})`,
      criteriaCount: 0,
      criteria: emptyAcceleration()
    }
  }

  // Don't accelerate during containment
  if (signals.overwhelm_detected || state.emotional_charge === 'high') {
    return {
      accelerate: false,
      reason: 'User in overwhelm - not appropriate to accelerate',
      criteriaCount: 0,
      criteria: emptyAcceleration()
    }
  }

  // Evaluate acceleration criteria
  const criteria = evaluateCriteria(state, signals, inference)

  // Count met criteria
  const criteriaCount = Object.values(criteria).filter(Boolean).length
  const metCriteria = getMetCriteriaDescriptions(criteria)

  const shouldAccelerate = criteriaCount >= CRITERIA_THRESHOLD

  return {
    accelerate: shouldAccelerate,
    reason: shouldAccelerate
      ? `Acceleration triggered: ${metCriteria.join(' + ')}`
      : `Not enough criteria (${criteriaCount}/${CRITERIA_THRESHOLD})`,
    criteriaCount,
    criteria
  }
}

/**
 * Evaluate each acceleration criterion
 */
function evaluateCriteria(
  state: ConversationState,
  signals: ConversationSignals,
  inference: StateInference
): AccelerationCriteria {
  // 1. User articulated the constraint themselves
  const userArticulatedConstraint = checkUserArticulatedConstraint(state, signals, inference)

  // 2. Clarity trend is increasing
  const clarityTrend = detectClarityTrend(state.conversation_memory)
  const clarityTrendIncreasing = clarityTrend === 'increasing'

  // 3. Ground covered is high
  const groundCoveredHigh = state.conversation_memory.ground_covered_score > HIGH_GROUND_COVERED_THRESHOLD

  // 4. Repetition detected (same topic 3+ times)
  const repetitionDetected = checkRepetitionDetected(state)

  // 5. High confidence + ownership language
  const highConfidenceWithOwnership =
    inference.constraint_hypothesis.confidence > HIGH_CONFIDENCE_THRESHOLD &&
    signals.ownership_language

  return {
    userArticulatedConstraint,
    clarityTrendIncreasing,
    groundCoveredHigh,
    repetitionDetected,
    highConfidenceWithOwnership
  }
}

/**
 * Check if user has articulated the constraint themselves
 */
function checkUserArticulatedConstraint(
  state: ConversationState,
  signals: ConversationSignals,
  inference: StateInference
): boolean {
  // User has co-created hypothesis
  if (state.learner_state.hypothesis_co_created) {
    return true
  }

  // User shows ownership language + we have hypothesis + high clarity
  if (
    signals.ownership_language &&
    inference.constraint_hypothesis.category &&
    signals.clarity_level === 'high'
  ) {
    return true
  }

  // User has articulated 2+ quality insights
  if (state.learner_state.insights_articulated.length >= 2) {
    return true
  }

  return false
}

/**
 * Check if same topics are being explored repeatedly
 */
function checkRepetitionDetected(state: ConversationState): boolean {
  const topics = state.conversation_memory.topics_explored

  if (topics.length < 3) return false

  // Count topic frequencies
  const topicCounts = new Map<string, number>()

  for (const topic of topics) {
    const normalized = topic.toLowerCase()
    // Group similar topics
    let matched = false
    for (const [key, count] of topicCounts) {
      if (topicsSimilar(key, normalized)) {
        topicCounts.set(key, count + 1)
        matched = true
        break
      }
    }
    if (!matched) {
      topicCounts.set(normalized, 1)
    }
  }

  // Check if any topic appears 3+ times
  for (const count of topicCounts.values()) {
    if (count >= 3) return true
  }

  return false
}

/**
 * Check if two topics are similar
 */
function topicsSimilar(topic1: string, topic2: string): boolean {
  // Simple word overlap check
  const words1 = new Set(topic1.split(/\s+/).filter(w => w.length > 3))
  const words2 = new Set(topic2.split(/\s+/).filter(w => w.length > 3))

  if (words1.size === 0 || words2.size === 0) return false

  const intersection = [...words1].filter(w => words2.has(w)).length
  return intersection >= 1 // At least one significant word in common
}

/**
 * Get human-readable descriptions of met criteria
 */
function getMetCriteriaDescriptions(criteria: AccelerationCriteria): string[] {
  const descriptions: string[] = []

  if (criteria.userArticulatedConstraint) {
    descriptions.push('user articulated constraint')
  }
  if (criteria.clarityTrendIncreasing) {
    descriptions.push('clarity increasing')
  }
  if (criteria.groundCoveredHigh) {
    descriptions.push('high ground covered')
  }
  if (criteria.repetitionDetected) {
    descriptions.push('repetition detected')
  }
  if (criteria.highConfidenceWithOwnership) {
    descriptions.push('high confidence + ownership')
  }

  return descriptions
}

/**
 * Return empty criteria (all false)
 */
function emptyAcceleration(): AccelerationCriteria {
  return {
    userArticulatedConstraint: false,
    clarityTrendIncreasing: false,
    groundCoveredHigh: false,
    repetitionDetected: false,
    highConfidenceWithOwnership: false
  }
}

/**
 * Build acceleration context for prompt injection
 * (When acceleration triggers, add this to prompt)
 */
export function buildAccelerationContext(result: AccelerationResult): string {
  if (!result.accelerate) return ''

  return `
**ACCELERATION ACTIVE**
The conversation has gathered sufficient context. ${result.reason}.

Move toward validation/diagnosis rather than continuing open exploration.
- If hypothesis not yet validated: Present it for validation
- If validated: Move to diagnosis consent
- Keep momentum - don't circle back to covered ground
`
}
