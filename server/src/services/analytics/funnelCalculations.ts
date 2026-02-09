import { supabase } from '../../config/supabase.js'

export interface FunnelMetrics {
  total: {
    landingViews: number
    sessionsStarted: number
    chatsStarted: number
    chatsCompleted: number
    emailsProvided: number
    summariesViewed: number
    bookingsClicked: number
    callsBooked: number
  }
  conversionRates: {
    landingToSession: number
    sessionToChat: number
    chatToCompletion: number
    completionToSummary: number
    summaryToBookingClick: number
    bookingClickToBooked: number
    overallConversion: number // landing to booked call
  }
  dropOffAnalysis: {
    abandonedAtNameCollection: number
    abandonedAfterFirstMessage: number
    abandonedBeforeCompletion: number
    abandonedAtSummary: number
    clickedButDidntBook: number
  }
  endpointPerformance: {
    EC: { clicks: number; bookings: number; conversionRate: number }
    MIST: { clicks: number; bookings: number; conversionRate: number }
  }
  emailCaptureRate: number
  emailCaptureRateOfStarted: number
  avgTimeToComplete?: number // in minutes
  avgTimeToBook?: number // in minutes
  // New fields for enhanced analytics
  constraintBreakdown: {
    strategy: number
    execution: number
    psychology: number
  }
  engagement: {
    medianTurns: number // median conversation turns (completed sessions)
    medianTimeMinutes: number // median time to complete in minutes (capped at 2 hrs)
    completedCount: number // number of completed sessions used for these stats
  }
  trends?: {
    overallConversion: number // change vs previous period
    bookings: number // change vs previous period
    emailCapture: number // change vs previous period
  }
}

export interface DateRange {
  startDate?: string
  endDate?: string
}

/**
 * Calculate comprehensive funnel metrics
 */
