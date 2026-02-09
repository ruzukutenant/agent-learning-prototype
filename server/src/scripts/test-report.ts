import { generateAssessmentReport } from '../services/ai/reportGenerator.js'
import { supabase } from '../config/supabase.js'

async function testReportGeneration() {
  try {
    console.log('🔍 Finding a completed session for testing...\n')

    // Find a completed session (has constraint_category)
    const { data: sessions, error } = await supabase
      .from('advisor_sessions')
      .select('id, user_name, constraint_category, created_at')
      .not('constraint_category', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error || !sessions || sessions.length === 0) {
      console.error('❌ No completed sessions found')
      return
    }

    console.log(`Found ${sessions.length} completed sessions:`)
    sessions.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.user_name} - ${s.constraint_category} (${s.id})`)
    })

    const testSession = sessions[0]
    console.log(`\n📊 Testing report generation for: ${testSession.user_name} (${testSession.id})\n`)

    // Generate report
    console.log('⏳ Generating AI report...')
    const startTime = Date.now()
    const report = await generateAssessmentReport(testSession.id)
    const duration = Date.now() - startTime

    console.log(`✅ Report generated in ${duration}ms\n`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📄 GENERATED REPORT:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    console.log('📍 SITUATION OVERVIEW:')
    console.log(report.situationOverview)
    console.log('\n💡 KEY INSIGHTS:')
    report.keyInsights.forEach((insight, i) => {
      console.log(`  ${i + 1}. ${insight}`)
    })
    console.log('\n🚧 PRIMARY CONSTRAINT:')
    console.log(report.primaryConstraint)
    console.log('\n📈 READINESS ASSESSMENT:')
    console.log(report.readinessAssessment)
    console.log('\n🎯 RECOMMENDED NEXT STEPS:')
    report.recommendedNextSteps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${step}`)
    })

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`\n✨ Report looks good! Generated ${report.keyInsights.length} insights and ${report.recommendedNextSteps.length} next steps`)

  } catch (error) {
    console.error('❌ Error testing report generation:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
  }
}

testReportGeneration()
