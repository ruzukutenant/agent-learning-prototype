import { Resend } from 'resend'
import dotenv from 'dotenv'
import { sendWithRetry, hasHardBounce } from './retry.js'

dotenv.config({ path: '../.env' })

const resend = new Resend(process.env.RESEND_API_KEY)

interface ReportSections {
  opportunityStatement?: string
  situationOverview: string
  keyInsights: string[]
  primaryConstraint: string
  readinessAssessment: string
  recommendedNextSteps: string[]
}

// ─── Shared Email Design System ─────────────────────────────────────────────

/** Convert markdown bold to HTML strong */
const md = (text: string) => text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

/** Convert multi-paragraph text to HTML with proper spacing */
const paragraphs = (text: string, style: string = 'margin: 0 0 16px; font-size: 15px; color: #4b5563; line-height: 1.7;') => {
  const paras = text.split(/\n\n+/).filter(p => p.trim())
  return paras.map((p, i) => {
    const isLast = i === paras.length - 1
    const paraStyle = isLast ? style.replace(/margin: 0 0 \d+px;/, 'margin: 0;') : style
    return `<p style="${paraStyle}">${md(p.trim())}</p>`
  }).join('')
}

/** Format readiness assessment as emoji-bulleted list with bold labels */
const formatReadiness = (text: string) => {
  const paras = text.split(/\n\n+/).filter(p => p.trim())

  return paras.map((p, i) => {
    const trimmed = p.trim()
    // Check if this is an emoji-prefixed line (✓ or ⚠️)
    const emojiMatch = trimmed.match(/^([✓⚠️]+)\s*([^:]+):\s*(.+)$/s)

    if (emojiMatch) {
      const [, emoji, label, content] = emojiMatch
      // Emoji-prefixed item: indent with emoji as bullet, bold label
      return `
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <span style="flex-shrink: 0; font-size: 16px; line-height: 1.7;">${emoji}</span>
          <p style="margin: 0; font-size: 15px; color: #4b5563; line-height: 1.7;">
            <strong style="color: #111827;">${label.trim()}:</strong> ${md(content.trim())}
          </p>
        </div>`
    } else {
      // Regular paragraph (summary) - no indent
      const isLast = i === paras.length - 1
      return `<p style="margin: ${isLast ? '0' : '0 0 16px'}; font-size: 15px; color: #4b5563; line-height: 1.7;">${md(trimmed)}</p>`
    }
  }).join('')
}

/** Gradient CTA button */
function emailButton(href: string, text: string, style?: 'white' | 'gradient'): string {
  if (style === 'white') {
    return `<a href="${href}" style="display: inline-block; padding: 16px 40px; background: white; color: #7C3AED; text-decoration: none; font-weight: 700; border-radius: 50px; font-size: 16px; box-shadow: 0 4px 14px rgba(0,0,0,0.15);">${text}</a>`
  }
  return `<a href="${href}" style="display: inline-block; padding: 16px 36px; background: linear-gradient(135deg, #14B8A6, #8B5CF6); color: white; text-decoration: none; font-weight: 600; border-radius: 50px; font-size: 16px; box-shadow: 0 4px 14px rgba(139,92,246,0.25);">${text}</a>`
}

/** Thin gradient accent divider */
function emailDivider(): string {
  return `<div style="height: 2px; background: linear-gradient(90deg, #14B8A6, #8B5CF6); border-radius: 1px; margin: 24px 0;"></div>`
}

