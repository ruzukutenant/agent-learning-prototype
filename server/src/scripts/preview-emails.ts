/**
 * Generate an HTML page with all 6 email template previews.
 * Run: npx tsx server/src/scripts/preview-emails.ts
 * Opens in browser automatically.
 */

import { buildEmailTemplate } from '../services/email/resend.js'
import { writeFileSync } from 'fs'
import { execSync } from 'child_process'

// ─── Duplicate cron-check helpers (standalone script can't import them) ──────

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

// ─── Build each template ────────────────────────────────────────────────────

// 1. Summary Email (with report)
const summaryHtml = buildEmailTemplate({
  userName: 'Sarah',
  constraintCategory: 'strategy',
  constraintSummary: 'You have strong coaching skills but are spread across too many potential niches, making it hard to build momentum in any one direction.',
  clarityScore: 6,
  confidenceScore: 7,
  capacityScore: 8,
  bookingLink: 'https://cma-ec.youcanbook.me',
  report: {
    situationOverview: "You're an experienced coach with **deep expertise** in leadership development, but you've been trying to serve too many different audiences. This has led to inconsistent messaging, difficulty articulating your unique value, and a feeling of spinning your wheels despite working hard.",
    keyInsights: [
      "You have **strong client results** when you do land clients — the problem isn't your skill, it's your positioning",
      "Your attempts to appeal to everyone are actually repelling your ideal clients",
      "There's a clear pattern: your best results come from **mid-level managers** transitioning to senior roles",
    ],
    primaryConstraint: "Your core constraint is **strategic clarity**. Without a clear niche and positioning, every marketing effort feels scattered. You're not lacking skills or energy — you're lacking a clear direction to focus them.",
    readinessAssessment: "You show **high readiness** to move forward. You've already recognized the problem, you have the skills to deliver, and you're motivated to make a change. The missing piece is a structured process to narrow your focus and commit to a direction.",
    recommendedNextSteps: [
      "Define your **ideal client avatar** based on your best past results",
      "Craft a **signature offer** that solves one specific problem for that audience",
      "Build a **simple funnel** that speaks directly to that person's pain points",
    ],
  },
})

// 2. Summary Email (without report, execution constraint)
const summaryNoReportHtml = buildEmailTemplate({
  userName: 'David',
  constraintCategory: 'execution',
  constraintSummary: 'You know exactly what to do but are drowning in implementation. Everything depends on you, and there are no documented systems to delegate effectively.',
  clarityScore: 8,
  confidenceScore: 7,
  capacityScore: 4,
  bookingLink: 'https://cma-mist.youcanbook.me',
})

// 3. Resume Email — use the layout helpers directly
function buildResumePreview(): string {
  const emailButton = `<a href="https://advisor.coachmira.ai/chat/abc-123" style="display: inline-block; padding: 16px 36px; background: linear-gradient(135deg, #14B8A6, #8B5CF6); color: white; text-decoration: none; font-weight: 600; border-radius: 50px; font-size: 16px; box-shadow: 0 4px 14px rgba(139,92,246,0.25);">Resume My Assessment</a>`
  const emailDivider = `<div style="height: 2px; background: linear-gradient(90deg, #14B8A6, #8B5CF6); border-radius: 1px; margin: 24px 0;"></div>`

  const content = `
    <h1 style="margin: 0 0 16px; font-size: 26px; color: #111827;">Your Progress is Saved, Marcus</h1>
    <p style="margin: 0 0 16px; font-size: 16px; color: #4b5563; line-height: 1.6;">We've saved your assessment progress. You can pick up right where you left off anytime.</p>
    <p style="margin: 0 0 28px; font-size: 16px; color: #4b5563; line-height: 1.6;">Simply click the link below to continue your strategic assessment whenever you're ready.</p>
    <div style="text-align: center; margin-bottom: 24px;">${emailButton}</div>
    <p style="margin: 0 0 28px; font-size: 13px; color: #9ca3af; text-align: center;">
      Or copy and paste this link:<br/>
      <a href="https://advisor.coachmira.ai/chat/abc-123" style="color: #7C3AED; text-decoration: none; word-break: break-all;">https://advisor.coachmira.ai/chat/abc-123</a>
    </p>
    ${emailDivider}
    <div style="background: #F0FDFA; border-radius: 12px; padding: 20px; border-left: 4px solid #14B8A6;">
      <h3 style="margin: 0 0 6px; font-size: 15px; color: #0F766E; font-weight: 600;">Need help?</h3>
      <p style="margin: 0; font-size: 14px; color: #115E59; line-height: 1.5;">Just hit reply — we're happy to help you get back on track.</p>
    </div>
  `

  return cronEmailLayout('Resume Your Assessment', content)
}

