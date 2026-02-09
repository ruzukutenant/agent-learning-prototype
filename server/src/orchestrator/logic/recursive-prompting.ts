// Recursive prompting logic - expertise building and pre-commitment checks
// This module enables learner-centered conversation that makes discovery visible

import type {
  ConversationSignals,
  ConversationState,
  StateInference,
  CommitmentLevel
} from '../core/types.js'

/**
 * Detect if we should reflect an insight back to the user
 *
 * Triggers when:
 * - User articulates a breakthrough insight
 * - Clear ownership language present
 * - Not in containment mode (don't add complexity when overwhelmed)
 *
 * Purpose: Make their learning visible, validate discovery
 */
export function shouldReflectInsight(
  signals: ConversationSignals,
  state: ConversationState
): boolean {

  // GUARD 1: Don't reflect too early in conversation
  // User needs time to share context before we can reflect insights
  if (state.turns_total < 3) {
    return false
  }

  // GUARD 2: Don't reflect during context phase
  // Context phase is for gathering information, not celebrating insights
  if (state.phase === 'context') {
    return false
  }

  // GUARD 3: Don't reflect during containment (too overwhelming)
  if (state.turns_since_containment < 2) {
    return false
  }

  // GUARD 4: Stop reflecting after we have enough milestones (3+)
  // This prevents over-triggering and allows other actions to run
  if (state.learner_state.learning_milestones >= 3) {
    return false
  }

  // GUARD 5: Require stronger signal - insight_articulated alone is too loose
  // Now requires BOTH insight_articulated AND ownership language
  if (signals.insight_articulated && signals.ownership_language) {
    return true
  }

  // Breakthrough language + ownership = reflection worthy
  if (signals.breakthrough_language.length >= 2 && signals.ownership_language) {
    return true
  }

  // High confidence + clear hypothesis forming = insight moment
  if (
    signals.confidence_level === 'high' &&
    signals.clarity_level === 'high' &&
    state.constraint_hypothesis !== null &&
    !state.learner_state.hypothesis_co_created
  ) {
    return true
  }

  return false
}

/**
 * Detect contradictions in user's statements
 *
 * Returns details about the contradiction if found, null otherwise
 *
 * Purpose: Surface tensions constructively to deepen understanding
 */
export function detectContradiction(
  signals: ConversationSignals,
  state: ConversationState
): { shouldSurface: boolean; type: 'assumption' | 'tension' | 'resistance' | null } {

  // Don't surface during containment (too destabilizing)
  if (state.turns_since_containment < 3) {
    return { shouldSurface: false, type: null }
  }

  // Don't surface too many contradictions (max 2-3 per conversation)
  if (state.learner_state.contradictions_surfaced >= 3) {
    return { shouldSurface: false, type: null }
  }

  // Don't surface immediately after previous contradiction (need 4 turns)
  if (state.contradiction_count > 0 && state.turns_total - state.contradiction_count < 4) {
    return { shouldSurface: false, type: null }
  }

  // Explicit contradiction in this message
  if (signals.contradiction_present) {
    return { shouldSurface: true, type: 'tension' }
  }

  // Resistance to emerging hypothesis
  if (
    signals.resistance_to_hypothesis &&
    state.constraint_hypothesis !== null &&
    !state.hypothesis_validated
  ) {
    return { shouldSurface: true, type: 'resistance' }
  }

  // High confidence but contradictory signals (e.g., "I know exactly what to do" + capacity issues)
  if (
    signals.confidence_level === 'high' &&
    signals.clarity_level === 'low' &&
    state.turns_total >= 5
  ) {
    return { shouldSurface: true, type: 'assumption' }
  }

  return { shouldSurface: false, type: null }
}

/**
 * Evaluate if hypothesis has passed stress test
 *
 * Stress test = presenting hypothesis and asking for counter-evidence
 * Pass = they validate it holds up against reality
 *
 * Purpose: Reality-check before finalizing diagnosis
 */
export function evaluateStressTest(
  signals: ConversationSignals,
  state: ConversationState,
  inference: StateInference
): { passed: boolean; confidence: number } {

  // Can't pass stress test if we haven't presented hypothesis yet
  if (!state.constraint_hypothesis || !state.hypothesis_validated) {
    return { passed: false, confidence: 0 }
  }

  // Check if stress test was explicitly passed based on signals
  if (signals.stress_test_passed) {
    return { passed: true, confidence: 0.9 }
  }

  // Indirect signals of stress test pass:
  // - High confidence + clarity maintained after validation
  // - Ownership language present
  // - No new contradictions surfaced
  // - Ready for diagnosis
  const indirectPass =
    signals.confidence_level === 'high' &&
    signals.clarity_level === 'high' &&
    signals.ownership_language &&
    !signals.contradiction_present &&
    inference.diagnosis_ready.ready

  if (indirectPass) {
    return { passed: true, confidence: 0.75 }
  }

  // Stress test failed indicators:
  // - New contradictions after presenting hypothesis
  // - Resistance to hypothesis
  // - Confidence dropped
  const stressTestFailed =
    signals.resistance_to_hypothesis ||
    (signals.contradiction_present && state.hypothesis_validated) ||
    signals.confidence_level === 'low'

  if (stressTestFailed) {
    return { passed: false, confidence: 0.8 }
  }

  // Inconclusive - not enough evidence yet
  return { passed: false, confidence: 0.3 }
}