/** Unified email layout shell */
function emailLayout(title: string, content: string): string {
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
          <!-- Header -->
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
          <!-- Content Card -->
          <tr>
            <td style="background: #ffffff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); padding: 36px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
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

// ─── Email Templates ────────────────────────────────────────────────────────

export async function sendSummaryEmail(params: {
  to: string
  userName: string
  constraintCategory: string
  constraintSummary: string
  clarityScore: number | null
  confidenceScore: number | null
  capacityScore: number | null
  bookingLink?: string
  report?: ReportSections
  identifiedBlockers?: string[]
}): Promise<{ success: boolean; error?: string; emailId?: string; attempts?: number }> {
  try {
    if (await hasHardBounce(params.to)) {
      console.warn(`[Email] Skipping summary email to ${params.to} — prior hard bounce`)
      return { success: false, error: 'Recipient has prior hard bounce' }
    }

    const html = buildEmailTemplate(params)

    const result = await sendWithRetry('summary', () =>
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Mira <mira@mail.coachmira.ai>',
        replyTo: 'support@mirasee.com',
        to: params.to,
        subject: `Your Strategic Assessment Results, ${params.userName}`,
        html,
      })
    )

    if (result.error) {
      console.error('Resend error:', result.error)
      return { success: false, error: result.error.message, attempts: result.attempts }
    }

    return { success: true, emailId: result.data?.id, attempts: result.attempts }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

export async function sendResumeEmail(params: {
  to: string
  userName: string
  resumeUrl: string
}): Promise<{ success: boolean; error?: string; emailId?: string; attempts?: number }> {
  try {
    if (await hasHardBounce(params.to)) {
      console.warn(`[Email] Skipping resume email to ${params.to} — prior hard bounce`)
      return { success: false, error: 'Recipient has prior hard bounce' }
    }

    const html = buildResumeEmailTemplate(params)

    const result = await sendWithRetry('resume', () =>
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Mira <mira@mail.coachmira.ai>',
        replyTo: 'support@mirasee.com',
        to: params.to,
        subject: `Resume Your Assessment - ${params.userName}`,
        html,
        headers: {
          'List-Unsubscribe': '<mailto:support@mirasee.com?subject=Unsubscribe>',
        },
      })
    )

    if (result.error) {
      console.error('Resend error:', result.error)
      return { success: false, error: result.error.message, attempts: result.attempts }
    }

    return { success: true, emailId: result.data?.id, attempts: result.attempts }
  } catch (error) {
    console.error('Resume email send error:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

/**
 * Send notification to call taker when someone books a call
 */
export async function sendCallTakerNotification(params: {
  constraintCategory: string
  userName: string
  userEmail: string
  constraintSummary: string
  sessionId: string
  bookingDate?: string
  insights?: string[]
  report?: ReportSections
}): Promise<{ success: boolean; error?: string; sentTo?: string; emailId?: string }> {
  try {
    const isMIST = params.constraintCategory === 'execution'
    const recipientEmail = isMIST ? 'mist@mirasee.com' : 'titia@mirasee.com'
    const callType = isMIST ? 'MIST Implementation' : 'Strategy'

    const baseUrl = (process.env.CLIENT_URL || 'https://advisor.coachmira.ai').replace(/\/+$/, '')
    const adminUrl = `${baseUrl}/admin/sessions/${params.sessionId}`

    const infoRows = `
      <tr>
        <td style="padding: 10px 16px; color: #6b7280; font-size: 14px; border-bottom: 1px solid #f3f4f6; width: 120px;">Name</td>
        <td style="padding: 10px 16px; color: #111827; font-size: 14px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${params.userName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #6b7280; font-size: 14px; border-bottom: 1px solid #f3f4f6;">Email</td>
        <td style="padding: 10px 16px; font-size: 14px; border-bottom: 1px solid #f3f4f6;">
          <a href="mailto:${params.userEmail}" style="color: #7C3AED; text-decoration: none;">${params.userEmail}</a>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #6b7280; font-size: 14px; border-bottom: 1px solid #f3f4f6;">Constraint</td>
        <td style="padding: 10px 16px; color: #111827; font-size: 14px; text-transform: capitalize; border-bottom: 1px solid #f3f4f6;">${params.constraintCategory}</td>
      </tr>
      ${params.bookingDate ? `
      <tr>
        <td style="padding: 10px 16px; color: #6b7280; font-size: 14px;">Call Date</td>
        <td style="padding: 10px 16px; color: #111827; font-size: 14px;">${new Date(params.bookingDate).toLocaleString()}</td>
      </tr>
      ` : ''}
    `

    const insightsSection = params.insights && params.insights.length > 0 ? `
      ${emailDivider()}
      <div style="background: #FFFBEB; border-radius: 12px; padding: 20px; border-left: 4px solid #F59E0B;">
        <h3 style="margin: 0 0 12px; font-size: 15px; color: #92400e; font-weight: 600;">Key Insights from Conversation</h3>
        <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.6;">
          ${params.insights.map(i => `<li style="margin-bottom: 6px;">${i}</li>`).join('')}
        </ul>
      </div>
    ` : ''

    const reportSection = params.report ? `
      ${emailDivider()}
      <h3 style="margin: 0 0 20px; font-size: 16px; color: #111827; font-weight: 600;">Full Assessment Summary</h3>

      <div style="border-left: 2px solid #14B8A6; padding-left: 12px; margin-bottom: 16px;">
        <h4 style="margin: 0 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #14B8A6;">Current Situation</h4>
        <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">${params.report.situationOverview}</p>
      </div>

      <div style="border-left: 2px solid #8B5CF6; padding-left: 12px; margin-bottom: 16px;">
        <h4 style="margin: 0 0 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #8B5CF6;">Key Insights</h4>
        <ul style="margin: 0; padding-left: 16px; font-size: 14px; color: #4b5563; line-height: 1.6;">
          ${params.report.keyInsights.map(i => `<li style="margin-bottom: 4px;">${i}</li>`).join('')}
        </ul>
      </div>

      <div style="border-left: 2px solid #F59E0B; padding-left: 12px; margin-bottom: 16px;">
        <h4 style="margin: 0 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #F59E0B;">Primary Constraint</h4>
        <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">${params.report.primaryConstraint}</p>
      </div>

      <div style="border-left: 2px solid #14B8A6; padding-left: 12px; margin-bottom: 16px;">
        <h4 style="margin: 0 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #14B8A6;">Readiness Assessment</h4>
        <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">${params.report.readinessAssessment}</p>
      </div>

      <div style="border-left: 2px solid #8B5CF6; padding-left: 12px;">
        <h4 style="margin: 0 0 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #8B5CF6;">Recommended Next Steps</h4>
        <ul style="margin: 0; padding-left: 16px; font-size: 14px; color: #4b5563; line-height: 1.6;">
          ${params.report.recommendedNextSteps.map(s => `<li style="margin-bottom: 4px;">${s}</li>`).join('')}
        </ul>
      </div>
    ` : ''

    const content = `
      <h1 style="margin: 0 0 20px; font-size: 22px; color: #111827;">New ${callType} Call Booked</h1>

      <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 12px; margin-bottom: 20px;">
        ${infoRows}
      </table>

      <div style="background: #f3f4f6; border-radius: 12px; padding: 20px;">
        <h3 style="margin: 0 0 10px; font-size: 15px; color: #374151; font-weight: 600;">Assessment Summary</h3>
        <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">${params.constraintSummary}</p>
      </div>

      ${insightsSection}
      ${reportSection}

      ${emailDivider()}
      <div style="text-align: center;">
        <a href="${adminUrl}" style="display: inline-block; padding: 14px 32px; background: #7C3AED; color: white; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 15px;">
          View Full Transcript
        </a>
      </div>
    `

    const html = emailLayout(`New ${callType} Call Booked`, content)

    const result = await sendWithRetry('call_taker_notification', () =>
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Mira <mira@mail.coachmira.ai>',
        to: recipientEmail,
        subject: `[CoachMira] New ${callType} Call: ${params.userName}`,
        html,
      })
    )

    if (result.error) {
      console.error('[Call Taker Notification] Resend error:', result.error)
      return { success: false, error: result.error.message }
    }

    console.log(`[Call Taker Notification] Sent to ${recipientEmail} for ${params.userName}`)
    return { success: true, sentTo: recipientEmail, emailId: result.data?.id }
  } catch (error) {
    console.error('[Call Taker Notification] Error:', error)
    return { success: false, error: 'Failed to send notification' }
  }
}