export async function calculateFunnelMetrics(dateRange?: DateRange): Promise<FunnelMetrics> {
  // Build date filter — only select columns we actually use
  let query = supabase.from('advisor_sessions').select(
    'id, name_collection_started_at, chat_started_at, chat_completed_at, email_provided_at, summary_viewed_at, booking_clicked_at, call_booked_confirmed, booking_clicked_endpoint, constraint_category, call_booked_at'
  )

  if (dateRange?.startDate) {
    query = query.gte('created_at', dateRange.startDate)
  }
  if (dateRange?.endDate) {
    query = query.lte('created_at', dateRange.endDate)
  }

  const { data: sessions, error } = await query

  if (error) {
    console.error('[Analytics] Error fetching sessions:', error)
    throw new Error('Failed to fetch session data')
  }

  if (!sessions || sessions.length === 0) {
    return getEmptyMetrics()
  }

  // Count landing views from funnel_events table
  let eventQuery = supabase
    .from('funnel_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'landing_viewed')

  if (dateRange?.startDate) {
    eventQuery = eventQuery.gte('created_at', dateRange.startDate)
  }
  if (dateRange?.endDate) {
    eventQuery = eventQuery.lte('created_at', dateRange.endDate)
  }

  const { count: landingViews } = await eventQuery

  // Single pass over sessions to compute all counts
  let sessionsStarted = 0, chatsStarted = 0, chatsCompleted = 0,
      emailsProvided = 0, emailsOfCompleted = 0, emailsOfStarted = 0,
      summariesViewed = 0, bookingsClicked = 0, callsBooked = 0
  let ecClicks = 0, ecBookings = 0, mistClicks = 0, mistBookings = 0
  let strategyCount = 0, executionCount = 0, psychologyCount = 0
  const completionTimes: Array<{ start: string; end: string }> = []
  const bookingTimes: Array<{ start: string; end: string }> = []
  const completedSessionIds: string[] = []

  for (const s of sessions) {
    if (s.name_collection_started_at) sessionsStarted++
    if (s.chat_started_at) chatsStarted++
    if (s.chat_completed_at) chatsCompleted++
    if (s.email_provided_at) {
      emailsProvided++
      if (s.chat_completed_at) emailsOfCompleted++
      if (s.chat_started_at) emailsOfStarted++
    }
    if (s.summary_viewed_at) summariesViewed++
    if (s.booking_clicked_at) bookingsClicked++
    if (s.call_booked_confirmed === true) callsBooked++

    // Endpoint performance
    if (s.booking_clicked_endpoint === 'EC') {
      ecClicks++
      if (s.call_booked_confirmed === true) ecBookings++
    } else if (s.booking_clicked_endpoint === 'MIST') {
      mistClicks++
      if (s.call_booked_confirmed === true) mistBookings++
    }

    // Constraint breakdown
    if (s.constraint_category === 'strategy') strategyCount++
    else if (s.constraint_category === 'execution') executionCount++
    else if (s.constraint_category === 'psychology') psychologyCount++

    // Completed sessions for time/engagement calculations
    if (s.name_collection_started_at && s.chat_completed_at) {
      completedSessionIds.push(s.id)
      completionTimes.push({ start: s.name_collection_started_at, end: s.chat_completed_at })
    }
    if (s.name_collection_started_at && s.call_booked_at) {
      bookingTimes.push({ start: s.name_collection_started_at, end: s.call_booked_at })
    }
  }

  const total = {
    landingViews: landingViews || 0,
    sessionsStarted, chatsStarted, chatsCompleted,
    emailsProvided, summariesViewed, bookingsClicked, callsBooked,
  }

  // Calculate conversion rates
  const conversionRates = {
    landingToSession: calculateRate(total.sessionsStarted, total.landingViews),
    sessionToChat: calculateRate(total.chatsStarted, total.sessionsStarted),
    chatToCompletion: calculateRate(total.chatsCompleted, total.chatsStarted),
    completionToSummary: calculateRate(total.summariesViewed, total.chatsCompleted),
    summaryToBookingClick: calculateRate(total.bookingsClicked, total.summariesViewed),
    bookingClickToBooked: calculateRate(total.callsBooked, total.bookingsClicked),
    overallConversion: calculateRate(total.callsBooked, total.landingViews),
  }

  // Calculate drop-offs
  const dropOffAnalysis = {
    abandonedAtNameCollection: total.landingViews - total.sessionsStarted,
    abandonedAfterFirstMessage: total.sessionsStarted - total.chatsStarted,
    abandonedBeforeCompletion: total.chatsStarted - total.chatsCompleted,
    abandonedAtSummary: total.chatsCompleted - total.summariesViewed,
    clickedButDidntBook: total.bookingsClicked - total.callsBooked,
  }

  const endpointPerformance = {
    EC: {
      clicks: ecClicks,
      bookings: ecBookings,
      conversionRate: calculateRate(ecBookings, ecClicks),
    },
    MIST: {
      clicks: mistClicks,
      bookings: mistBookings,
      conversionRate: calculateRate(mistBookings, mistClicks),
    },
  }

  // Calculate email capture rates — use conditional counts so numerator ≤ denominator
  const emailCaptureRate = calculateRate(emailsOfCompleted, total.chatsCompleted)
  const emailCaptureRateOfStarted = calculateRate(emailsOfStarted, total.chatsStarted)

  const avgTimeToComplete = calculateAverageTime(completionTimes)
  const avgTimeToBook = calculateAverageTime(bookingTimes)

  const constraintBreakdown = {
    strategy: strategyCount,
    execution: executionCount,
    psychology: psychologyCount,
  }

  // Calculate engagement metrics using medians (resistant to outliers)
  let medianTurns = 0
  let medianTimeMinutes = 0
  const MAX_SESSION_TIME_MINUTES = 120 // Cap at 2 hours - longer is likely abandoned tab

  if (completedSessionIds.length > 0) {
    // Query message counts for completed sessions
    const { data: messageCounts } = await supabase
      .from('advisor_messages')
      .select('session_id')
      .in('session_id', completedSessionIds)

    if (messageCounts && messageCounts.length > 0) {
      // Count messages per session
      const sessionMessageCounts: Record<string, number> = {}
      messageCounts.forEach(m => {
        sessionMessageCounts[m.session_id] = (sessionMessageCounts[m.session_id] || 0) + 1
      })

      // Calculate turns per session (messages / 2)
      const turnsArray = Object.values(sessionMessageCounts)
        .map(count => Math.round(count / 2))
        .sort((a, b) => a - b)

      // Calculate median turns
      if (turnsArray.length > 0) {
        const mid = Math.floor(turnsArray.length / 2)
        medianTurns = turnsArray.length % 2 !== 0
          ? turnsArray[mid]
          : Math.round((turnsArray[mid - 1] + turnsArray[mid]) / 2)
      }
    }

    // Calculate median time (with outlier cap)
    const validTimes = completionTimes
      .filter(pair => pair.start && pair.end)
      .map(pair => {
        const start = new Date(pair.start).getTime()
        const end = new Date(pair.end).getTime()
        return (end - start) / 1000 / 60 // minutes
      })
      .filter(minutes => minutes > 0 && minutes <= MAX_SESSION_TIME_MINUTES) // Filter outliers
      .sort((a, b) => a - b)

    if (validTimes.length > 0) {
      const mid = Math.floor(validTimes.length / 2)
      medianTimeMinutes = validTimes.length % 2 !== 0
        ? Math.round(validTimes[mid])
        : Math.round((validTimes[mid - 1] + validTimes[mid]) / 2)
    }
  }

  const engagement = {
    medianTurns,
    medianTimeMinutes,
    completedCount: completedSessionIds.length,
  }

  return {
    total,
    conversionRates,
    dropOffAnalysis,
    endpointPerformance,
    emailCaptureRate,
    emailCaptureRateOfStarted,
    avgTimeToComplete,
    avgTimeToBook,
    constraintBreakdown,
    engagement,
  }
}

/**
 * Get funnel data for visualization
 */
export interface FunnelStage {
  name: string
  count: number
  percentage: number
  dropOff: number
}

/**
 * Build funnel stages from pre-computed metrics (no extra DB call)
 */
export function buildFunnelStages(metrics: FunnelMetrics): FunnelStage[] {

  // Calculate conversion rates for simplified funnel
  const landingToChat = metrics.total.landingViews > 0
    ? Math.round((metrics.total.chatsStarted / metrics.total.landingViews) * 100 * 10) / 10
    : 0

  const chatToCompletion = metrics.total.chatsStarted > 0
    ? Math.round((metrics.total.chatsCompleted / metrics.total.chatsStarted) * 100 * 10) / 10
    : 0

  const completionToBookingClick = metrics.total.chatsCompleted > 0
    ? Math.round((metrics.total.bookingsClicked / metrics.total.chatsCompleted) * 100 * 10) / 10
    : 0

  const bookingClickToBooked = metrics.total.bookingsClicked > 0
    ? Math.round((metrics.total.callsBooked / metrics.total.bookingsClicked) * 100 * 10) / 10
    : 0

  const stages: FunnelStage[] = [
    {
      name: 'Landing Views',
      count: metrics.total.landingViews,
      percentage: 100,
      dropOff: metrics.total.landingViews - metrics.total.chatsStarted,
    },
    {
      name: 'Chats Started',
      count: metrics.total.chatsStarted,
      percentage: landingToChat,
      dropOff: metrics.total.chatsStarted - metrics.total.chatsCompleted,
    },
    {
      name: 'Chats Completed',
      count: metrics.total.chatsCompleted,
      percentage: chatToCompletion,
      dropOff: metrics.total.chatsCompleted - metrics.total.bookingsClicked,
    },
    {
      name: 'Booking Clicked',
      count: metrics.total.bookingsClicked,
      percentage: completionToBookingClick,
      dropOff: metrics.total.bookingsClicked - metrics.total.callsBooked,
    },
    {
      name: 'Call Booked',
      count: metrics.total.callsBooked,
      percentage: bookingClickToBooked,
      dropOff: 0,
    },
  ]

  return stages
}

/**
 * Backward-compat wrapper: fetches metrics then builds stages.
 * Prefer using calculateFunnelMetrics + buildFunnelStages directly to avoid double computation.
 */
export async function getFunnelVisualizationData(dateRange?: DateRange): Promise<FunnelStage[]> {
  const metrics = await calculateFunnelMetrics(dateRange)
  return buildFunnelStages(metrics)
}

/**
 * Get daily funnel metrics for trend analysis
 */
export interface DailyMetrics {
  date: string
  landingViews: number
  sessionsStarted: number
  chatsCompleted: number
  bookingsClicked: number
  callsBooked: number
  conversionRate: number
}

export async function getDailyMetrics(days: number = 30): Promise<DailyMetrics[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const dailyMetrics: DailyMetrics[] = []

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)
    const nextDateStr = nextDate.toISOString().split('T')[0]

    const metrics = await calculateFunnelMetrics({
      startDate: dateStr,
      endDate: nextDateStr,
    })

    dailyMetrics.push({
      date: dateStr,
      landingViews: metrics.total.landingViews,
      sessionsStarted: metrics.total.sessionsStarted,
      chatsCompleted: metrics.total.chatsCompleted,
      bookingsClicked: metrics.total.bookingsClicked,
      callsBooked: metrics.total.callsBooked,
      conversionRate: metrics.conversionRates.overallConversion,
    })
  }

  return dailyMetrics
}