// 4. Reminder Email
function buildReminderPreview(): string {
  const emailButton = `<a href="https://advisor.coachmira.ai" style="display: inline-block; padding: 16px 36px; background: linear-gradient(135deg, #14B8A6, #8B5CF6); color: white; text-decoration: none; font-weight: 600; border-radius: 50px; font-size: 16px; box-shadow: 0 4px 14px rgba(139,92,246,0.25);">Start My Free Assessment</a>`

  return cronEmailLayout('Your Assessment is Waiting', `
    <h1 style="margin: 0 0 16px; font-size: 26px; color: #111827;">Come Back When You're Ready</h1>
    <p style="margin: 0 0 16px; font-size: 16px; color: #4b5563; line-height: 1.6;">You signed up for a reminder about the CoachMira Advisor assessment. Whenever the timing feels right, you can start your free 10-minute strategic assessment.</p>
    <p style="margin: 0 0 28px; font-size: 16px; color: #4b5563; line-height: 1.6;">It's a guided conversation that helps you identify the one constraint holding your business back.</p>
    <div style="text-align: center; margin-bottom: 8px;">${emailButton}</div>
  `)
}

// 5. Idle Recovery Email
function buildRecoveryPreview(): string {
  return cronEmailLayout('Resume Your Assessment', `
    <h1 style="margin: 0 0 16px; font-size: 26px; color: #111827;">Hi Rachel,</h1>
    <p style="margin: 0 0 16px; font-size: 16px; color: #4b5563; line-height: 1.6;">You started a conversation with me about your business, and I noticed we didn't get to finish. Your progress is saved — you can pick up right where you left off.</p>
    <p style="margin: 0 0 28px; font-size: 16px; color: #4b5563; line-height: 1.6;">This link will take you back to our conversation. It'll be available for the next 48 hours.</p>
    <div style="text-align: center; margin-bottom: 28px;">
      <a href="https://advisor.coachmira.ai/chat/xyz-789" style="display: inline-block; padding: 16px 36px; background: linear-gradient(135deg, #14B8A6, #8B5CF6); color: white; text-decoration: none; font-weight: 600; border-radius: 50px; font-size: 16px; box-shadow: 0 4px 14px rgba(139,92,246,0.25);">Continue My Conversation</a>
    </div>
    <p style="margin: 0 0 20px; font-size: 14px; color: #6b7280; line-height: 1.5;">— Mira, your AI business advisor</p>
    <p style="margin: 0; font-size: 12px; color: #9ca3af;">If you didn't start this conversation, you can safely ignore this email.</p>
  `)
}

// 6. Alert Email
function buildAlertPreview(): string {
  const issues = [
    'Low completion rate: 38.5% (5/13 sessions)',
    '2 session(s) hit 30+ turns without completing: sess_abc123, sess_def456',
    '1 email delivery issue(s): jane@example.com (summary — bounced)',
  ]

  return cronEmailLayout('CoachMira Alert', `
    <div style="border-left: 4px solid #DC2626; padding-left: 16px; margin-bottom: 24px;">
      <h1 style="margin: 0 0 8px; font-size: 22px; color: #DC2626;">Issues Detected</h1>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">In the last 24 hours</p>
    </div>
    <ul style="margin: 0 0 28px; padding-left: 20px;">
      ${issues.map(i => `<li style="margin-bottom: 10px; font-size: 15px; color: #374151; line-height: 1.6;">${i}</li>`).join('')}
    </ul>
    <div style="text-align: center;">
      <a href="https://advisor.coachmira.ai/admin" style="display: inline-block; padding: 14px 32px; background: #7C3AED; color: white; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 15px;">Open Admin Dashboard</a>
    </div>
  `)
}

// ─── Call Taker Notification ────────────────────────────────────────────────