export async function sendReminderEmail(params: {
  to: string
}): Promise<{ success: boolean; error?: string; emailId?: string }> {
  try {
    if (await hasHardBounce(params.to)) {
      console.warn(`[Email] Skipping reminder email to ${params.to} — prior hard bounce`)
      return { success: false, error: 'Recipient has prior hard bounce' }
    }

    const landingUrl = (process.env.CLIENT_URL || 'https://advisor.coachmira.ai').replace(/\/+$/, '')

    const content = `
      <h1 style="margin: 0 0 16px; font-size: 26px; color: #111827;">Come Back When You're Ready</h1>
      <p style="margin: 0 0 16px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        You signed up for a reminder about the CoachMira Advisor assessment. Whenever the timing feels right, you can start your free 10-minute strategic assessment.
      </p>
      <p style="margin: 0 0 28px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        It's a guided conversation that helps you identify the one constraint holding your business back.
      </p>
      <div style="text-align: center; margin-bottom: 8px;">
        ${emailButton(landingUrl, 'Start My Free Assessment')}
      </div>
    `

    const html = emailLayout('Your Assessment is Waiting', content)

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Mira <mira@mail.coachmira.ai>',
      replyTo: 'support@mirasee.com',
      to: params.to,
      subject: 'Your CoachMira Assessment is Waiting',
      html,
      headers: {
        'List-Unsubscribe': '<mailto:support@mirasee.com?subject=Unsubscribe>',
      },
    })

    if (error) {
      console.error('Resend reminder error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, emailId: data?.id }
  } catch (error) {
    console.error('Reminder email send error:', error)
    return { success: false, error: 'Failed to send reminder email' }
  }
}

