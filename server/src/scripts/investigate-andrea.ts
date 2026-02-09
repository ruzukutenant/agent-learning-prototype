import { supabase } from '../config/supabase.js'

const SESSION_ID = '34e581d0-a037-494c-940c-6e628c1509b8'

async function main() {
  // 1. Session details
  const { data: session, error: sessErr } = await supabase
    .from('advisor_sessions')
    .select('*')
    .eq('id', SESSION_ID)
    .single()

  if (sessErr || !session) {
    console.log('Session not found:', sessErr)
    return
  }

  const cs = session.conversation_state as any
  console.log('=== ANDREA SESSION ===')
  console.log('Created:', session.created_at)
  console.log('Updated:', session.updated_at)
  console.log('Constraint:', session.constraint_category)
  console.log('Constraint summary:', session.constraint_summary?.substring(0, 200))
  console.log('Phase:', cs?.phase)
  console.log('Turns:', cs?.turns_total)
  console.log('Diagnosis delivered:', cs?.diagnosis_delivered)
  console.log('Hypothesis validated:', cs?.hypothesis_validated)
  console.log('Closing phase:', cs?.closing_sequence?.phase)
  console.log('Facilitation offered:', cs?.closing_sequence?.facilitation_offered)
  console.log('Blockers checked:', cs?.readiness_check?.blockers_checked)
  console.log('Scores:', session.clarity_score, session.confidence_score, session.capacity_score)
  console.log('Email:', session.user_email)
  console.log('Email sent:', session.email_sent)
  console.log('CRM synced:', session.crm_synced)
  console.log('summary_viewed_at:', session.summary_viewed_at)
  console.log('booking_clicked_at:', session.booking_clicked_at)
  console.log('chat_completed_at:', session.chat_completed_at)
  console.log('closing_phase:', session.closing_phase)
  console.log('facilitation_offered:', session.facilitation_offered)

  // Full conversation_state dump
  console.log('\n=== FULL CONVERSATION STATE ===')
  console.log(JSON.stringify(cs, null, 2))

  // 2. All messages - get full content for last 10
  const { data: allMsgs } = await supabase
    .from('advisor_messages')
    .select('*')
    .eq('session_id', SESSION_ID)
    .order('turn_number', { ascending: true })

  console.log(`\n=== ALL ${allMsgs?.length} MESSAGES (preview) ===`)
  allMsgs?.forEach((m: any) => {
    const preview = m.message_text?.substring(0, 120)?.replace(/\n/g, ' ')
    console.log(`  [${m.turn_number}] ${m.speaker} (${m.phase || '-'}): ${preview}`)
  })

  // Last 10 messages - full text
  const last10 = allMsgs?.slice(-10) || []
  console.log(`\n=== LAST ${last10.length} MESSAGES (full) ===`)
  last10.forEach((m: any) => {
    console.log(`\n--- Turn ${m.turn_number} | ${m.speaker} | phase: ${m.phase} | action: ${m.action} ---`)
    console.log(m.message_text)
    if (m.components) {
      console.log('COMPONENTS:', JSON.stringify(m.components, null, 2))
    }
    if (m.metadata) {
      console.log('METADATA:', JSON.stringify(m.metadata, null, 2))
    }
  })

  // 3. Check the messages table too (might be different from advisor_messages)
  const { data: legacyMsgs } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', SESSION_ID)
    .order('created_at', { ascending: true })

  if (legacyMsgs && legacyMsgs.length > 0) {
    console.log(`\n=== MESSAGES TABLE (${legacyMsgs.length} messages) ===`)
    const lastLegacy = legacyMsgs.slice(-5)
    lastLegacy.forEach((m: any) => {
      console.log(`\n--- ${m.role} | ${m.created_at} ---`)
      console.log(m.content?.substring(0, 300))
      if (m.components) console.log('COMPONENTS:', JSON.stringify(m.components, null, 2))
    })
  }

  // 4. Analytics events
  const { data: events } = await supabase
    .from('analytics_events')
    .select('event_type, created_at, event_data')
    .eq('session_id', SESSION_ID)
    .order('created_at', { ascending: true })

  console.log(`\n=== ANALYTICS EVENTS (${events?.length}) ===`)
  events?.forEach((e: any) => {
    console.log(`  ${e.created_at} | ${e.event_type} | ${JSON.stringify(e.event_data)?.substring(0, 150)}`)
  })
}

main().catch(console.error)
