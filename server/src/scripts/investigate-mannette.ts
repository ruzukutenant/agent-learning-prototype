// Investigate Mannette Antill's session
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SECRET_KEY || ''
)

async function main() {
  const { data: sessions, error } = await supabase
    .from('advisor_sessions')
    .select('id, user_name, user_email, total_turns, current_phase, constraint_category, constraint_summary, created_at, updated_at')
    .or('user_email.ilike.%mannette%,user_name.ilike.%mannette%')

  if (error) { console.error(error); return }
  console.log('Sessions found:', sessions?.length)
  console.log(JSON.stringify(sessions, null, 2))

  for (const s of sessions || []) {
    console.log(`\n=== Session ${s.id} (${s.user_name}, turns=${s.total_turns}, phase=${s.current_phase}) ===`)

    const { data: msgs, error: msgErr } = await supabase
      .from('advisor_messages')
      .select('turn_number, speaker, message_text, created_at')
      .eq('session_id', s.id)
      .order('turn_number', { ascending: true })

    if (msgErr) { console.error(msgErr); continue }
    console.log('Total messages in DB:', msgs?.length)

    // Show last 6 messages
    const last = msgs?.slice(-6)
    for (const m of last || []) {
      const preview = m.message_text.substring(0, 200)
      console.log(`\n[Turn ${m.turn_number}] ${m.speaker} (${m.created_at}):`)
      console.log(`  ${preview}${m.message_text.length > 200 ? '...' : ''}`)
    }

    // Check state
    const { data: full } = await supabase
      .from('advisor_sessions')
      .select('conversation_state')
      .eq('id', s.id)
      .single()

    const state = full?.conversation_state as any
    if (state) {
      console.log('\ntactical_drift:', state.tactical_drift ? 'present' : 'MISSING')
      console.log('turns_total in state:', state.turns_total)
      console.log('phase in state:', state.phase)
    }
  }
}
main()
