import { Router } from 'express'
import { supabase } from '../config/supabase.js'
import { sendCallTakerNotification } from '../services/email/resend.js'
import { logEmailEvent } from '../services/email/retry.js'
import { generateAssessmentReport } from '../services/ai/reportGenerator.js'
import { sendMetaEvent } from '../services/meta-conversions.js'

const router = Router()

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  return `${local.substring(0, 2)}***@${domain}`
}

/**
 * Generic booking confirmation webhook
 * Can be called from Zapier when a booking is confirmed
 *
 * Zapier Setup:
 * 1. Trigger: New booking in your booking system (Calendly, Acuity, etc.)
 * 2. Action: Webhooks by Zapier - POST
 * 3. URL: https://your-domain.com/api/booking/confirmed
 * 4. Payload: See BookingConfirmation interface below
 */

interface BookingConfirmation {
  email: string                    // Required - to match with session
  bookingId?: string               // Optional - External booking ID
  bookingDate?: string             // Optional - When the call is scheduled
  bookingSystem?: string           // Optional - e.g., "calendly", "acuity"
  eventName?: string               // Optional - Type of booking
  metadata?: Record<string, any>   // Optional - Additional data from Zapier
}

/**
 * POST /api/booking/confirmed
 *
 * Confirms a booking and links it to a session
 * Matches via email address
 *
 * Requires X-Webhook-Secret header for authentication
 */
