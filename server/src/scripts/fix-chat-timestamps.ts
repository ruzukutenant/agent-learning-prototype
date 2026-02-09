/**
 * Fix sessions where call_booked_at is before chat_completed_at.
 *
 * This is impossible - you must complete the chat before booking.
 * The issue was caused by chat_completed_at being overwritten when
 * users revisited the chat page after booking.
 *
 * Fix: Set chat_completed_at and summary_viewed_at to reasonable times
 * before booking_clicked_at, based on a typical user flow.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixChatTimestamps() {
  // Find sessions where call_booked_at < chat_completed_at
  const { data: sessions, error } = await supabase
    .from('advisor_sessions')
    .select('id, user_name, user_email, chat_completed_at, summary_viewed_at, booking_clicked_at, call_booked_at')
    .not('call_booked_at', 'is', null)
    .not('chat_completed_at', 'is', null)

  if (error) {
    console.error('Error fetching sessions:', error)
    process.exit(1)
  }

  if (!sessions || sessions.length === 0) {
    console.log('No sessions found.')
    return
  }

  // Filter to sessions with impossible order
  const badSessions = sessions.filter(s => {
    const chatCompleted = new Date(s.chat_completed_at + 'Z').getTime()
    const callBooked = new Date(s.call_booked_at + 'Z').getTime()
    return callBooked < chatCompleted
  })

  if (badSessions.length === 0) {
    console.log('All timestamps are in valid order. Nothing to fix.')
    return
  }

  console.log(`Found ${badSessions.length} sessions with call_booked_at before chat_completed_at:\n`)

  for (const session of badSessions) {
    // Use booking_clicked_at as the anchor if available, otherwise call_booked_at
    const anchorStr = session.booking_clicked_at || session.call_booked_at
    const anchor = new Date(anchorStr + (anchorStr.endsWith('Z') ? '' : 'Z'))

    // Set chat_completed_at to 5 minutes before booking click
    // Set summary_viewed_at to 3 minutes before booking click
    const fixedChatCompleted = new Date(anchor.getTime() - 5 * 60 * 1000)
    const fixedSummaryViewed = new Date(anchor.getTime() - 3 * 60 * 1000)

    console.log(`${session.user_name} (${session.user_email || 'no email'}):`)
    console.log(`  call_booked_at:       ${session.call_booked_at}`)
    console.log(`  chat_completed_at:    ${session.chat_completed_at} (BAD - after booking)`)
    console.log(`  → fixing to:          ${fixedChatCompleted.toISOString()}`)
    console.log(`  summary_viewed_at:    ${session.summary_viewed_at || 'null'}`)
    console.log(`  → fixing to:          ${fixedSummaryViewed.toISOString()}`)

    const { error: updateError } = await supabase
      .from('advisor_sessions')
      .update({
        chat_completed_at: fixedChatCompleted.toISOString(),
        summary_viewed_at: fixedSummaryViewed.toISOString(),
      })
      .eq('id', session.id)

    if (updateError) {
      console.error(`  ❌ Failed: ${updateError.message}`)
    } else {
      console.log(`  ✓ Updated`)
    }
    console.log()
  }

  console.log('Fix complete.')
}

fixChatTimestamps()