// Helper functions

function calculateRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Math.round((numerator / denominator) * 100 * 10) / 10 // Round to 1 decimal
}

function calculateAverageTime(
  timePairs: Array<{ start: string | null; end: string | null }>
): number | undefined {
  const validPairs = timePairs.filter(pair => pair.start && pair.end)
  if (validPairs.length === 0) return undefined

  const totalMinutes = validPairs.reduce((sum, pair) => {
    const start = new Date(pair.start!).getTime()
    const end = new Date(pair.end!).getTime()
    const minutes = (end - start) / 1000 / 60
    return sum + minutes
  }, 0)

  return Math.round(totalMinutes / validPairs.length)
}

function getEmptyMetrics(): FunnelMetrics {
  return {
    total: {
      landingViews: 0,
      sessionsStarted: 0,
      chatsStarted: 0,
      chatsCompleted: 0,
      emailsProvided: 0,
      summariesViewed: 0,
      bookingsClicked: 0,
      callsBooked: 0,
    },
    conversionRates: {
      landingToSession: 0,
      sessionToChat: 0,
      chatToCompletion: 0,
      completionToSummary: 0,
      summaryToBookingClick: 0,
      bookingClickToBooked: 0,
      overallConversion: 0,
    },
    dropOffAnalysis: {
      abandonedAtNameCollection: 0,
      abandonedAfterFirstMessage: 0,
      abandonedBeforeCompletion: 0,
      abandonedAtSummary: 0,
      clickedButDidntBook: 0,
    },
    endpointPerformance: {
      EC: { clicks: 0, bookings: 0, conversionRate: 0 },
      MIST: { clicks: 0, bookings: 0, conversionRate: 0 },
    },
    emailCaptureRate: 0,
    emailCaptureRateOfStarted: 0,
    constraintBreakdown: {
      strategy: 0,
      execution: 0,
      psychology: 0,
    },
    engagement: {
      medianTurns: 0,
      medianTimeMinutes: 0,
      completedCount: 0,
    },
  }
}
