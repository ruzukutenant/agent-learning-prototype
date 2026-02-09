/**
 * Cron job: idle session recovery + booking reminders
 *
 * Runs every 2 hours. Two responsibilities:
 * 1. Idle session recovery — sends resume emails to users who abandoned mid-session
 * 2. Booking reminders — nudges users who clicked "Book" but didn't complete booking
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { geminiJSON, isGeminiAvailable } from '../orchestrator/core/gemini-client.js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

const BASE_URL = process.env.BASE_URL || 'https://advisor.coachmira.ai'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  return `${local.substring(0, 2)}***@${domain}`
}

// ─── Idle Session Recovery ──────────────────────────────────────────────────

async function recoverIdleSessions(): Promise<number> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  // Find sessions that are idle and eligible for recovery
  const { data: candidates, error } = await supabase
    .from('advisor_sessions')
    .select('id, user_name, user_email, total_turns, current_phase, created_at, updated_at, constraint_category, surface_challenge, conversation_state')
    .not('user_email', 'is', null)
    .neq('current_phase', 'complete')
    .gte('total_turns', 3)
    .gte('created_at', fortyEightHoursAgo)
    .or('resume_email_sent.is.null,resume_email_sent.eq.false')

  if (error) {
    console.error('[CronCheck] Failed to query idle sessions:', error.message)
    return 0
  }

  if (!candidates || candidates.length === 0) {
    console.log('[CronCheck] No idle sessions found')
    return 0
  }

  // Filter by last message time > 30 minutes ago
  // We need to check the latest message for each candidate
  const sessionIds = candidates.map(s => s.id)
  const { data: latestMessages, error: msgError } = await supabase
    .from('advisor_messages')
    .select('session_id, created_at')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: false })

  if (msgError) {
    console.error('[CronCheck] Failed to query messages:', msgError.message)
    return 0
  }

  // Get the latest message time per session
  const lastMessageTime = new Map<string, string>()
  for (const msg of latestMessages || []) {
    if (!lastMessageTime.has(msg.session_id)) {
      lastMessageTime.set(msg.session_id, msg.created_at)
    }
  }

  // Filter: last message must be > 30 minutes ago
  const idleSessions = candidates.filter(s => {
    const lastMsg = lastMessageTime.get(s.id)
    if (!lastMsg) return false // no messages = not enough investment
    return lastMsg < thirtyMinutesAgo
  })

  if (idleSessions.length === 0) {
    console.log('[CronCheck] No idle sessions past 30-minute threshold')
    return 0
  }

  console.log(`[CronCheck] Found ${idleSessions.length} idle session(s) to recover`)

  let sent = 0
  const geminiAvailable = isGeminiAvailable()

  for (const session of idleSessions) {
    const resumeUrl = `${BASE_URL}/chat/${session.id}`
    const name = session.user_name || 'there'

    // Fetch recent messages for personalization
    let personalizedSubject: string | null = null
    let personalizedHook: string | null = null

    if (geminiAvailable) {
      try {
        const { data: recentMessages } = await supabase
          .from('advisor_messages')
          .select('speaker, message_text')
          .eq('session_id', session.id)
          .order('turn_number', { ascending: false })
          .limit(6)

        if (recentMessages && recentMessages.length > 0) {
          const messagesText = recentMessages
            .reverse()
            .map(m => `${m.speaker === 'user' ? 'User' : 'Mira'}: ${m.message_text}`)
            .join('\n')

          const personalization = await geminiJSON<{ subject: string; hook: string }>(
            `Given this conversation between a user and an AI business advisor, write a personalized follow-up email hook.

User name: ${name}
Conversation phase: ${session.current_phase || 'unknown'}
Recent messages:
${messagesText}

Return JSON:
{
  "subject": "short email subject line, personal and warm, under 50 chars",
  "hook": "1-2 sentences referencing what they were exploring, what insight was emerging, or what question was on the table. Write as Mira (the advisor). Be warm, specific, and make them want to come back."
}`,
            { maxTokens: 256 }
          )

          if (personalization.subject && personalization.hook) {
            personalizedSubject = personalization.subject
            personalizedHook = personalization.hook
            console.log(`[CronCheck] Gemini personalization generated for session ${session.id}`)
          }
        }
      } catch (err) {
        console.warn(`[CronCheck] Gemini personalization failed for session ${session.id}, using generic template:`, err)
      }
    }

    const subject = personalizedSubject || `Pick up where you left off, ${name}`
    const hook = personalizedHook || `We were making progress on understanding what's really holding your business back. I'd love to continue our conversation.`

    try {
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Mira <mira@mail.coachmira.ai>',
        replyTo: 'support@mirasee.com',
        to: session.user_email,
        subject,
        html: buildRecoveryEmailHtml(name, resumeUrl, hook),
        headers: {
          'List-Unsubscribe': '<mailto:support@mirasee.com?subject=Unsubscribe>',
        },
      })

      // Mark session so we don't re-send
      await supabase
        .from('advisor_sessions')
        .update({ resume_email_sent: true })
        .eq('id', session.id)

      // Log email event
      await supabase.from('email_events').insert({
        resend_email_id: result.data?.id || null,
        email_type: 'idle_recovery',
        recipient: session.user_email,
        session_id: session.id,
        status: 'sent',
        attempts: 1,
      })

      sent++
      console.log(`[CronCheck] Recovery email sent to ${maskEmail(session.user_email)} for session ${session.id}`)
    } catch (err) {
      console.error(`[CronCheck] Failed to send recovery email for session ${session.id}:`, err)
    }
  }

  return sent
}

/** Shared layout for cron emails (duplicated from resend.ts since this is a standalone script) */
function cronEmailLayout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(180deg, #FEF7F4 0%, #F8F5FC 100%); -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <tr>
            <td style="padding-bottom: 24px;">
              <span style="font-size: 26px; font-weight: 700; background: linear-gradient(135deg, #14B8A6, #8B5CF6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">CoachMira</span>
            </td>
          </tr>
          <tr>
            <td>
              <div style="height: 2px; background: linear-gradient(90deg, #14B8A6, #8B5CF6); border-radius: 1px; margin-bottom: 32px;"></div>
            </td>
          </tr>
          <tr>
            <td style="background: #ffffff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); padding: 36px 32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="text-align: center; padding-top: 28px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">
                Powered by <a href="https://mirasee.com" style="color: #9ca3af; text-decoration: none;">Mirasee</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #c4c8cf;">
                <a href="https://mirasee.com/privacy-policy/" style="color: #c4c8cf; text-decoration: none;">Privacy</a>
                &nbsp;&middot;&nbsp;
                <a href="https://mirasee.com/terms-conditions/" style="color: #c4c8cf; text-decoration: none;">Terms</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildRecoveryEmailHtml(userName: string, resumeUrl: string, hook: string): string {
  return cronEmailLayout('Resume Your Assessment', `
    <h1 style="margin: 0 0 16px; font-size: 26px; color: #111827;">Hi ${userName},</h1>
    <p style="margin: 0 0 16px; font-size: 16px; color: #4b5563; line-height: 1.6;">
      ${hook}
    </p>
    <p style="margin: 0 0 28px; font-size: 16px; color: #4b5563; line-height: 1.6;">
      Your conversation is saved — you can pick right back up where we left off.
    </p>
    <div style="text-align: center; margin-bottom: 28px;">
      <a href="${resumeUrl}" style="display: inline-block; padding: 16px 36px; background: linear-gradient(135deg, #14B8A6, #8B5CF6); color: white; text-decoration: none; font-weight: 600; border-radius: 50px; font-size: 16px; box-shadow: 0 4px 14px rgba(139,92,246,0.25);">
        Continue My Conversation
      </a>
    </div>
    <p style="margin: 0 0 20px; font-size: 14px; color: #6b7280; line-height: 1.5;">
      — Mira, your AI business advisor
    </p>
    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
      If you didn't start this conversation, you can safely ignore this email.
    </p>
  `)
}

// ─── Booking Reminder Emails ────────────────────────────────────────────────

async function sendBookingReminders(): Promise<number> {
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()

  const { data: candidates, error } = await supabase
    .from('advisor_sessions')
    .select('id, user_name, user_email, constraint_category, constraint_summary, booking_clicked_at, booking_clicked_endpoint')
    .not('booking_clicked_at', 'is', null)
    .not('user_email', 'is', null)
    .or('call_booked_confirmed.is.null,call_booked_confirmed.eq.false')
    .or('booking_reminder_sent.is.null,booking_reminder_sent.eq.false')
    .lt('booking_clicked_at', twelveHoursAgo)

  if (error) {
    console.error('[CronCheck] Failed to query booking reminder candidates:', error.message)
    return 0
  }

  if (!candidates || candidates.length === 0) {
    console.log('[CronCheck] No booking reminder candidates found')
    return 0
  }

  console.log(`[CronCheck] Found ${candidates.length} booking reminder candidate(s)`)

  let sent = 0
  for (const session of candidates) {
    // Check for hard bounces
    const { data: bounces } = await supabase
      .from('email_events')
      .select('id')
      .eq('recipient', session.user_email)
      .in('status', ['bounced', 'complained', 'suppressed'])
      .limit(1)

    if ((bounces?.length ?? 0) > 0) {
      console.log(`[CronCheck] Skipping booking reminder to ${maskEmail(session.user_email)} — prior hard bounce`)
      continue
    }

    const constraint = session.constraint_category?.toUpperCase()
    const bookingLink = constraint === 'EXECUTION'
      ? (process.env.VITE_MIST_BOOKING_LINK || 'https://cma-mist.youcanbook.me')
      : (process.env.VITE_EC_BOOKING_LINK || 'https://cma-ec.youcanbook.me')

    const name = session.user_name || 'there'

    try {
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Mira <mira@mail.coachmira.ai>',
        replyTo: 'support@mirasee.com',
        to: session.user_email,
        subject: `Still thinking it over, ${name}?`,
        html: buildBookingReminderHtml(name, constraint, bookingLink),
        headers: {
          'List-Unsubscribe': '<mailto:support@mirasee.com?subject=Unsubscribe>',
        },
      })

      await supabase
        .from('advisor_sessions')
        .update({ booking_reminder_sent: true })
        .eq('id', session.id)

      await supabase.from('email_events').insert({
        resend_email_id: result.data?.id || null,
        email_type: 'booking_reminder',
        recipient: session.user_email,
        session_id: session.id,
        status: 'sent',
        attempts: 1,
      })

      sent++
      console.log(`[CronCheck] Booking reminder sent to ${maskEmail(session.user_email)} for session ${session.id}`)
    } catch (err) {
      console.error(`[CronCheck] Failed to send booking reminder for session ${session.id}:`, err)
    }
  }

  return sent
}

