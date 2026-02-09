// Reusable summary email send logic
// Extracted from routes/email.ts so it can be called from both the API route and the orchestrator

import { supabase } from '../../config/supabase.js'
import { sendSummaryEmail } from './resend.js'
import { logEmailEvent } from './retry.js'
import { generateAssessmentReport } from '../ai/reportGenerator.js'
import { sendToOntraport, splitName } from '../crm/ontraport.js'

interface SendSummaryResult {
  success: boolean
  error?: string
  crmSynced?: boolean
}

/**
 * Send summary email for a completed session.
 * Handles: report generation, email send, event logging, CRM sync, session update.
 *
 * Can be called from:
 * - POST /api/email/send-summary (user clicks "Send My Summary")
 * - orchestratorService (auto-send when session completes with email on file)
 */
export async function sendSessionSummaryEmail(sessionId: string): Promise<SendSummaryResult> {
  // Fetch session
  const { data: session, error: fetchError } = await supabase
    .from('advisor_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (fetchError || !session) {
    return { success: false, error: 'Session not found' }
  }

  if (!session.user_email) {
    return { success: false, error: 'Session has no email address' }
  }

  if (!session.constraint_category) {
    return { success: false, error: 'Session incomplete - no constraint identified' }
  }

  if (session.email_sent) {
    // Already sent — not an error, just a no-op
    return { success: true }
  }

  // Determine booking link based on constraint type
  const isMIST = session.constraint_category === 'execution'
  const bookingLink = isMIST
    ? (process.env.MIST_BOOKING_LINK || process.env.VITE_MIST_BOOKING_LINK || '')
    : (process.env.EC_BOOKING_LINK || process.env.VITE_EC_BOOKING_LINK || '')

  // Extract blockers from conversation state if present
  const conversationState = session.conversation_state as any
  const identifiedBlockers = conversationState?.readiness_check?.identified_blockers || []

  // Generate AI report from conversation
  let report
  try {
    console.log('[SendSummary] Generating AI assessment report...')
    report = await generateAssessmentReport(sessionId, {
      clarity: session.clarity_score,
      confidence: session.confidence_score,
      capacity: session.capacity_score,
    })
    console.log('[SendSummary] Report generated successfully')
  } catch (error) {
    console.error('[SendSummary] Failed to generate report:', error)
    // Continue without report - email will fall back to basic template
  }

  // Send email
  const emailResult = await sendSummaryEmail({
    to: session.user_email,
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

  if (!emailResult.success) {
    return { success: false, error: emailResult.error || 'Failed to send email' }
  }

  // Log to email_events
  await logEmailEvent({
    resendEmailId: emailResult.emailId,
    emailType: 'summary',
    recipient: session.user_email,
    sessionId,
    attempts: emailResult.attempts,
  })

  // Sync lead to Ontraport CRM
  const { firstName, lastName } = splitName(session.user_name || 'Friend')
  const crmResult = await sendToOntraport({
    email: session.user_email,
    firstName,
    lastName,
    constraintCategory: session.constraint_category,
    constraintSummary: session.constraint_summary || 'Constraint identified.',
    clarityScore: session.clarity_score,
    confidenceScore: session.confidence_score,
    capacityScore: session.capacity_score,
    sessionId: session.id,
    recommendedPath: isMIST ? 'MIST' : 'EC',
    identifiedBlockers,
    completedAt: new Date().toISOString(),
  })

  if (!crmResult.success) {
    console.error('[SendSummary] CRM sync failed:', crmResult.error)
  } else {
    console.log('[SendSummary] Lead synced to Ontraport:', crmResult.contactId)
  }

  // Update session
  const { error: updateError } = await supabase
    .from('advisor_sessions')
    .update({
      email_sent: true,
      email_sent_at: new Date().toISOString(),
      crm_synced: crmResult.success,
      crm_synced_at: crmResult.success ? new Date().toISOString() : null,
      crm_contact_id: crmResult.contactId || null,
    })
    .eq('id', sessionId)

  if (updateError) {
    console.error('[SendSummary] Failed to update session after email send:', updateError)
  }

  return { success: true, crmSynced: crmResult.success }
}
