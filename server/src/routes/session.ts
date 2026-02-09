import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { createSession, getSession, updateSession } from '../services/session.js'
import { sendMetaEvent } from '../services/meta-conversions.js'
import { supabase } from '../config/supabase.js'
import { SESSION_MAX_AGE_DAYS } from '../config/constants.js'
import { sendResumeEmail } from '../services/email/resend.js'
import { logEmailEvent } from '../services/email/retry.js'

const router = Router()

const sessionCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many sessions created, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Email validation - requires local part, @, domain, and TLD
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

// POST /api/sessions - Create new session
router.post('/', sessionCreateLimiter, async (req, res) => {
  try {
    const { userName } = req.body

    if (!userName || userName.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' })
    }

    const session = await createSession({ userName: userName.trim() })
    res.status(201).json({ session })
  } catch (error) {
    console.error('Error creating session:', error)
    res.status(500).json({ error: 'Failed to create session' })
  }
})

// GET /api/sessions/:id - Get session by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const session = await getSession(id)

    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Check session age — expired sessions require email verification to resume
    const ageMs = Date.now() - new Date(session.created_at).getTime()
    const ageDays = ageMs / (1000 * 60 * 60 * 24)
    if (ageDays > SESSION_MAX_AGE_DAYS) {
      return res.status(410).json({
        error: 'Session expired',
        message: 'This session is no longer directly accessible. Enter your email to receive a fresh link.',
        expired: true,
      })
    }

    res.json({ session: publicSession(session) })
  } catch (error) {
    console.error('Error getting session:', error)
    res.status(500).json({ error: 'Failed to get session' })
  }
})

// Helper to strip internal fields from session response
function publicSession(session: any) {
  const { conversation_state, ...rest } = session
  return rest
}

// PATCH /api/sessions/:id - Update session
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Check session expiration
    const existing = await getSession(id)
    if (!existing) {
      return res.status(404).json({ error: 'Session not found' })
    }
    const ageDays = (Date.now() - new Date(existing.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (ageDays > SESSION_MAX_AGE_DAYS) {
      return res.status(410).json({ error: 'Session expired', expired: true })
    }

    const { meta_fbp, meta_fbc, meta_event_id, ...updates } = req.body

    // Validate email if being updated
    if (updates.user_email !== undefined) {
      if (!updates.user_email || typeof updates.user_email !== 'string') {
        return res.status(400).json({ error: 'Email is required' })
      }

      const email = updates.user_email.trim()
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email address' })
      }

      // Use trimmed email
      updates.user_email = email

      // Fire server-side Lead event (deduped with client via shared event_id)
      if (meta_event_id) {
        sendMetaEvent('Lead', meta_event_id, {
          email: updates.user_email,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          fbp: meta_fbp,
          fbc: meta_fbc,
          sourceUrl: 'https://advisor.coachmira.ai',
        })
      }
    }

    const session = await updateSession(id, updates)
    res.json({ session: publicSession(session) })
  } catch (error) {
    console.error('Error updating session:', error)
    res.status(500).json({ error: 'Failed to update session' })
  }
})

// POST /api/sessions/request-resume - Send resume link by email (for expired sessions)
const resumeRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/request-resume', resumeRequestLimiter, async (req, res) => {
  try {
    const { email } = req.body

    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email address required' })
    }

    // Find the most recent session for this email
    const { data: sessions, error: searchError } = await supabase
      .from('advisor_sessions')
      .select('id, user_name, user_email')
      .eq('user_email', email.trim())
      .order('created_at', { ascending: false })
      .limit(1)

    if (searchError) {
      console.error('Error searching sessions by email:', searchError)
      return res.status(500).json({ error: 'Internal server error' })
    }

    // Always return success to avoid email enumeration
    if (!sessions || sessions.length === 0) {
      return res.json({ success: true, message: 'If we have a session on file, you will receive an email shortly.' })
    }

    const session = sessions[0]
    const baseUrl = (process.env.CLIENT_URL || 'https://advisor.coachmira.ai').replace(/\/$/, '')
    const resumeUrl = `${baseUrl}/chat/${session.id}`

    const emailResult = await sendResumeEmail({
      to: session.user_email,
      userName: session.user_name || 'there',
      resumeUrl,
    })

    if (emailResult.success) {
      await logEmailEvent({
        resendEmailId: emailResult.emailId,
        emailType: 'resume_request',
        recipient: session.user_email,
        sessionId: session.id,
        attempts: emailResult.attempts,
      })
    }

    return res.json({ success: true, message: 'If we have a session on file, you will receive an email shortly.' })
  } catch (error) {
    console.error('Error processing resume request:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
