import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { supabase } from '../config/supabase.js'
import {
  calculateFunnelMetrics,
  buildFunnelStages,
  getFunnelVisualizationData,
  getDailyMetrics,
  type DateRange,
} from '../services/analytics/funnelCalculations.js'

const router = Router()

// Funnel event types
export type FunnelEvent =
  | 'landing_viewed'
  | 'name_collection_started'
  | 'chat_started'
  | 'chat_completed'
  | 'email_provided'
  | 'summary_viewed'
  | 'booking_clicked'
  | 'handoff_card_shown'
  | 'handoff_card_clicked'

interface TrackEventRequest {
  sessionId?: string
  eventType: FunnelEvent
  eventData?: Record<string, any>
}

// Map event types to session field names (not all events have a session column)
const eventFieldMap: Partial<Record<FunnelEvent, string>> = {
  landing_viewed: 'landing_viewed_at',
  name_collection_started: 'name_collection_started_at',
  chat_started: 'chat_started_at',
  chat_completed: 'chat_completed_at',
  email_provided: 'email_provided_at',
  summary_viewed: 'summary_viewed_at',
  booking_clicked: 'booking_clicked_at',
}

const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Track funnel event
router.post('/track', trackLimiter, async (req, res) => {
  try {
    const { sessionId, eventType, eventData } = req.body as TrackEventRequest

    if (!eventType) {
      return res.status(400).json({ error: 'Event type required' })
    }

    const timestamp = new Date().toISOString()
    const userAgent = req.headers['user-agent']
    const referrer = req.headers['referer']

    // If we have a sessionId, update the session
    if (sessionId) {
      const fieldName = eventFieldMap[eventType]

      if (fieldName) {
        // Only set timestamp if not already set (prevent overwrites from page revisits)
        const { data: existingSession } = await supabase
          .from('advisor_sessions')
          .select(fieldName)
          .eq('id', sessionId)
          .single()

        const alreadySet = existingSession && (existingSession as any)[fieldName]

        if (!alreadySet) {
          const updates: any = { [fieldName]: timestamp }

          // Special handling for booking_clicked - store endpoint
          if (eventType === 'booking_clicked' && eventData?.endpoint) {
            updates.booking_clicked_endpoint = eventData.endpoint
          }

          const { error: updateError } = await supabase
            .from('advisor_sessions')
            .update(updates)
            .eq('id', sessionId)

          if (updateError) {
            console.error('Error updating session:', updateError)
          }
        }
      }

      // Also create a detailed event log entry
      const { error: eventError } = await supabase
        .from('funnel_events')
        .insert({
          session_id: sessionId,
          event_type: eventType,
          event_data: eventData || {},
          user_agent: userAgent,
          referrer: referrer,
          created_at: timestamp,
        })

      if (eventError) {
        console.error('Error creating event log:', eventError)
      }
    } else {
      // No session yet (e.g., landing page view)
      // Just log the event without a session
      const { error: eventError } = await supabase
        .from('funnel_events')
        .insert({
          session_id: null,
          event_type: eventType,
          event_data: eventData || {},
          user_agent: userAgent,
          referrer: referrer,
          created_at: timestamp,
        })

      if (eventError) {
        console.error('Error creating event log:', eventError)
      }
    }

    return res.json({ success: true, timestamp })
  } catch (error) {
    console.error('Track event error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Get funnel metrics
router.get('/metrics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    const dateRange: DateRange = {}
    if (typeof startDate === 'string') dateRange.startDate = startDate
    if (typeof endDate === 'string') dateRange.endDate = endDate

    const metrics = await calculateFunnelMetrics(dateRange)

    return res.json(metrics)
  } catch (error) {
    console.error('Get metrics error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Get funnel visualization data
router.get('/funnel', async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    const dateRange: DateRange = {}
    if (typeof startDate === 'string') dateRange.startDate = startDate
    if (typeof endDate === 'string') dateRange.endDate = endDate

    const funnelData = await getFunnelVisualizationData(dateRange)

    return res.json(funnelData)
  } catch (error) {
    console.error('Get funnel data error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Combined: metrics + funnel stages in a single request (1 DB round-trip instead of 2)
router.get('/combined', async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    const dateRange: DateRange = {}
    if (typeof startDate === 'string') dateRange.startDate = startDate
    if (typeof endDate === 'string') dateRange.endDate = endDate

    const metrics = await calculateFunnelMetrics(dateRange)
    const funnel = buildFunnelStages(metrics)

    return res.json({ metrics, funnel })
  } catch (error) {
    console.error('Get combined data error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Get daily metrics
router.get('/daily', async (req, res) => {
  try {
    const { days } = req.query
    const daysCount = typeof days === 'string' ? parseInt(days, 10) : 30

    const dailyMetrics = await getDailyMetrics(daysCount)

    return res.json(dailyMetrics)
  } catch (error) {
    console.error('Get daily metrics error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
