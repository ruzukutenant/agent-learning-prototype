/**
 * Fix booking_clicked_at timestamps that are incorrectly after call_booked_at.
 *
 * The bug: Some sessions have booking_clicked_at set with a timezone offset
 * from call_booked_at (same minutes/seconds, different hour). This is impossible
 * since you must click before you book.
 *
 * The fix: Set booking_clicked_at to 2 minutes before call_booked_at, which
 * matches the typical user flow (click link → complete booking form).
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

async function fixBookingTimestamps() {
  // Find sessions where booking_clicked_at >= call_booked_at (impossible)
  const { data: sessions, error } = await supabase
    .from('advisor_sessions')
    .select('id, user_name, user_email, chat_completed_at, booking_clicked_at, call_booked_at')
    .not('call_booked_at', 'is', null)
    .not('booking_clicked_at', 'is', null)

  if (error) {
    console.error('Error fetching sessions:', error)
    process.exit(1)
  }

  if (!sessions || sessions.length === 0) {
    console.log('No sessions with both booking_clicked_at and call_booked_at.')
    return
  }

  // Filter to sessions with impossible timestamps
  const badSessions = sessions.filter(s => {
    const clicked = new Date(s.booking_clicked_at).getTime()
    const booked = new Date(s.call_booked_at).getTime()
    return clicked >= booked
  })

  if (badSessions.length === 0) {
    console.log('All booking timestamps are valid (click before book). Nothing to fix.')
    return
  }

  console.log(`Found ${badSessions.length} sessions with booking_clicked_at >= call_booked_at:\n`)

  for (const session of badSessions) {
    // Parse timestamps - ensure they're treated as UTC
    const bookedAtStr = session.call_booked_at.endsWith('Z')
      ? session.call_booked_at
      : session.call_booked_at + 'Z'
    const bookedAt = new Date(bookedAtStr)

    // Set booking_clicked_at to 2 minutes before call_booked_at
    const fixedClickedAt = new Date(bookedAt.getTime() - 2 * 60 * 1000)

    console.log(`${session.user_name} (${session.user_email || 'no email'}):`)
    console.log(`  call_booked_at:     ${session.call_booked_at}`)
    console.log(`  booking_clicked_at: ${session.booking_clicked_at} (BAD - after booking)`)
    console.log(`  → fixing to:        ${fixedClickedAt.toISOString()}`)

    const { error: updateError } = await supabase
      .from('advisor_sessions')
      .update({ booking_clicked_at: fixedClickedAt.toISOString() })
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

fixBookingTimestamps()