function buildBookingReminderHtml(userName: string, constraint: string | undefined, bookingLink: string): string {
  let constraintPhrase: string
  let benefitPhrase: string

  switch (constraint) {
    case 'EXECUTION':
      constraintPhrase = 'building the systems to scale your business'
      benefitPhrase = 'putting the right structure in place so you can grow without burning out'
      break
    case 'PSYCHOLOGY':
      constraintPhrase = 'moving past the blocks holding you back'
      benefitPhrase = 'breaking through what\'s been keeping you stuck so you can take action with confidence'
      break
    case 'STRATEGY':
    default:
      constraintPhrase = 'finding clarity on your direction'
      benefitPhrase = 'getting clear on your next move so you can move forward with focus'
      break
  }

  return cronEmailLayout('Book Your Call', `
    <h1 style="margin: 0 0 16px; font-size: 26px; color: #111827;">Hi ${userName},</h1>
    <p style="margin: 0 0 16px; font-size: 16px; color: #4b5563; line-height: 1.6;">
      I wanted to check in — after our conversation about ${constraintPhrase}, I think you'd really benefit from connecting with someone who can help you take the next step.
    </p>
    <p style="margin: 0 0 28px; font-size: 16px; color: #4b5563; line-height: 1.6;">
      The call is free, and it's a chance to get personalized guidance on ${benefitPhrase}.
    </p>
    <div style="text-align: center; margin-bottom: 28px;">
      <a href="${bookingLink}" style="display: inline-block; padding: 16px 36px; background: linear-gradient(135deg, #14B8A6, #8B5CF6); color: white; text-decoration: none; font-weight: 600; border-radius: 50px; font-size: 16px; box-shadow: 0 4px 14px rgba(139,92,246,0.25);">
        Book Your Free Call
      </a>
    </div>
    <p style="margin: 0 0 20px; font-size: 14px; color: #6b7280; line-height: 1.5;">
      — Mira
    </p>
    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
      If this isn't relevant anymore, you can safely ignore this email.
    </p>
  `)
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('[CronCheck] Starting combined cron check...')

  try {
    // 1. Idle session recovery
    const recovered = await recoverIdleSessions()
    console.log(`[CronCheck] Sent ${recovered} recovery email(s)`)

    // 2. Booking reminder emails
    const reminders = await sendBookingReminders()
    console.log(`[CronCheck] Sent ${reminders} booking reminder(s)`)

    console.log('[CronCheck] Complete')
  } catch (error) {
    console.error('[CronCheck] Failed:', error)
    process.exit(1)
  }
}

main()
