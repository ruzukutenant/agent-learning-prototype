// Investigate Pat Feinberg's session - check conversation_state
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SECRET_KEY || ''
)

async function main() {
  const { data: session, error } = await supabase
    .from('advisor_sessions')
    .select('id, conversation_state')
    .ilike('user_email', '%pat%feinberg%')
    .single()

  if (error) { console.error(error); return }

  const state = session.conversation_state as any
  console.log('tactical_drift:', JSON.stringify(state?.tactical_drift, null, 2))
  console.log('closing_sequence:', JSON.stringify(state?.closing_sequence, null, 2))
  console.log('phase:', state?.phase)
  console.log('turns_total:', state?.turns_total)
  console.log('Has learner_state:', !!state?.learner_state)
  console.log('Has resistance_tracking:', !!state?.resistance_tracking)

  // Check all top-level keys
  console.log('\nTop-level state keys:', Object.keys(state || {}))
}
main()