function buildResumeEmailTemplate(params: {
  userName: string
  resumeUrl: string
}): string {
  const content = `
    <h1 style="margin: 0 0 16px; font-size: 26px; color: #111827;">
      Your Progress is Saved, ${params.userName}
    </h1>
    <p style="margin: 0 0 16px; font-size: 16px; color: #4b5563; line-height: 1.6;">
      We've saved your assessment progress. You can pick up right where you left off anytime.
    </p>
    <p style="margin: 0 0 28px; font-size: 16px; color: #4b5563; line-height: 1.6;">
      Simply click the link below to continue your strategic assessment whenever you're ready.
    </p>

    <div style="text-align: center; margin-bottom: 24px;">
      ${emailButton(params.resumeUrl, 'Resume My Assessment')}
    </div>

    <p style="margin: 0 0 28px; font-size: 13px; color: #9ca3af; text-align: center;">
      Or copy and paste this link:<br/>
      <a href="${params.resumeUrl}" style="color: #7C3AED; text-decoration: none; word-break: break-all;">${params.resumeUrl}</a>
    </p>

    ${emailDivider()}

    <div style="background: #F0FDFA; border-radius: 12px; padding: 20px; border-left: 4px solid #14B8A6;">
      <h3 style="margin: 0 0 6px; font-size: 15px; color: #0F766E; font-weight: 600;">Need help?</h3>
      <p style="margin: 0; font-size: 14px; color: #115E59; line-height: 1.5;">
        Just hit reply — we're happy to help you get back on track.
      </p>
    </div>
  `

  return emailLayout('Resume Your Assessment', content)
}

