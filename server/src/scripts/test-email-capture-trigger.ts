/**
 * Unit test for mid-conversation email capture trigger logic.
 *
 * Tests the deterministic conditions that control when the
 * collect_email component appears in the chat.
 *
 * Run: npx tsx server/src/scripts/test-email-capture-trigger.ts
 */

import { initializeState } from '../orchestrator/conversation/orchestrator.js'
import type { ConversationState } from '../orchestrator/core/types.js'

let passed = 0
let failed = 0

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  PASS: ${label}`)
    passed++
  } else {
    console.error(`  FAIL: ${label}`)
    failed++
  }
}

/**
 * Replicate the exact trigger logic from orchestrator.ts Step 9, Rule 5
 */
function shouldShowEmailCapture(state: ConversationState): boolean {
  return (
    state.turns_total >= 10 &&
    !state.email_capture_shown &&
    state.closing_sequence.phase === 'not_started' &&
    (state.learner_state.insights_articulated.length >= 1 ||
     state.hypothesis_confidence >= 0.6)
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeState(overrides: Record<string, any> = {}): ConversationState {
  const base = initializeState('Test')
  const merged = { ...base, ...overrides }

  // Allow nested overrides
  if (overrides.learner_state) {
    merged.learner_state = { ...base.learner_state, ...overrides.learner_state }
  }
  if (overrides.closing_sequence) {
    merged.closing_sequence = { ...base.closing_sequence, ...overrides.closing_sequence }
  }

  return merged
}

// ============================================================================
console.log('\n=== Email Capture Trigger Tests ===\n')

// --- Basic trigger conditions ---

console.log('1. Should NOT trigger before turn 10')
assert(
  !shouldShowEmailCapture(makeState({ turns_total: 9, hypothesis_confidence: 0.8 })),
  'turns_total=9, confidence=0.8 → no trigger'
)
assert(
  !shouldShowEmailCapture(makeState({ turns_total: 5, learner_state: { insights_articulated: ['insight'] } })),
  'turns_total=5, 1 insight → no trigger'
)

console.log('\n2. Should trigger at turn 10+ with sufficient engagement')
assert(
  shouldShowEmailCapture(makeState({ turns_total: 10, hypothesis_confidence: 0.6 })),
  'turns_total=10, confidence=0.6 → trigger'
)
assert(
  shouldShowEmailCapture(makeState({ turns_total: 10, learner_state: { insights_articulated: ['I realized my bottleneck is delegation'] } })),
  'turns_total=10, 1 insight → trigger'
)
assert(
  shouldShowEmailCapture(makeState({ turns_total: 15, hypothesis_confidence: 0.9 })),
  'turns_total=15, confidence=0.9 → trigger'
)

console.log('\n3. Should NOT trigger without engagement signals')
assert(
  !shouldShowEmailCapture(makeState({ turns_total: 10, hypothesis_confidence: 0.3 })),
  'turns_total=10, confidence=0.3, no insights → no trigger'
)
assert(
  !shouldShowEmailCapture(makeState({ turns_total: 12, hypothesis_confidence: 0.5 })),
  'turns_total=12, confidence=0.5, no insights → no trigger'
)

console.log('\n4. Should NOT trigger if already shown')
assert(
  !shouldShowEmailCapture(makeState({ turns_total: 10, hypothesis_confidence: 0.8, email_capture_shown: true })),
  'email_capture_shown=true → no trigger (prevents re-showing)'
)

console.log('\n5. Should NOT trigger during closing sequence')
assert(
  !shouldShowEmailCapture(makeState({
    turns_total: 10,
    hypothesis_confidence: 0.8,
    closing_sequence: { phase: 'reflect_implication' }
  })),
  'closing phase=reflect_implication → no trigger'
)
assert(
  !shouldShowEmailCapture(makeState({
    turns_total: 10,
    hypothesis_confidence: 0.8,
    closing_sequence: { phase: 'assert_and_align' }
  })),
  'closing phase=assert_and_align → no trigger'
)
assert(
  !shouldShowEmailCapture(makeState({
    turns_total: 10,
    hypothesis_confidence: 0.8,
    closing_sequence: { phase: 'facilitate' }
  })),
  'closing phase=facilitate → no trigger'
)

console.log('\n6. Edge cases')
assert(
  shouldShowEmailCapture(makeState({ turns_total: 10, hypothesis_confidence: 0.6, learner_state: { insights_articulated: [] } })),
  'confidence=0.6, no insights → trigger (confidence alone is sufficient)'
)
assert(
  shouldShowEmailCapture(makeState({ turns_total: 10, hypothesis_confidence: 0.0, learner_state: { insights_articulated: ['one insight'] } })),
  'confidence=0.0, 1 insight → trigger (insight alone is sufficient)'
)
assert(
  !shouldShowEmailCapture(makeState({ turns_total: 10, hypothesis_confidence: 0.59 })),
  'confidence=0.59, no insights → no trigger (just below threshold)'
)

console.log('\n7. Initial state should not trigger')
assert(
  !shouldShowEmailCapture(initializeState('Test')),
  'fresh initial state → no trigger'
)

// ============================================================================
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)

if (failed > 0) {
  process.exit(1)
}
