import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { supabase } from '../config/supabase.js'
import { sendResumeEmail, sendReminderEmail } from '../services/email/resend.js'
import { logEmailEvent } from '../services/email/retry.js'
import { sendSessionSummaryEmail } from '../services/email/send-summary.js'

const router = Router()

const emailLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/send-summary', emailLimiter, async (req, res) => {
  try {
    const { sessionId } = req.body

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' })
    }

    // Verify session exists and has an email before sending
    const { data: session, error: fetchError } = await supabase
      .from('advisor_sessions')
      .select('id, email_sent')
      .eq('id', sessionId)
      .single()

    if (fetchError || !session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    if (session.email_sent) {
      return res.status(409).json({ error: 'Summary email already sent for this session' })
    }

    const result = await sendSessionSummaryEmail(sessionId)

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to send email' })
    }

    return res.json({ success: true, crmSynced: result.crmSynced })
  } catch (error) {
    console.error('Email send error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/send-resume', emailLimiter, async (req, res) => {
  try {
    const { sessionId } = req.body

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' })
    }

    // Fetch session
    const { data: session, error: fetchError } = await supabase
      .from('advisor_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (fetchError || !session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Validate session has email
    if (!session.user_email) {
      return res.status(400).json({ error: 'Session has no email address' })
    }

    // Generate resume URL (frontend will handle session loading via sessionStorage)
    // Remove trailing slash from CLIENT_URL if present to avoid double slashes
    const baseUrl = (process.env.CLIENT_URL || 'https://advisor.coachmira.ai').replace(/\/$/, '')
    const resumeUrl = `${baseUrl}/chat/${sessionId}`

    // Send email
    const emailResult = await sendResumeEmail({
      to: session.user_email,
      userName: session.user_name || 'there',
      resumeUrl,
    })

    if (!emailResult.success) {
      return res.status(500).json({ error: emailResult.error || 'Failed to send email' })
    }

    await logEmailEvent({
      resendEmailId: emailResult.emailId,
      emailType: 'resume',
      recipient: session.user_email,
      sessionId: sessionId,
      attempts: emailResult.attempts,
    })

    return res.json({ success: true })
  } catch (error) {
    console.error('Resume email send error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/send-reminder', emailLimiter, async (req, res) => {
  try {
    const { email } = req.body

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email required' })
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' })
    }

    const result = await sendReminderEmail({ to: email })

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to send reminder' })
    }

    await logEmailEvent({
      resendEmailId: result.emailId,
      emailType: 'reminder',
      recipient: email,
    })

    return res.json({ success: true })
  } catch (error) {
    console.error('Reminder email error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