export function buildEmailTemplate(params: {
  userName: string
  constraintCategory: string
  constraintSummary: string
  clarityScore: number | null
  confidenceScore: number | null
  capacityScore: number | null
  bookingLink?: string
  report?: ReportSections
  identifiedBlockers?: string[]
}): string {
  const constraintColors: Record<string, string> = {
    strategy: '#8B5CF6',
    execution: '#ea580c',
    energy: '#059669',
  }

  const color = constraintColors[params.constraintCategory] || '#8B5CF6'

  const isMIST = params.constraintCategory === 'execution'
  const ctaTitle = isMIST ? 'Ready to Get It Built?' : 'Ready to Break Through?'
  const ctaDescription = isMIST
    ? 'Our MIST team specializes in building the systems, funnels, and infrastructure you need. Book a call to explore implementation support.'
    : 'Let\'s turn these insights into action. Book a strategy session to build your breakthrough plan.'
  const ctaButtonText = isMIST ? 'Book Your Implementation Call' : 'Book Your Strategy Session'

  const reportContent = params.report ? `
    <!-- Report Sections — clean typography, generous spacing -->

    <!-- Current Situation -->
    <div style="margin-bottom: 36px;">
      <h2 style="margin: 0 0 14px; font-size: 17px; font-weight: 600; color: #111827;">
        Your Current Situation
      </h2>
      ${paragraphs(params.report.situationOverview)}
    </div>

    <!-- Key Insights -->
    <div style="margin-bottom: 36px;">
      <h2 style="margin: 0 0 16px; font-size: 17px; font-weight: 600; color: #111827;">
        Key Insights
      </h2>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
        ${params.report.keyInsights.map(insight =>
          `<li style="margin-bottom: 14px; font-size: 15px; line-height: 1.7;">${md(insight)}</li>`
        ).join('')}
      </ul>
    </div>

    <!-- What's Holding You Back — highlighted as the key finding -->
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%); border-radius: 12px; padding: 24px; margin-bottom: 36px;">
      <div style="margin-bottom: 16px;">
        <span style="display: inline-block; padding: 4px 12px; background: ${color}; color: white; border-radius: 50px; font-size: 12px; font-weight: 600; text-transform: capitalize;">${params.constraintCategory}</span>
      </div>
      <h2 style="margin: 0 0 14px; font-size: 17px; font-weight: 600; color: #111827;">
        What's Holding You Back
      </h2>
      ${paragraphs(params.report.primaryConstraint)}
    </div>

    <!-- Readiness -->
    <div style="margin-bottom: 36px;">
      <h2 style="margin: 0 0 18px; font-size: 17px; font-weight: 600; color: #111827;">
        Your Readiness to Move Forward
      </h2>
      ${formatReadiness(params.report.readinessAssessment)}
    </div>

    <!-- Recommended Next Steps -->
    <div style="margin-bottom: 8px;">
      <h2 style="margin: 0 0 16px; font-size: 17px; font-weight: 600; color: #111827;">
        Recommended Next Steps
      </h2>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
        ${params.report.recommendedNextSteps.map(step =>
          `<li style="margin-bottom: 14px; font-size: 15px; line-height: 1.7;">${md(step)}</li>`
        ).join('')}
      </ul>
    </div>
  ` : `
    <!-- Constraint Card (no report) -->
    <div style="border-radius: 12px; overflow: hidden; margin-bottom: 8px;">
      <div style="background: linear-gradient(135deg, ${color}, ${color}dd); padding: 20px 24px;">
        <p style="margin: 0 0 4px; font-size: 13px; color: rgba(255,255,255,0.8);">Your Primary Constraint</p>
        <h2 style="margin: 0; font-size: 22px; color: white; text-transform: capitalize;">
          ${params.constraintCategory === 'strategy' ? 'Offer Clarity Gap' : params.constraintCategory === 'execution' ? 'Execution Bottleneck' : 'Energy Drain'}
        </h2>
      </div>
      <div style="padding: 20px 24px; background: #f9fafb; border: 1px solid #f3f4f6; border-top: 0; border-radius: 0 0 12px 12px;">
        <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.6;">${params.constraintSummary}</p>
      </div>
    </div>
  `

  const ctaSection = params.bookingLink ? `
    ${emailDivider()}
    <div style="background: linear-gradient(135deg, ${isMIST ? '#F59E0B, #EA580C' : '#14B8A6, #8B5CF6'}); border-radius: 16px; padding: 36px 28px; text-align: center; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);">
      <h2 style="margin: 0 0 10px; font-size: 22px; color: white; font-weight: bold;">${ctaTitle}</h2>
      <p style="margin: 0 0 24px; font-size: 15px; color: rgba(255,255,255,0.9); line-height: 1.6;">${ctaDescription}</p>
      ${emailButton(params.bookingLink, ctaButtonText, 'white')}
    </div>
  ` : ''

  // Opportunity statement callout - the inspiring hook at the top
  const opportunityCallout = params.report?.opportunityStatement ? `
    <div style="position: relative; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border-radius: 16px; padding: 32px 28px; margin-bottom: 36px; overflow: hidden;">
      <!-- Decorative gradient accent -->
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #14B8A6, #8B5CF6, #EC4899);"></div>
      <!-- Decorative glow -->
      <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%); pointer-events: none;"></div>

      <!-- Content -->
      <p style="margin: 0 0 16px; font-size: 11px; font-weight: 600; color: #14B8A6; text-transform: uppercase; letter-spacing: 1.5px;">Your Opportunity</p>
      <p style="margin: 0; font-size: 20px; font-weight: 500; color: #ffffff; line-height: 1.5; position: relative;">
        ${params.report.opportunityStatement}
      </p>
    </div>
  ` : ''

  const content = `
    <h1 style="margin: 0 0 8px; font-size: 26px; color: #111827;">Your Strategic Assessment Report</h1>
    <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
      Hey ${params.userName}, here's your personalized assessment based on our conversation.
    </p>

    ${opportunityCallout}

    ${reportContent}

    ${ctaSection}

    ${emailDivider()}

    <div style="background: #F0FDFA; border-radius: 12px; padding: 20px; border-left: 4px solid #14B8A6;">
      <h3 style="margin: 0 0 6px; font-size: 15px; color: #0F766E; font-weight: 600;">Questions? We're here to help.</h3>
      <p style="margin: 0; font-size: 14px; color: #115E59; line-height: 1.5;">
        Just hit reply to this email — we'd love to hear from you and help you move forward.
      </p>
    </div>
  `

  return emailLayout('Your Assessment Results', content)
}
