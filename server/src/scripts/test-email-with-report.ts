import { generateAssessmentReport } from '../services/ai/reportGenerator.js'
import { sendSummaryEmail } from '../services/email/resend.js'
import { supabase } from '../config/supabase.js'

async function testEmailWithReport() {
  try {
    console.log('🔍 Finding a completed session for testing...\n')

    // Find a completed session with all required data
    const { data: sessions, error } = await supabase
      .from('advisor_sessions')
      .select('*')
      .not('constraint_category', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !sessions || sessions.length === 0) {
      console.error('❌ No completed sessions found')
      return
    }

    const session = sessions[0]
    console.log(`📊 Testing email with report for: ${session.user_name}`)
    console.log(`   Session: ${session.id}`)
    console.log(`   Constraint: ${session.constraint_category}\n`)

    // Generate report
    console.log('⏳ Generating AI report...')
    const report = await generateAssessmentReport(session.id)
    console.log('✅ Report generated\n')

    // Prepare email params
    const testEmail = process.env.TEST_EMAIL || 'test@example.com'
    const bookingLink = process.env.EC_BOOKING_LINK || process.env.VITE_EC_BOOKING_LINK || 'https://cma-ec.youcanbook.me'

    console.log(`📧 Preparing to send test email to: ${testEmail}`)
    console.log(`   (Set TEST_EMAIL env var to use your email)\n`)

    console.log('Email will include:')
    console.log(`  - AI Report: ${report.keyInsights.length} insights, ${report.recommendedNextSteps.length} next steps`)
    console.log(`  - Readiness Scores: Clarity ${session.clarity_score}, Confidence ${session.confidence_score}, Capacity ${session.capacity_score}`)
    console.log(`  - Booking Link: ${bookingLink}\n`)

    // For safety, let's not actually send unless TEST_EMAIL is set
    if (!process.env.TEST_EMAIL) {
      console.log('⚠️  Skipping actual email send (no TEST_EMAIL env var)')
      console.log('   Set TEST_EMAIL=your@email.com to test sending\n')
      console.log('✨ Email content would be generated successfully!')
      return
    }

    // Extract blockers from conversation state if present
    const conversationState = session.conversation_state as any
    const identifiedBlockers = conversationState?.readiness_check?.identified_blockers || []

    console.log('📤 Sending email...')
    const result = await sendSummaryEmail({
      to: testEmail,
      userName: session.user_name || 'there',
      constraintCategory: session.constraint_category!,
      constraintSummary: session.constraint_summary || 'Your constraint',
      clarityScore: session.clarity_score,
      confidenceScore: session.confidence_score,
      capacityScore: session.capacity_score,
      bookingLink,
      report,
      identifiedBlockers,
    })

    if (result.success) {
      console.log('✅ Email sent successfully!\n')
      console.log(`📬 Check ${testEmail} for the full assessment report`)
    } else {
      console.error('❌ Email failed:', result.error)
    }

  } catch (error) {
    console.error('❌ Error testing email:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
    }
  }
}

testEmailWithReport()
