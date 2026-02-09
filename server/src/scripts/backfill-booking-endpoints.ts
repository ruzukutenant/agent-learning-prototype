/**
 * Backfill endpoint_selected for completed sessions that have a constraint
 * but no endpoint recorded (from before the orchestrator set this field).
 *
 * Also backfills booking_clicked_endpoint for sessions with confirmed bookings.
 *
 * Logic:
 * - execution constraint → MIST
 * - strategy/psychology constraint → EC
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

function getEndpoint(constraint: string | null): 'MIST' | 'EC' | null {
  const c = constraint?.toLowerCase()
  if (c === 'execution') return 'MIST'
  if (c === 'strategy' || c === 'psychology') return 'EC'
  return null
}

async function backfillEndpoints() {
  // Find completed sessions with a constraint but no endpoint_selected
  const { data: sessions, error } = await supabase
    .from('advisor_sessions')
    .select('id, user_name, user_email, constraint_category, endpoint_selected, booking_clicked_endpoint, call_booked_confirmed')
    .not('constraint_category', 'is', null)

  if (error) {
    console.error('Error fetching sessions:', error)
    process.exit(1)
  }

  if (!sessions || sessions.length === 0) {
    console.log('No sessions found.')
    return
  }

  // Filter to sessions that need updating
  const needsUpdate = sessions.filter(s =>
    !s.endpoint_selected ||
    (s.call_booked_confirmed && !s.booking_clicked_endpoint)
  )

  if (needsUpdate.length === 0) {
    console.log('No sessions need backfilling.')
    return
  }

  console.log(`Found ${needsUpdate.length} sessions to backfill:\n`)

  for (const session of needsUpdate) {
    const endpoint = getEndpoint(session.constraint_category)

    if (!endpoint) {
      console.log(`⚠️  ${session.user_name} (${session.user_email}): constraint="${session.constraint_category}" - skipping`)
      continue
    }

    const updates: Record<string, string> = {}
    const changes: string[] = []

    if (!session.endpoint_selected) {
      updates.endpoint_selected = endpoint
      changes.push(`endpoint_selected=${endpoint}`)
    }

    if (session.call_booked_confirmed && !session.booking_clicked_endpoint) {
      updates.booking_clicked_endpoint = endpoint
      changes.push(`booking_clicked_endpoint=${endpoint}`)
    }

    if (Object.keys(updates).length === 0) continue

    console.log(`${session.user_name} (${session.user_email}): ${changes.join(', ')}`)

    const { error: updateError } = await supabase
      .from('advisor_sessions')
      .update(updates)
      .eq('id', session.id)

    if (updateError) {
      console.error(`  ❌ Failed: ${updateError.message}`)
    } else {
      console.log(`  ✓ Updated`)
    }
  }

  console.log('\nBackfill complete.')
}

backfillEndpoints()
