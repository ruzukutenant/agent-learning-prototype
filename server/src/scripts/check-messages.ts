/**
 * Check where messages are stored for a session
 * Run: npx tsx server/src/scripts/check-messages.ts <session-id>
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const sessionId = process.argv[2] || 'e6c5d427-0159-4982-ad0f-15d7c05cd83e'

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SECRET_KEY || ''
)

async function check() {
  console.log(`\n=== Checking Messages for Session: ${sessionId} ===\n`)

  // Check advisor_messages table
  const { data: messages, error: msgError } = await supabase
    .from('advisor_messages')
    .select('id, turn_number, speaker, message_text')
    .eq('session_id', sessionId)
    .order('turn_number', { ascending: true })

  console.log('=== advisor_messages table ===')
  console.log('Count:', messages?.length || 0)
  if (msgError) console.log('Error:', msgError)
  if (messages && messages.length > 0) {
    console.log('First few messages:')
    messages.slice(0, 3).forEach(m => {
      const preview = m.message_text?.substring(0, 80) || '(empty)'
      console.log(`  Turn ${m.turn_number} (${m.speaker}): ${preview}...`)
    })
  }

  // Check conversation_log field
  const { data: session, error: sessError } = await supabase
    .from('advisor_sessions')
    .select('conversation_log, total_turns')
    .eq('id', sessionId)
    .single()

  console.log('')
  console.log('=== conversation_log JSONB field ===')
  const log = session?.conversation_log as any[] | null
  console.log('Count:', log?.length || 0)
  console.log('total_turns field:', session?.total_turns)

  if (log && log.length > 0) {
    console.log('First few messages:')
    log.slice(0, 3).forEach((m: any, i: number) => {
      const text = m.message_text || m.content || m.text || '(no text field)'
      const preview = typeof text === 'string' ? text.substring(0, 80) : JSON.stringify(text).substring(0, 80)
      console.log(`  [${i}] ${m.speaker || m.role || 'unknown'}: ${preview}...`)
    })
  }

  // Summary
  console.log('')
  console.log('=== Summary ===')
  const msgCount = messages?.length || 0
  const logCount = log?.length || 0

  if (msgCount > 0) {
    console.log('✓ Messages found in advisor_messages table')
  } else if (logCount > 0) {
    console.log('⚠ Messages only in conversation_log JSONB (admin endpoint may not show these)')
  } else {
    console.log('✗ No messages found in either location')
  }
}

check()
