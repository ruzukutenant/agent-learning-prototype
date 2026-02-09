/**
 * Daily error check cron job
 *
 * Checks for anomalies in the last 24 hours and only sends an email
 * if issues are found. Checks for:
 * - Unusually low completion rates
 * - Sessions stuck at high turn counts without resolution
 * - Failed CRM syncs
 * - Sessions that started but have zero messages (possible errors)
 * - Zero sessions (service may be down)
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

const ALERT_EMAIL = process.env.ALERT_EMAIL || 'abe@ruzuku.com'

async function checkForIssues(): Promise<string[]> {
  const issues: string[] = []
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Get sessions from last 24 hours
  const { data: sessions, error: sessionsError } = await supabase
    .from('advisor_sessions')
    .select('id, constraint_category, total_turns, email_sent, crm_synced, call_booked_confirmed, booking_clicked_at, created_at')
    .gte('created_at', yesterday)

  if (sessionsError) {
    issues.push(`Failed to query sessions: ${sessionsError.message}`)
    return issues
  }

  const totalSessions = sessions?.length || 0

  // No sessions at all could indicate the service is down or unreachable
  if (totalSessions === 0) {
    issues.push('Zero sessions in the last 24 hours — service may be down or no traffic')
    return issues
  }

  const completedSessions = sessions?.filter(s => s.constraint_category).length || 0
  const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0

  // Low completion rate (only flag if enough sessions to be meaningful)
  if (totalSessions >= 5 && completionRate < 50) {
    issues.push(`Low completion rate: ${completionRate.toFixed(1)}% (${completedSessions}/${totalSessions} sessions)`)
  }

  // Sessions stuck at high turn count without completing
  const highTurnSessions = sessions?.filter(s =>
    (s.total_turns || 0) >= 30 && !s.constraint_category
  ) || []
  if (highTurnSessions.length > 0) {
    issues.push(`${highTurnSessions.length} session(s) hit 30+ turns without completing: ${highTurnSessions.map(s => s.id).join(', ')}`)
  }

  // CRM sync failures
  const crmSyncFailures = sessions?.filter(s =>
    s.constraint_category && s.email_sent && s.crm_synced === false
  ) || []
  if (crmSyncFailures.length > 0) {
    issues.push(`${crmSyncFailures.length} completed session(s) failed CRM sync: ${crmSyncFailures.map(s => s.id).join(', ')}`)
  }

  // Hard bounces, complaints, failures, suppressions in last 24 hours
  const { data: bounces, error: bounceError } = await supabase
    .from('email_events')
    .select('id, recipient, email_type, status, bounce_reason')
    .in('status', ['bounced', 'complained', 'failed', 'suppressed'])
    .gte('updated_at', yesterday)

  if (!bounceError && bounces && bounces.length > 0) {
    const recipients = bounces.map(b => `${b.recipient} (${b.email_type} — ${b.status})`).join(', ')
    issues.push(`${bounces.length} email delivery issue(s): ${recipients}`)
  }

  // Undelivered emails (sent but not delivered after 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: undelivered, error: undeliveredError } = await supabase
    .from('email_events')
    .select('id, recipient, email_type')
    .eq('status', 'sent')
    .gte('created_at', yesterday)
    .lte('created_at', oneHourAgo)

  if (!undeliveredError && undelivered && undelivered.length > 0) {
    issues.push(`${undelivered.length} email(s) sent but not confirmed delivered (>1 hour old)`)
  }

  // Sessions with zero messages (created but possibly errored on first turn)
  const sessionIds = sessions?.map(s => s.id) || []
  if (sessionIds.length > 0) {
    const { data: messageCounts, error: msgError } = await supabase
      .from('advisor_messages')
      .select('session_id')
      .in('session_id', sessionIds)

    if (!msgError && messageCounts) {
      const sessionsWithMessages = new Set(messageCounts.map(m => m.session_id))
      const emptySessionIds = sessionIds.filter(id => !sessionsWithMessages.has(id))
      if (emptySessionIds.length > 0) {
        issues.push(`${emptySessionIds.length} session(s) have zero messages (possible errors): ${emptySessionIds.join(', ')}`)
      }
    }
  }

  return issues
}

async function sendAlert(issues: string[]) {
  const subject = `[CoachMira] ${issues.length} issue(s) detected`

  const html = `
    <div style="font-family: sans-serif; max-width: 600px;">
      <h2 style="color: #dc2626;">CoachMira Alert</h2>
      <p style="color: #666;">Issues detected in the last 24 hours:</p>
      <ul>
        ${issues.map(i => `<li style="margin-bottom: 8px;">${i}</li>`).join('')}
      </ul>
      <p style="margin-top: 20px;">
        <a href="https://advisor.coachmira.ai/admin" style="color: #2563eb;">Open Admin Dashboard</a>
      </p>
      <p style="color: #666; margin-top: 20px; font-size: 12px;">
        This alert is generated automatically by CoachMira Advisor.
      </p>
    </div>
  `

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Mira <mira@mail.coachmira.ai>',
      to: ALERT_EMAIL,
      subject,
      html
    })
    console.log(`[DailyCheck] Alert sent to ${ALERT_EMAIL}`)
  } catch (error) {
    console.error('[DailyCheck] Failed to send email:', error)
  }
}

async function main() {
  console.log('[DailyCheck] Starting daily error check...')

  try {
    const issues = await checkForIssues()

    if (issues.length > 0) {
      console.log(`[DailyCheck] ${issues.length} issue(s) found:`, issues)
      await sendAlert(issues)
    } else {
      console.log('[DailyCheck] No issues found, skipping email')
    }

    console.log('[DailyCheck] Complete')
  } catch (error) {
    console.error('[DailyCheck] Failed:', error)
    process.exit(1)
  }
}

main()
