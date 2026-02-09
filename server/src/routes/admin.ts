import { Router } from 'express'
import { supabase } from '../config/supabase.js'
import { buildEmailTemplate } from '../services/email/resend.js'
import { generateAssessmentReport } from '../services/ai/reportGenerator.js'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

const router = Router()

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
if (!ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD environment variable is required')
}

// In-memory cache for stats endpoint
let statsCache: { data: any; timestamp: number } | null = null as { data: any; timestamp: number } | null
const STATS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Middleware to check admin password
// Accepts password via header (x-admin-password) or query param (token) for browser-navigable endpoints
function requireAdmin(req: any, res: any, next: any) {
  const password = req.headers['x-admin-password'] || req.query.token
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body

    if (password === ADMIN_PASSWORD) {
      return res.json({ success: true })
    }

    return res.status(401).json({ error: 'Invalid password' })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single session with messages
router.get('/sessions/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('advisor_sessions')
      .select('*')
      .eq('id', id)
      .single()

    if (sessionError) throw sessionError

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('advisor_messages')
      .select('id, turn_number, speaker, message_text, phase, created_at, was_voice')
      .eq('session_id', id)
      .order('turn_number', { ascending: true })

    if (messagesError) throw messagesError

    return res.json({ session, messages })
  } catch (error) {
    console.error('Get session error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Preview summary email HTML for a session
router.get('/sessions/:id/email-preview', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const { data: session, error } = await supabase
      .from('advisor_sessions')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!session.constraint_category) {
      return res.status(400).json({ error: 'No constraint identified for this session' })
    }

    const isMIST = session.constraint_category === 'execution'
    const bookingLink = isMIST
      ? (process.env.MIST_BOOKING_LINK || process.env.VITE_MIST_BOOKING_LINK || '')
      : (process.env.EC_BOOKING_LINK || process.env.VITE_EC_BOOKING_LINK || '')

    const conversationState = session.conversation_state as any
    const identifiedBlockers = conversationState?.readiness_check?.identified_blockers || []

    let report
    try {
      report = await generateAssessmentReport(id, {
        clarity: session.clarity_score,
        confidence: session.confidence_score,
        capacity: session.capacity_score,
      })
    } catch (e) {
      console.error('[Admin] Failed to generate report for preview:', e)
    }

    const html = buildEmailTemplate({
      userName: session.user_name || 'there',
      constraintCategory: session.constraint_category,
      constraintSummary: session.constraint_summary || 'Your primary constraint has been identified.',
      clarityScore: session.clarity_score,
      confidenceScore: session.confidence_score,
      capacityScore: session.capacity_score,
      bookingLink,
      report,
      identifiedBlockers,
    })

    res.setHeader('Content-Type', 'text/html')
    return res.send(html)
  } catch (error) {
    console.error('Email preview error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all sessions (paginated)
router.get('/sessions', requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 75))
    const filter = (req.query.filter as string) || 'all'
    const search = ((req.query.search as string) || '').trim()
    const from = (page - 1) * limit
    const to = from + limit - 1

    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined

    // Build base query with filter, search, and date range
    function applyFilters(query: any) {
      // Date range filter
      if (startDate) query = query.gte('created_at', startDate)
      if (endDate) query = query.lte('created_at', endDate)
      // Status filter
      switch (filter) {
        case 'booked':
          query = query.eq('call_booked_confirmed', true); break
        case 'not_booked':
          query = query.not('constraint_category', 'is', null).or('call_booked_confirmed.is.null,call_booked_confirmed.eq.false'); break
        case 'completed':
          query = query.not('constraint_category', 'is', null); break
        case 'in_progress':
          query = query.is('constraint_category', null); break
      }
      // Search by name or email (case-insensitive partial match)
      if (search) {
        query = query.or(`user_name.ilike.%${search}%,user_email.ilike.%${search}%`)
      }
      return query
    }

    // Get total count (filtered)
    const countQuery = supabase
      .from('advisor_sessions')
      .select('*', { count: 'exact', head: true })
    const { count, error: countError } = await applyFilters(countQuery)

    if (countError) throw countError

    // Get page of sessions (filtered)
    const dataQuery = supabase
      .from('advisor_sessions')
      .select('id, user_name, user_email, created_at, constraint_category, endpoint_selected, call_booked_confirmed')
      .order('created_at', { ascending: false })
      .range(from, to)
    const { data: sessions, error } = await applyFilters(dataQuery)

    if (error) throw error

    const sessionSummaries = sessions.map((session: any) => ({
      id: session.id,
      user_name: session.user_name,
      user_email: session.user_email,
      created_at: session.created_at,
      status: session.constraint_category ? 'completed' : 'in_progress',
      constraint_category: session.constraint_category,
      endpoint_selected: session.endpoint_selected,
      call_booked: !!session.call_booked_confirmed,
    }))

    return res.json({
      sessions: sessionSummaries,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Sessions fetch error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Get stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined
    const hasDateFilter = !!(startDate || endDate)

    // Only use cache when no date filter is applied
    if (!hasDateFilter && statsCache && Date.now() - statsCache.timestamp < STATS_CACHE_TTL) {
      return res.json({ stats: statsCache.data })
    }

    function applyDateFilter(q: any) {
      if (startDate) q = q.gte('created_at', startDate)
      if (endDate) q = q.lte('created_at', endDate)
      return q
    }

    // Run count queries and minimal data fetch in parallel
    const [totalResult, completedResult, breakdownResult] = await Promise.all([
      applyDateFilter(
        supabase.from('advisor_sessions').select('*', { count: 'exact', head: true })
      ),
      applyDateFilter(
        supabase.from('advisor_sessions').select('*', { count: 'exact', head: true })
          .not('constraint_category', 'is', null)
      ),
      // Only fetch the two columns needed for breakdowns
      applyDateFilter(
        supabase.from('advisor_sessions').select('constraint_category, endpoint_selected')
      ),
    ])

    if (totalResult.error) throw totalResult.error
    if (completedResult.error) throw completedResult.error
    if (breakdownResult.error) throw breakdownResult.error

    const totalSessions = totalResult.count || 0
    const completedSessions = completedResult.count || 0
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0

    // Single pass for both breakdowns
    const endpointBreakdown: Record<string, number> = {}
    const constraintBreakdown: Record<string, number> = {}
    for (const s of breakdownResult.data) {
      const endpoint = (s as any).endpoint_selected || 'None'
      endpointBreakdown[endpoint] = (endpointBreakdown[endpoint] || 0) + 1
      const constraint = (s as any).constraint_category || 'None'
      constraintBreakdown[constraint] = (constraintBreakdown[constraint] || 0) + 1
    }

    const stats = {
      totalSessions,
      completedSessions,
      completionRate,
      endpointBreakdown,
      constraintBreakdown,
    }

    if (!hasDateFilter) {
      statsCache = { data: stats, timestamp: Date.now() }
    }

    return res.json({ stats })
  } catch (error) {
    console.error('Stats fetch error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Export CSV
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const { data: sessions, error } = await supabase
      .from('advisor_sessions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Build CSV
    const headers = [
      'ID',
      'Name',
      'Email',
      'Created At',
      'Status',
      'Constraint Category',
      'Constraint Summary',
      'Clarity Score',
      'Confidence Score',
      'Capacity Score',
      'Endpoint Selected',
      'Email Sent',
      'Webhook Sent',
    ]

    const rows = sessions.map((session: any) => [
      session.id,
      session.user_name || '',
      session.user_email || '',
      session.created_at,
      session.constraint_category ? 'completed' : 'in_progress',
      session.constraint_category || '',
      session.constraint_summary || '',
      session.clarity_score || '',
      session.confidence_score || '',
      session.capacity_score || '',
      session.endpoint_selected || '',
      session.email_sent ? 'Yes' : 'No',
      session.webhook_sent ? 'Yes' : 'No',
    ])

    // Escape CSV fields
    const escapeCSV = (field: any) => {
      const str = String(field)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any) => row.map(escapeCSV).join(',')),
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=advisor-sessions-${new Date().toISOString().split('T')[0]}.csv`
    )
    return res.send(csvContent)
  } catch (error) {
    console.error('Export error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Create a new split test
router.post('/split-tests', requireAdmin, async (req, res) => {
  try {
    const { testName, location, variants } = req.body
    if (!testName || !variants || !Array.isArray(variants) || variants.length < 2) {
      return res.status(400).json({ error: 'testName and at least 2 variants required' })
    }

    const loc = location || 'landing'

    // Prevent multiple active tests at the same location
    const { data: existing } = await supabase
      .from('split_tests')
      .select('id')
      .eq('location', loc)
      .eq('active', true)
      .limit(1)

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'An active test already exists for this location. End it first.' })
    }

    const { data, error } = await supabase
      .from('split_tests')
      .insert({
        test_name: testName,
        location: loc,
        variants,
        active: true,
      })
      .select()
      .single()

    if (error) throw error
    return res.json({ test: data })
  } catch (error: any) {
    console.error('Create split test error:', error)
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'A test with that name already exists' })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// End a split test
router.patch('/split-tests/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { winner } = req.body

    const { data, error } = await supabase
      .from('split_tests')
      .update({
        active: false,
        winner: winner || null,
        ended_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return res.json({ test: data })
  } catch (error) {
    console.error('End split test error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Split test results - aggregates from funnel_events
router.get('/split-tests', requireAdmin, async (_req, res) => {
  try {
    // Query all landing_viewed events that have split test data
    const { data: events, error } = await supabase
      .from('funnel_events')
      .select('event_data, session_id')
      .eq('event_type', 'landing_viewed')
      .not('event_data->splitTest', 'is', null)

    if (error) throw error

    // Also get conversion events (chat_started) to calculate conversion rates
    // chat_started events now include splitTest/variant data for proper attribution
    const { data: conversions, error: convError } = await supabase
      .from('funnel_events')
      .select('session_id, event_data')
      .eq('event_type', 'chat_started')

    if (convError) throw convError

    // Conversions are now counted directly from chat_started events with split test data
    // (see conversion counting loop below)

    // Query component impression events
    const { data: componentImpressions, error: ciError } = await supabase
      .from('funnel_events')
      .select('event_data, session_id')
      .eq('event_type', 'component_impression')
      .not('event_data->splitTest', 'is', null)

    if (ciError) throw ciError

    // Query component conversion events
    const { data: componentConversions, error: ccError } = await supabase
      .from('funnel_events')
      .select('event_data, session_id')
      .eq('event_type', 'component_conversion')
      .not('event_data->splitTest', 'is', null)

    if (ccError) throw ccError

    // Build a set of (testName, variant, sessionId) that converted for component tests
    const componentConvertedSet = new Set(
      (componentConversions || []).map(c =>
        `${c.event_data?.splitTest}:${c.event_data?.variant}:${c.session_id}`
      )
    )

    // Group by test name and variant
    const testMap = new Map<string, Map<string, { views: number; conversions: number }>>()

    // Count conversions per (testName, variant) from chat_started events
    const conversionCounts = new Map<string, number>()
    const conversionSeenSessions = new Set<string>()
    for (const conv of conversions || []) {
      const testName = conv.event_data?.splitTest
      const variant = conv.event_data?.variant
      if (!testName || !variant) continue

      // Dedup by session to avoid counting same user multiple times
      const dedupKey = `${testName}:${variant}:${conv.session_id}`
      if (conversionSeenSessions.has(dedupKey)) continue
      conversionSeenSessions.add(dedupKey)

      const key = `${testName}:${variant}`
      conversionCounts.set(key, (conversionCounts.get(key) || 0) + 1)
    }

    // Landing page events - each unique event = one view (client already dedupes by visitor)
    // Note: session_id is null for landing_viewed events, so we just count each event
    for (const event of events || []) {
      const testName = event.event_data?.splitTest
      const variant = event.event_data?.variant
      if (!testName || !variant) continue

      if (!testMap.has(testName)) {
        testMap.set(testName, new Map())
      }
      const variantMap = testMap.get(testName)!
      if (!variantMap.has(variant)) {
        variantMap.set(variant, { views: 0, conversions: 0 })
      }
      const stats = variantMap.get(variant)!
      stats.views++
    }

    // Apply conversion counts to the testMap
    for (const [key, count] of conversionCounts) {
      const [testName, variant] = key.split(':')
      const variantMap = testMap.get(testName)
      if (variantMap) {
        const stats = variantMap.get(variant)
        if (stats) {
          stats.conversions = count
        }
      }
    }

    // Component impression events (dedup by session to avoid inflated counts from re-renders)
    const componentSeenSet = new Set<string>()
    for (const event of componentImpressions || []) {
      const testName = event.event_data?.splitTest
      const variant = event.event_data?.variant
      if (!testName || !variant) continue

      const dedupKey = `${testName}:${variant}:${event.session_id}`
      if (componentSeenSet.has(dedupKey)) continue
      componentSeenSet.add(dedupKey)

      if (!testMap.has(testName)) {
        testMap.set(testName, new Map())
      }
      const variantMap = testMap.get(testName)!
      if (!variantMap.has(variant)) {
        variantMap.set(variant, { views: 0, conversions: 0 })
      }
      const stats = variantMap.get(variant)!
      stats.views++
      if (componentConvertedSet.has(dedupKey)) {
        stats.conversions++
      }
    }

    // Convert to response format
    const tests = Array.from(testMap.entries()).map(([testName, variantMap]) => {
      const variants = Array.from(variantMap.entries()).map(([variant, stats]) => ({
        variant,
        views: stats.views,
        conversions: stats.conversions,
        conversionRate: stats.views > 0 ? stats.conversions / stats.views : 0
      }))
      return {
        testName,
        variants,
        totalViews: variants.reduce((sum, v) => sum + v.views, 0)
      }
    })

    // Also fetch test configs from split_tests table
    const { data: testConfigs } = await supabase
      .from('split_tests')
      .select('*')
      .order('created_at', { ascending: false })

    return res.json({ tests, testConfigs: testConfigs || [] })
  } catch (error) {
    console.error('Split test results error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