function buildCallTakerPreview(): string {
  const emailDivider = `<div style="height: 2px; background: linear-gradient(90deg, #14B8A6, #8B5CF6); border-radius: 1px; margin: 24px 0;"></div>`

  return cronEmailLayout('New Strategy Call Booked', `
    <h1 style="margin: 0 0 20px; font-size: 22px; color: #111827;">New Strategy Call Booked</h1>
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 12px; margin-bottom: 20px;">
      <tr>
        <td style="padding: 10px 16px; color: #6b7280; font-size: 14px; border-bottom: 1px solid #f3f4f6; width: 120px;">Name</td>
        <td style="padding: 10px 16px; color: #111827; font-size: 14px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">Sarah Johnson</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #6b7280; font-size: 14px; border-bottom: 1px solid #f3f4f6;">Email</td>
        <td style="padding: 10px 16px; font-size: 14px; border-bottom: 1px solid #f3f4f6;">
          <a href="mailto:sarah@example.com" style="color: #7C3AED; text-decoration: none;">sarah@example.com</a>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #6b7280; font-size: 14px; border-bottom: 1px solid #f3f4f6;">Constraint</td>
        <td style="padding: 10px 16px; color: #111827; font-size: 14px; text-transform: capitalize; border-bottom: 1px solid #f3f4f6;">strategy</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #6b7280; font-size: 14px;">Call Date</td>
        <td style="padding: 10px 16px; color: #111827; font-size: 14px;">1/28/2026, 2:00:00 PM</td>
      </tr>
    </table>
    <div style="background: #f3f4f6; border-radius: 12px; padding: 20px;">
      <h3 style="margin: 0 0 10px; font-size: 15px; color: #374151; font-weight: 600;">Assessment Summary</h3>
      <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">Experienced leadership coach spread across too many niches. Strong skills but unclear positioning is preventing growth.</p>
    </div>
    ${emailDivider}
    <div style="background: #FFFBEB; border-radius: 12px; padding: 20px; border-left: 4px solid #F59E0B;">
      <h3 style="margin: 0 0 12px; font-size: 15px; color: #92400e; font-weight: 600;">Key Insights from Conversation</h3>
      <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.6;">
        <li style="margin-bottom: 6px;">Best results come from mid-level managers transitioning to senior roles</li>
        <li style="margin-bottom: 6px;">Has been trying to serve too many audiences simultaneously</li>
        <li style="margin-bottom: 6px;">Strong client retention when she does land clients</li>
      </ul>
    </div>
    ${emailDivider}
    <div style="text-align: center;">
      <a href="https://advisor.coachmira.ai/admin/sessions/abc-123" style="display: inline-block; padding: 14px 32px; background: #7C3AED; color: white; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 15px;">View Full Transcript</a>
    </div>
  `)
}

// ─── Assemble preview page ──────────────────────────────────────────────────

const templates = [
  { name: '1. Summary Email (Strategy, with report)', html: summaryHtml },
  { name: '2. Summary Email (Execution, no report)', html: summaryNoReportHtml },
  { name: '3. Resume Email', html: buildResumePreview() },
  { name: '4. Reminder Email', html: buildReminderPreview() },
  { name: '5. Call Taker Notification', html: buildCallTakerPreview() },
  { name: '6. Idle Recovery Email', html: buildRecoveryPreview() },
  { name: '7. Alert Email (Internal)', html: buildAlertPreview() },
]

const previewPage = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Email Template Preview — CoachMira</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f0f; color: #e5e5e5; }
    .nav { position: fixed; top: 0; left: 0; width: 280px; height: 100vh; background: #1a1a1a; border-right: 1px solid #333; padding: 24px 16px; overflow-y: auto; z-index: 10; }
    .nav h1 { font-size: 16px; color: #999; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; }
    .nav a { display: block; padding: 10px 12px; margin-bottom: 4px; color: #ccc; text-decoration: none; border-radius: 8px; font-size: 14px; transition: background 0.15s; }
    .nav a:hover, .nav a.active { background: #2a2a2a; color: #fff; }
    .main { margin-left: 280px; padding: 32px; }
    .template { margin-bottom: 64px; scroll-margin-top: 24px; }
    .template-label { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #aaa; }
    .frame-wrap { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.4); }
    iframe { width: 100%; border: 0; min-height: 400px; }
  </style>
</head>
<body>
  <div class="nav">
    <h1>Email Previews</h1>
    ${templates.map((t, i) => `<a href="#t${i}" onclick="document.querySelectorAll('.nav a').forEach(a=>a.classList.remove('active'));this.classList.add('active')">${t.name}</a>`).join('\n    ')}
  </div>
  <div class="main">
    ${templates.map((t, i) => `
    <div class="template" id="t${i}">
      <div class="template-label">${t.name}</div>
      <div class="frame-wrap">
        <iframe id="frame${i}" onload="this.style.height=this.contentDocument.body.scrollHeight+40+'px'"></iframe>
      </div>
    </div>
    `).join('')}
  </div>
  <script>
    const templates = ${JSON.stringify(templates.map(t => t.html))};
    templates.forEach((html, i) => {
      const frame = document.getElementById('frame' + i);
      frame.srcdoc = html;
    });
  </script>
</body>
</html>`

const outPath = '/tmp/coachmira-email-preview.html'
writeFileSync(outPath, previewPage)
console.log(`Preview written to ${outPath}`)
execSync(`open ${outPath}`)
