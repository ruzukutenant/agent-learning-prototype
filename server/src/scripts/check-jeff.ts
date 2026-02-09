import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)

async function main() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('advisor_sessions')
    .select('id, user_name, total_turns, user_email, constraint_category, conversation_state, created_at')
    .gte('total_turns', 15)
    .not('user_email', 'is', null)
    .gte('created_at', weekAgo)
    .order('created_at', { ascending: false })

  // Find sessions where email_capture_shown is true (mid-chat capture worked)
  for (const s of data || []) {
    const state = s.conversation_state as any || {}
    if (state.email_capture_shown === true) {
      console.log(`${s.user_name} | ${s.user_email} | turns:${s.total_turns} | constraint:${s.constraint_category || 'none'} | ${s.created_at?.slice(0,10)}`)
      console.log(`  session: ${s.id}`)
      console.log()
      return // Just show the first one
    }
  }
  console.log('No matching sessions found')
}

main()
