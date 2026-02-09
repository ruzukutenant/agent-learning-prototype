// Export funnel conversion data for AI analysis
// Usage: npx tsx server/src/scripts/export-funnel.ts [--output path]
//
// Exports per-session funnel progression (timestamps at each stage) plus
// aggregate metrics. Output is a single JSON file with two sections:
// - sessions: per-session funnel journey with timing and outcome
// - aggregate: overall funnel metrics, conversion rates, drop-off analysis

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(import.meta.dirname, '../../../.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Parse CLI args
const args = process.argv.slice(2)
function getArg(flag: string, defaultValue: string): string {
  const idx = args.indexOf(flag)
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue
}

const OUTPUT_PATH = getArg('--output', `/tmp/coachmira-funnel-${new Date().toISOString().split('T')[0]}.json`)

interface FunnelSession {
  session_id: string
  user_name: string | null
  created_at: string
  // Funnel timestamps (null = didn't reach this stage)
  landing_viewed_at: string | null
  name_collection_started_at: string | null
  chat_started_at: string | null
  chat_completed_at: string | null
  email_provided_at: string | null
  summary_viewed_at: string | null
  booking_clicked_at: string | null
  booking_clicked_endpoint: string | null
  call_booked_at: string | null
  call_booked_confirmed: boolean
  // Session outcome
  total_turns: number
  completion_status: string
  constraint_category: string | null
  endpoint_selected: string | null
  // Computed durations (minutes)
  minutes_to_complete: number | null
  minutes_to_book: number | null
  // Furthest funnel stage reached
  furthest_stage: string
}

function computeMinutes(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const diff = new Date(end).getTime() - new Date(start).getTime()
  return Math.round(diff / 1000 / 60 * 10) / 10
}

function getFurthestStage(s: any): string {
  if (s.call_booked_confirmed) return 'call_booked'
  if (s.booking_clicked_at) return 'booking_clicked'
  if (s.summary_viewed_at) return 'summary_viewed'
  if (s.email_provided_at) return 'email_provided'
  if (s.chat_completed_at) return 'chat_completed'
  if (s.chat_started_at) return 'chat_started'
  if (s.name_collection_started_at) return 'name_entered'
  if (s.landing_viewed_at) return 'landing_viewed'
  return 'created'
}

function rate(num: number, den: number): number {
  if (den === 0) return 0
  return Math.round((num / den) * 1000) / 10
}

async function exportFunnel() {
  console.log('Exporting funnel data...')

  const { data: sessions, error } = await supabase
    .from('advisor_sessions')
    .select('id, user_name, created_at, landing_viewed_at, name_collection_started_at, chat_started_at, chat_completed_at, email_provided_at, summary_viewed_at, booking_clicked_at, booking_clicked_endpoint, call_booked_at, call_booked_confirmed, total_turns, completion_status, constraint_category, endpoint_selected')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch sessions:', error)
    process.exit(1)
  }

  if (!sessions || sessions.length === 0) {
    console.log('No sessions found.')
    return
  }

  // Build per-session funnel data
  const funnelSessions: FunnelSession[] = sessions.map(s => ({
    session_id: s.id,
    user_name: s.user_name,
    created_at: s.created_at,
    landing_viewed_at: s.landing_viewed_at,
    name_collection_started_at: s.name_collection_started_at,
    chat_started_at: s.chat_started_at,
    chat_completed_at: s.chat_completed_at,
    email_provided_at: s.email_provided_at,
    summary_viewed_at: s.summary_viewed_at,
    booking_clicked_at: s.booking_clicked_at,
    booking_clicked_endpoint: s.booking_clicked_endpoint,
    call_booked_at: s.call_booked_at,
    call_booked_confirmed: !!s.call_booked_confirmed,
    total_turns: s.total_turns,
    completion_status: s.completion_status,
    constraint_category: s.constraint_category,
    endpoint_selected: s.endpoint_selected,
    minutes_to_complete: computeMinutes(s.name_collection_started_at, s.chat_completed_at),
    minutes_to_book: computeMinutes(s.name_collection_started_at, s.call_booked_at),
    furthest_stage: getFurthestStage(s)
  }))

  // Fetch landing views from funnel_events (sessionless events, not stored on advisor_sessions)
  const { count: landingViewCount, error: landingError } = await supabase
    .from('funnel_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'landing_viewed')

  if (landingError) {
    console.error('Failed to fetch landing views:', landingError)
  }
  const landingViews = landingViewCount || 0

  // Compute aggregate metrics
  const total = sessions.length
  const chatsStarted = sessions.filter(s => s.chat_started_at).length
  const chatsCompleted = sessions.filter(s => s.chat_completed_at).length
  const emailsProvided = sessions.filter(s => s.email_provided_at).length
  const summariesViewed = sessions.filter(s => s.summary_viewed_at).length
  const bookingsClicked = sessions.filter(s => s.booking_clicked_at).length
  const callsBooked = sessions.filter(s => s.call_booked_confirmed).length

  const ecClicks = sessions.filter(s => s.booking_clicked_endpoint === 'EC')
  const mistClicks = sessions.filter(s => s.booking_clicked_endpoint === 'MIST')

  const completionTimes = funnelSessions.map(s => s.minutes_to_complete).filter((t): t is number => t !== null)
  const avgCompletionTime = completionTimes.length > 0
    ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length * 10) / 10
    : null

  // Stage distribution
  const stageDistribution: Record<string, number> = {}
  for (const s of funnelSessions) {
    stageDistribution[s.furthest_stage] = (stageDistribution[s.furthest_stage] || 0) + 1
  }

  const aggregate = {
    total_sessions: total,
    landing_views: landingViews,
    funnel_counts: {
      landing_views: landingViews,
      chats_started: chatsStarted,
      chats_completed: chatsCompleted,
      emails_provided: emailsProvided,
      summaries_viewed: summariesViewed,
      bookings_clicked: bookingsClicked,
      calls_booked: callsBooked
    },
    conversion_rates: {
      landing_to_started: rate(chatsStarted, landingViews),
      start_to_complete: rate(chatsCompleted, chatsStarted),
      complete_to_email: rate(emailsProvided, chatsCompleted),
      complete_to_summary: rate(summariesViewed, chatsCompleted),
      summary_to_booking_click: rate(bookingsClicked, summariesViewed),
      booking_click_to_booked: rate(callsBooked, bookingsClicked),
      overall_start_to_booked: rate(callsBooked, chatsStarted)
    },
    drop_off_by_stage: stageDistribution,
    endpoint_performance: {
      EC: { clicks: ecClicks.length, booked: ecClicks.filter(s => s.call_booked_confirmed).length },
      MIST: { clicks: mistClicks.length, booked: mistClicks.filter(s => s.call_booked_confirmed).length }
    },
    constraint_breakdown: {
      strategy: sessions.filter(s => s.constraint_category === 'strategy').length,
      execution: sessions.filter(s => s.constraint_category === 'execution').length,
      psychology: sessions.filter(s => s.constraint_category === 'psychology').length,
      undiagnosed: sessions.filter(s => !s.constraint_category).length
    },
    avg_completion_time_minutes: avgCompletionTime
  }

  const output = {
    exported_at: new Date().toISOString(),
    aggregate,
    sessions: funnelSessions
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n')

  console.log(`\nExported to: ${OUTPUT_PATH}`)
  console.log(`\nSummary:`)
  console.log(`  Landing views: ${landingViews}`)
  console.log(`  Total sessions: ${total}`)
  console.log(`  Chats started: ${chatsStarted} (${rate(chatsStarted, landingViews)}% of landing)`)
  console.log(`  Chats completed: ${chatsCompleted} (${rate(chatsCompleted, chatsStarted)}%)`)
  console.log(`  Emails provided: ${emailsProvided}`)
  console.log(`  Bookings clicked: ${bookingsClicked}`)
  console.log(`  Calls booked: ${callsBooked}`)
  console.log(`  Avg completion time: ${avgCompletionTime ?? 'N/A'} min`)
  console.log(`  Drop-off distribution: ${Object.entries(stageDistribution).map(([k, v]) => `${k}=${v}`).join(', ')}`)
}

exportFunnel().catch(err => {
  console.error('Export failed:', err)
  process.exit(1)
})