/**
 * Assess pre-commitment readiness
 *
 * Determines if user is genuinely ready to commit to action (booking)
 * or if there are blockers that need addressing
 *
 * Purpose: Prevent false positives, ensure quality conversions
 */
export function assessCommitmentReadiness(
  signals: ConversationSignals,
  state: ConversationState,
  inference: StateInference
): {
  ready: boolean
  commitmentLevel: CommitmentLevel
  blockers: string[]
  shouldRunCheck: boolean
} {

  const blockers: string[] = []

  // FIX: Bug #1 - Should we run pre-commitment check?
  // Run after stress test passes but before we've checked commitment
  const shouldRunCheck =
    state.learner_state.stress_test_passed &&
    state.readiness_check.stress_test_completed &&
    !state.recursive_state.pre_commitment_checked &&
    state.readiness.clarity === 'high' &&
    state.readiness.confidence === 'high'

  if (!shouldRunCheck) {
    return {
      ready: false,
      commitmentLevel: 'low',
      blockers,
      shouldRunCheck: false
    }
  }

  // Explicit commitment language = high commitment
  if (signals.commitment_language) {
    return {
      ready: true,
      commitmentLevel: 'high',
      blockers,
      shouldRunCheck: true
    }
  }

  // Check for blockers
  if (signals.blocker_mentioned) {
    blockers.push('Explicit blocker mentioned in conversation')
  }

  if (state.readiness.capacity === 'low') {
    blockers.push('Low capacity - may need done-for-you support (MIST)')
  }

  if (state.emotional_charge === 'high') {
    blockers.push('High emotional charge - may need stabilization first')
  }

  if (state.readiness.confidence === 'low') {
    blockers.push('Low confidence - may need more validation')
  }

  // Calculate commitment level
  let commitmentLevel: CommitmentLevel = 'medium'

  // High commitment: high clarity + confidence, minimal blockers
  if (
    state.readiness.clarity === 'high' &&
    state.readiness.confidence === 'high' &&
    blockers.length === 0
  ) {
    commitmentLevel = 'high'
  }

  // Low commitment: significant blockers or low readiness
  if (
    blockers.length >= 2 ||
    state.readiness.clarity === 'low' ||
    (state.readiness.confidence === 'low' && state.readiness.capacity === 'low')
  ) {
    commitmentLevel = 'low'
  }

  // Ready if medium/high commitment AND no critical blockers
  const ready = commitmentLevel !== 'low' && blockers.length <= 1

  return {
    ready,
    commitmentLevel,
    blockers,
    shouldRunCheck: true
  }
}

/**
 * Determine if we should build shared success criteria
 *
 * Purpose: Establish explicit agreement on what "good" looks like
 * before finalizing diagnosis
 */
export function shouldBuildCriteria(
  state: ConversationState,
  inference: StateInference
): boolean {

  // Don't build criteria during containment
  if (state.turns_since_containment < 3) {
    return false
  }

  // Only build criteria once
  if (state.recursive_state.shared_criteria_established) {
    return false
  }

  // Build criteria when:
  // - We have a strong hypothesis (confidence > 0.7)
  // - But haven't validated yet
  // - And we're in exploration or approaching diagnosis
  const shouldBuild =
    inference.constraint_hypothesis.confidence >= 0.7 &&
    !state.hypothesis_validated &&
    state.phase !== 'complete' &&
    state.turns_total >= 5

  return shouldBuild
}

// Expertise order for monotonic progression guard
const EXPERTISE_ORDER = { 'novice': 0, 'developing': 1, 'expert': 2 } as const

/**
 * Calculate expertise level based on learner journey
 *
 * Tracks how deeply they understand their constraint
 * IMPORTANT: Expertise can only UPGRADE, never downgrade (monotonic progression)
 */
export function calculateExpertiseLevel(
  state: ConversationState
): 'novice' | 'developing' | 'expert' {

  const currentLevel = state.learner_state.expertise_level

  const {
    insights_articulated,
    learning_milestones,
    hypothesis_co_created,
    stress_test_passed
  } = state.learner_state

  // Calculate proposed level based on current state
  let proposedLevel: 'novice' | 'developing' | 'expert' = 'novice'

  // Expert: Co-created hypothesis, passed stress test, multiple insights
  if (
    hypothesis_co_created &&
    stress_test_passed &&
    insights_articulated.length >= 3 &&
    learning_milestones >= 2
  ) {
    proposedLevel = 'expert'
  }
  // Developing: Some insights, participated in hypothesis building
  else if (
    insights_articulated.length >= 2 ||
    learning_milestones >= 1 ||
    hypothesis_co_created
  ) {
    proposedLevel = 'developing'
  }

  // GUARD: Never downgrade expertise (monotonic progression)
  // Learning can't be unlearned - if they reached a level, they stay there
  if (EXPERTISE_ORDER[proposedLevel] < EXPERTISE_ORDER[currentLevel]) {
    console.log(`[Expertise Guard] Prevented downgrade: ${currentLevel} → ${proposedLevel} (staying at ${currentLevel})`)
    return currentLevel
  }

  // Log upgrades for visibility
  if (proposedLevel !== currentLevel) {
    console.log(`[Expertise] Upgraded: ${currentLevel} → ${proposedLevel}`)
  }

  return proposedLevel
}