router.post('/confirmed', async (req, res) => {
  try {
    // Verify webhook secret
    const webhookSecret = process.env.BOOKING_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[Booking Webhook] BOOKING_WEBHOOK_SECRET not configured')
      return res.status(500).json({ error: 'Webhook not configured' })
    }

    const providedSecret = req.headers['x-webhook-secret']
    if (!providedSecret || providedSecret !== webhookSecret) {
      console.warn('[Booking Webhook] Invalid or missing webhook secret')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const {
      email,
      bookingId,
      bookingDate,
      bookingSystem,
      eventName,
      metadata,
    } = req.body as BookingConfirmation

    // Validate required fields
    if (!email) {
      return res.status(400).json({
        error: 'Email address is required',
        message: 'Please provide the email field in the webhook payload',
      })
    }

    console.log('[Booking Webhook] Received confirmation:', {
      email: maskEmail(email),
      bookingId,
      bookingSystem,
      eventName,
    })

    // Find the most recent session for this email
    const { data: sessions, error: searchError } = await supabase
      .from('advisor_sessions')
      .select('id, user_email, constraint_category, booking_clicked_endpoint, created_at')
      .eq('user_email', email)
      .not('constraint_category', 'is', null) // Only completed assessments
      .order('created_at', { ascending: false })
      .limit(5) // Check last 5 sessions in case of multiple

    if (searchError) {
      console.error('[Booking Webhook] Search error:', searchError)
      return res.status(500).json({ error: 'Database error' })
    }

    if (!sessions || sessions.length === 0) {
      console.warn('[Booking Webhook] No matching session found for email:', maskEmail(email))
      return res.status(404).json({
        error: 'No matching session found',
        message: `No completed assessment found for email: ${email}`,
        suggestion: 'User may have used a different email address',
      })
    }

    // Use the most recent session, or find one that clicked booking
    let targetSession = sessions.find((s) => s.booking_clicked_endpoint) || sessions[0]

    console.log('[Booking Webhook] Matched to session:', targetSession.id)

    // Update session with booking confirmation
    const { error: updateError } = await supabase
      .from('advisor_sessions')
      .update({
        call_booked_at: new Date().toISOString(),
        call_booked_confirmed: true,
        calendly_event_id: bookingId || null, // Generic field for any booking system ID
      })
      .eq('id', targetSession.id)

    if (updateError) {
      console.error('[Booking Webhook] Update error:', updateError)
      return res.status(500).json({ error: 'Failed to update session' })
    }

    // Log the booking event for analytics
    await supabase.from('funnel_events').insert({
      session_id: targetSession.id,
      event_type: 'call_booked',
      event_data: {
        booking_id: bookingId,
        booking_date: bookingDate,
        booking_system: bookingSystem,
        event_name: eventName,
        metadata,
      },
      created_at: new Date().toISOString(),
    })

    console.log('[Booking Webhook] ✅ Booking confirmed for session:', targetSession.id)

    // Fire server-side Meta Schedule event for ad attribution
    sendMetaEvent('Schedule', crypto.randomUUID(), {
      email,
      sourceUrl: 'https://advisor.coachmira.ai',
    })

    return res.json({
      success: true,
      message: 'Booking confirmed and linked to session',
      sessionId: targetSession.id,
      email: email,
    })
  } catch (error) {
    console.error('[Booking Webhook] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/booking/youcanbook
 *
 * YouCanBookMe direct webhook endpoint
 * No Zapier needed - configure webhook directly in YCBM
 *
 * YCBM Webhook Setup:
 * 1. Go to your booking page settings > Notifications
 * 2. Select "After a new booking made" trigger
 * 3. Add notification > Select "Webhook"
 * 4. URL: https://coachmiraadvisor.onrender.com/api/booking/youcanbook
 * 5. Method: POST
 * 6. Headers: Add header "X-Webhook-Secret" with your secret value
 * 7. Payload (JSON):
 *    {
 *      "email": "{EMAIL}",
 *      "firstName": "{FNAME}",
 *      "lastName": "{LNAME}",
 *      "bookingId": "{REF}",
 *      "bookingDate": "{START-ISO-8601}",
 *      "duration": "{DURATION}",
 *      "appointmentType": "{BOOKING-PAGE-TITLE}",
 *      "phone": "{PHONE}",
 *      "sessionId": "{FIELD:SESSIONID}"
 *    }
 *
 * IMPORTANT: To capture sessionId, create a custom field in YCBM:
 * 1. Go to Booking Form > Fields
 * 2. Add a hidden field with name "SESSIONID"
 * 3. Set "Pre-fill from URL parameter" to enabled
 * 4. The sessionId will be passed automatically from CoachMira booking links
 */
router.post('/youcanbook', async (req, res) => {
  try {
    // Verify webhook secret
    const webhookSecret = process.env.BOOKING_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[YCBM Webhook] BOOKING_WEBHOOK_SECRET not configured')
      return res.status(500).json({ error: 'Webhook not configured' })
    }

    const providedSecret = req.headers['x-webhook-secret']
    if (!providedSecret || providedSecret !== webhookSecret) {
      console.warn('[YCBM Webhook] Invalid or missing webhook secret')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const {
      email,
      firstName,
      lastName,
      bookingId,
      bookingDate,
      duration,
      appointmentType,
      phone,
      sessionId: ycbmSessionId, // Custom field from YCBM
    } = req.body

    // Validate required fields
    if (!email) {
      return res.status(400).json({
        error: 'Email address is required',
        message: 'Ensure {EMAIL} shorthand code is included in webhook payload',
      })
    }

    console.log('[YCBM Webhook] Received booking:', {
      email: maskEmail(email),
      bookingId,
      appointmentType,
      bookingDate,
      sessionId: ycbmSessionId,
    })

    // Time window for fallback name matching (7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    let sessions: any[] | null = null
    let matchedBy = 'none'

    // Priority 1: Match by sessionId (most reliable - passed via URL param)
    if (ycbmSessionId) {
      console.log('[YCBM Webhook] Trying sessionId match:', ycbmSessionId)
      const { data: sessionIdMatch, error: sessionIdError } = await supabase
        .from('advisor_sessions')
        .select('id, user_email, user_name, constraint_category, constraint_summary, conversation_state, booking_clicked_endpoint, created_at')
        .eq('id', ycbmSessionId)
        .limit(1)

      if (sessionIdError) {
        console.error('[YCBM Webhook] SessionId search error:', sessionIdError)
      } else if (sessionIdMatch && sessionIdMatch.length > 0) {
        sessions = sessionIdMatch
        matchedBy = 'sessionId'
        console.log('[YCBM Webhook] Matched by sessionId:', ycbmSessionId)

        // Update session with email if missing
        if (!sessionIdMatch[0].user_email && email) {
          await supabase
            .from('advisor_sessions')
            .update({ user_email: email })
            .eq('id', ycbmSessionId)
          console.log('[YCBM Webhook] Updated session with email from booking')
        }
      }
    }

    // Priority 2: Match by email (if sessionId didn't match)
    if (!sessions || sessions.length === 0) {
      const { data: emailSessions, error: emailSearchError } = await supabase
        .from('advisor_sessions')
        .select('id, user_email, user_name, constraint_category, constraint_summary, conversation_state, booking_clicked_endpoint, created_at')
        .eq('user_email', email)
        .not('constraint_category', 'is', null) // Only completed assessments
        .order('created_at', { ascending: false })
        .limit(5)

      if (emailSearchError) {
        console.error('[YCBM Webhook] Email search error:', emailSearchError)
        return res.status(500).json({ error: 'Database error' })
      }

      if (emailSessions && emailSessions.length > 0) {
        sessions = emailSessions
        matchedBy = 'email'
      }
    }

    // If no email match, try fallback: match by name within time window
    if ((!sessions || sessions.length === 0) && (firstName || lastName)) {
      console.log('[YCBM Webhook] No email match, trying name fallback...')

      // Build name to search for
      const bookerName = [firstName, lastName].filter(Boolean).join(' ').toLowerCase().trim()

      if (bookerName) {
        // Search for sessions with matching name (case-insensitive) in last 7 days
        const { data: nameSessions, error: nameSearchError } = await supabase
          .from('advisor_sessions')
          .select('id, user_email, user_name, constraint_category, constraint_summary, conversation_state, booking_clicked_endpoint, created_at')
          .not('constraint_category', 'is', null) // Only completed assessments
          .gte('created_at', sevenDaysAgo.toISOString()) // Within last 7 days
          .order('created_at', { ascending: false })
          .limit(20) // Get more to filter by name

        if (nameSearchError) {
          console.error('[YCBM Webhook] Name search error:', nameSearchError)
        } else if (nameSessions && nameSessions.length > 0) {
          // Filter by name match (case-insensitive, partial match)
          const nameMatches = nameSessions.filter((s: any) => {
            if (!s.user_name) return false
            const sessionName = s.user_name.toLowerCase().trim()
            // Match if names are equal, or if first name matches
            return sessionName === bookerName ||
                   sessionName.startsWith(firstName?.toLowerCase() || '') ||
                   bookerName.startsWith(sessionName)
          })

          if (nameMatches.length > 0) {
            sessions = nameMatches
            matchedBy = 'name'
            console.log('[YCBM Webhook] Found name match:', {
              bookerName,
              matchedSessionName: nameMatches[0].user_name,
              matchCount: nameMatches.length,
            })

            // Update the matched session with the email from the booking
            // This helps link future bookings
            const sessionToUpdate = nameMatches[0]
            if (!sessionToUpdate.user_email) {
              await supabase
                .from('advisor_sessions')
                .update({ user_email: email })
                .eq('id', sessionToUpdate.id)
              console.log('[YCBM Webhook] Updated session with email from booking')
            }
          }
        }
      }
    }

    if (!sessions || sessions.length === 0) {
      console.warn('[YCBM Webhook] No matching session found for:', { email: maskEmail(email) })
      // Still return 200 - the booking is valid, just not linked to a session
      // This handles cases where someone books without going through the advisor
      return res.json({
        success: true,
        matched: false,
        message: `No advisor session found for email: ${email} or name: ${firstName} ${lastName}`,
      })
    }

    console.log(`[YCBM Webhook] Matched by ${matchedBy}:`, sessions[0].id)

    // Use the most recent session, or find one that clicked booking
    const targetSession = sessions.find((s: any) => s.booking_clicked_endpoint) || sessions[0]

    console.log('[YCBM Webhook] Matched to session:', targetSession.id)

    // Update session with booking confirmation
    const { error: updateError } = await supabase
      .from('advisor_sessions')
      .update({
        call_booked_at: new Date().toISOString(),
        call_booked_confirmed: true,
        calendly_event_id: bookingId || null,
      })
      .eq('id', targetSession.id)

    if (updateError) {
      console.error('[YCBM Webhook] Update error:', updateError)
      return res.status(500).json({ error: 'Failed to update session' })
    }

    // Log the booking event for analytics
    await supabase.from('funnel_events').insert({
      session_id: targetSession.id,
      event_type: 'call_booked',
      event_data: {
        booking_id: bookingId,
        booking_date: bookingDate,
        booking_system: 'youcanbook.me',
        appointment_type: appointmentType,
        duration,
        booker_name: [firstName, lastName].filter(Boolean).join(' '),
        booker_phone: phone,
      },
      created_at: new Date().toISOString(),
    })

    console.log('[YCBM Webhook] ✅ Booking confirmed for session:', targetSession.id)

    // Fire server-side Meta Schedule event for ad attribution
    sendMetaEvent('Schedule', crypto.randomUUID(), {
      email,
      sourceUrl: 'https://advisor.coachmira.ai',
    })

    // Send notification to call taker (MIST or EC team based on constraint)
    if (targetSession.constraint_category && targetSession.user_email) {
      // Extract insights from conversation state if available
      const conversationState = targetSession.conversation_state as any
      const insights = conversationState?.learner_state?.insights_articulated || []

      // Generate full assessment report for the call taker
      let report
      try {
        report = await generateAssessmentReport(targetSession.id, {
          clarity: conversationState?.readiness?.clarity === 'high' ? 9 : conversationState?.readiness?.clarity === 'medium' ? 6 : 3,
          confidence: conversationState?.readiness?.confidence === 'high' ? 9 : conversationState?.readiness?.confidence === 'medium' ? 6 : 3,
          capacity: conversationState?.readiness?.capacity === 'high' ? 9 : conversationState?.readiness?.capacity === 'medium' ? 6 : 3,
        })
      } catch (e) {
        console.error('[YCBM Webhook] Failed to generate report for notification:', e)
      }

      const notificationResult = await sendCallTakerNotification({
        constraintCategory: targetSession.constraint_category,
        userName: targetSession.user_name || [firstName, lastName].filter(Boolean).join(' ') || 'Unknown',
        userEmail: targetSession.user_email,
        constraintSummary: targetSession.constraint_summary || 'No summary available',
        sessionId: targetSession.id,
        bookingDate,
        insights,
        report,
      })

      if (notificationResult.success) {
        console.log('[YCBM Webhook] Call taker notified:', notificationResult.sentTo)
        await logEmailEvent({
          resendEmailId: notificationResult.emailId,
          emailType: 'call_taker_notification',
          recipient: notificationResult.sentTo!,
          sessionId: targetSession.id,
        })
      } else {
        console.error('[YCBM Webhook] Failed to notify call taker:', notificationResult.error)
      }
    }

    return res.json({
      success: true,
      matched: true,
      message: 'Booking confirmed and linked to session',
      sessionId: targetSession.id,
    })
  } catch (error) {
    console.error('[YCBM Webhook] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/booking/test
 *
 * Test endpoint to verify webhook is working
 */
router.get('/test', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`
  res.json({
    status: 'ok',
    message: 'Booking webhook endpoint is active',
    endpoints: {
      youcanbook: 'POST /api/booking/youcanbook',
      generic: 'POST /api/booking/confirmed',
      test: 'GET /api/booking/test',
    },
    authentication: {
      header: 'X-Webhook-Secret',
      description: 'Must match BOOKING_WEBHOOK_SECRET env var',
    },
    youcanbook: {
      description: 'Direct YouCanBookMe webhook - no Zapier needed',
      url: `${baseUrl}/api/booking/youcanbook`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': '<your BOOKING_WEBHOOK_SECRET value>',
      },
      payload: {
        email: '{EMAIL}',
        firstName: '{FNAME}',
        lastName: '{LNAME}',
        bookingId: '{REF}',
        bookingDate: '{START-ISO-8601}',
        duration: '{DURATION}',
        appointmentType: '{BOOKING-PAGE-TITLE}',
        phone: '{PHONE}',
        sessionId: '{FIELD:SESSIONID}',
      },
      setup: [
        '1. Go to YCBM booking page settings > Notifications',
        '2. Select "After a new booking made" trigger',
        '3. Click + to add notification, select "Webhook"',
        '4. Enter URL and headers as shown above',
        '5. Paste the payload JSON with shorthand codes',
      ],
    },
    zapier: {
      description: 'Generic webhook for Zapier or other systems',
      url: `${baseUrl}/api/booking/confirmed`,
      requiredFields: ['email'],
      optionalFields: ['bookingId', 'bookingDate', 'bookingSystem', 'eventName', 'metadata'],
    },
  })
})

export default router
