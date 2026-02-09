/**
 * Check session state for debugging
 * Run: npx tsx server/src/scripts/check-session.ts <session-id>
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const sessionId = process.argv[2] || 'ae969196-1975-4928-861d-2f31522ed172'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function checkSession() {
  console.log(`\n=== Checking Session: ${sessionId} ===\n`)

  const { data, error } = await supabase
    .from('advisor_sessions')
    .select('conversation_state, current_phase, constraint_category, total_turns')
    .eq('id', sessionId)
    .single()

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Session state:')
  console.log('  current_phase:', data.current_phase)
  console.log('  constraint_category:', data.constraint_category)
  console.log('  total_turns:', data.total_turns)
  console.log('')

  const cs = data.conversation_state as any
  console.log('Conversation state:')
  console.log('  phase:', cs?.phase)
  console.log('  constraint_hypothesis:', cs?.constraint_hypothesis)
  console.log('  hypothesis_confidence:', cs?.hypothesis_confidence)
  console.log('  diagnosis_delivered:', cs?.diagnosis_delivered)
  console.log('  summary_already_shown:', cs?.summary_already_shown)
  console.log('')

  console.log('Closing sequence:')
  const closing = cs?.closing_sequence
  console.log('  phase:', closing?.phase)
  console.log('  closing_arc_complete:', closing?.closing_arc_complete)
  console.log('  alignment_detected:', closing?.alignment_detected)
  console.log('  agreed_needs_help:', closing?.agreed_needs_help)
  console.log('  agreed_to_offering:', closing?.agreed_to_offering)
  console.log('  turns_in_closing:', closing?.turns_in_closing)
  console.log('  facilitation_offered:', closing?.facilitation_offered)
  console.log('  user_hesitation_expressed:', closing?.user_hesitation_expressed)
  console.log('')

  console.log('Consent state:')
  console.log('  diagnosis_confirmed:', cs?.consent_state?.diagnosis_confirmed)
  console.log('  diagnosis_requested:', cs?.consent_state?.diagnosis_requested)
  console.log('')

  // Analysis
  console.log('=== Analysis ===\n')

  const shouldShowSummary = (
    closing?.closing_arc_complete &&
    closing?.alignment_detected &&
    !cs?.summary_already_shown
  )

  const shouldShowSummaryFallback = (
    cs?.phase === 'complete' &&
    !cs?.summary_already_shown &&
    cs?.diagnosis_delivered
  )

  console.log('shouldShowSummary conditions:')
  console.log('  closing_arc_complete:', closing?.closing_arc_complete, closing?.closing_arc_complete ? '✓' : '✗')
  console.log('  alignment_detected:', closing?.alignment_detected, closing?.alignment_detected ? '✓' : '✗')
  console.log('  !summary_already_shown:', !cs?.summary_already_shown, !cs?.summary_already_shown ? '✓' : '✗')
  console.log('  => shouldShowSummary:', shouldShowSummary)
  console.log('')

  console.log('shouldShowSummaryFallback conditions:')
  console.log('  phase === complete:', cs?.phase === 'complete', cs?.phase === 'complete' ? '✓' : '✗')
  console.log('  !summary_already_shown:', !cs?.summary_already_shown, !cs?.summary_already_shown ? '✓' : '✗')
  console.log('  diagnosis_delivered:', cs?.diagnosis_delivered, cs?.diagnosis_delivered ? '✓' : '✗')
  console.log('  => shouldShowSummaryFallback:', shouldShowSummaryFallback)
  console.log('')

  if (shouldShowSummary || shouldShowSummaryFallback) {
    console.log('✓ Component SHOULD be triggered based on current state')
  } else {
    console.log('✗ Component will NOT be triggered - conditions not met')
    console.log('')
    console.log('What needs to happen:')
    if (!closing?.closing_arc_complete) {
      console.log('  - closing_arc_complete needs to be true (set when closing_facilitate action runs)')
    }
    if (!closing?.alignment_detected) {
      console.log('  - alignment_detected needs to be true (set during Turn D when user agrees)')
    }
  }
}

checkSession()
