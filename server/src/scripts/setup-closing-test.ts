/**
 * Set up a session state for testing the closing flow
 * Run: npx tsx server/src/scripts/setup-closing-test.ts <session-id>
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const sessionId = process.argv[2]

if (!sessionId) {
  console.error('Usage: npx tsx server/src/scripts/setup-closing-test.ts <session-id>')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function setupClosingTest() {
  console.log(`\n=== Setting up Closing Test for Session: ${sessionId} ===\n`)

  // First get current state to preserve other fields
  const { data: current, error: fetchError } = await supabase
    .from('advisor_sessions')
    .select('conversation_state, user_name')
    .eq('id', sessionId)
    .single()

  if (fetchError) {
    console.error('Error fetching session:', fetchError)
    return
  }

  const userName = current.user_name || 'Test User'

  // Build proper closing state
  // Note: main 'phase' must be a valid DB enum: context, exploration, diagnosis, readiness, routing, complete
  // Use 'diagnosis' since we're in the closing sequence after diagnosis
  const closingState = {
    ...(current.conversation_state || {}),

    // Main phase - use 'diagnosis' (valid DB value) - closing logic uses closing_sequence.phase internally
    phase: 'diagnosis',

    // Constraint hypothesis
    constraint_hypothesis: 'execution',
    hypothesis_confidence: 0.9,
    hypothesis_validated: true,
    diagnosis_delivered: true,

    // Consent
    consent_state: {
      diagnosis_requested: true,
      diagnosis_confirmed: true,
      last_consent_request: null
    },

    // Readiness - set to high to skip explore_readiness
    readiness: {
      clarity: 'high',
      confidence: 'high',
      capacity: 'high'
    },

    // Learner state - mark stress test as passed
    learner_state: {
      stress_test_passed: true,
      insights_articulated: [],
      learning_milestones: 3,
      expertise_level: 'developing',
      hypothesis_co_created: true,
      contradictions_surfaced: 0
    },

    // Readiness check - mark blockers as checked
    readiness_check: {
      stress_test_completed: true,
      blockers_checked: true,
      identified_blockers: [],
      commitment_level: 'high',
      ready_for_booking: true,
      turns_exploring_readiness: 0
    },

    // Closing sequence - at Turn D2 (offer_solution)
    // Next agreeing message should trigger closing_facilitate (Turn E)
    closing_sequence: {
      phase: 'offer_solution',  // Turn D2
      turns_in_closing: 5,
      synthesis: {
        confirmed_constraint: 'execution',
        key_evidence: ['Doing everything myself', 'No time to work ON business'],
        emotional_tone: 'energized',
        capability_gap: 'You need systems and support to delegate - you can\'t see your own blind spots from inside the jar.',
        recommended_path: 'MIST implementation program',
        // Additional fields to prevent null errors
        user_stated_future: ['Want to scale without burning out', 'Need time to work ON the business'],
        stakes_to_foreground: ['Currently stuck doing everything yourself', 'Risk of burnout'],
        attempted_solutions: ['Tried hiring VAs but no documented processes', 'Worked more hours'],
        why_self_resolution_fails: 'You\'re too close to it to see what to hand off first - you need an outside perspective.',
        recommended_support_category: 'implementation support',
        pacing_approach: 'moderate',
        language_compression: 'normal',
        personality_style: { directness: 'direct', detail_orientation: 'moderate' }
      },
      alignment_detected: true,
      agreed_needs_help: true,
      agreed_to_offering: false,  // Not yet - next message should set this
      user_hesitation_expressed: false,
      facilitation_offered: false,
      closing_arc_complete: false  // Will become true when closing_facilitate runs
    },

    // Make sure summary hasn't been shown
    summary_already_shown: false,

    // User info
    user_name: userName
  }

  // Note: current_phase has a check constraint, valid values might be different
  // Try 'diagnosis' as it's closest to closing
  const { error: updateError } = await supabase
    .from('advisor_sessions')
    .update({
      conversation_state: closingState,
      current_phase: 'diagnosis',  // Use valid enum value
      constraint_category: 'execution'
    })
    .eq('id', sessionId)

  if (updateError) {
    console.error('Error updating session:', updateError)
    return
  }

  console.log('✓ Session state updated for closing test')
  console.log('')
  console.log('Current state:')
  console.log('  - phase: closing')
  console.log('  - closing_sequence.phase: offer_solution (Turn D2)')
  console.log('  - alignment_detected: true')
  console.log('  - closing_arc_complete: false')
  console.log('')
  console.log('Next step:')
  console.log('  Send a message like "Yes, that sounds great" or "I\'d like that"')
  console.log('  This should trigger closing_facilitate (Turn E) and show the summary component')
  console.log('')
  console.log('Watch server logs for:')
  console.log('  [Orchestrator] CLOSING ARC COMPLETE')
  console.log('  [Orchestrator] Setting phase to complete')
  console.log('  [Response Builder] Including X UI components: view_summary')
}

setupClosingTest()
