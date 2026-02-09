// Test runner - execute all personas and compare results

import { runPersonaTest } from './test-harness.js'
import { ALEX_PERSONA, ALEX_NAME, EXPECTED_DIAGNOSIS as ALEX_EXPECTED } from './personas/systemic-coach.js'
import { MORGAN_PERSONA, MORGAN_NAME, EXPECTED_DIAGNOSIS as MORGAN_EXPECTED } from './personas/decision-paralysis.js'
import { JAMIE_PERSONA, JAMIE_NAME, EXPECTED_DIAGNOSIS as JAMIE_EXPECTED } from './personas/false-agreement.js'
import { TAYLOR_PERSONA, TAYLOR_NAME, EXPECTED_DIAGNOSIS as TAYLOR_EXPECTED } from './personas/resistance-avoidance.js'

interface PersonaConfig {
  name: string
  persona: any[]
  expected: any
  description: string
  testsFor: string[]
}

const PERSONAS: PersonaConfig[] = [
  {
    name: ALEX_NAME,
    persona: ALEX_PERSONA,
    expected: ALEX_EXPECTED,
    description: 'Systemic Overwhelm - Scattered tactics → strategy gap',
    testsFor: ['Cross-mapping', 'Containment', 'Validation loop']
  },
  {
    name: MORGAN_NAME,
    persona: MORGAN_PERSONA,
    expected: MORGAN_EXPECTED,
    description: 'Decision Paralysis - Analysis paralysis, waiting for certainty',
    testsFor: ['Decision hygiene', 'Risk calibration', 'Preference surfacing']
  },
  {
    name: JAMIE_NAME,
    persona: JAMIE_PERSONA,
    expected: JAMIE_EXPECTED,
    description: 'False Agreement - Intellectualization without embodiment',
    testsFor: ['Insight-to-action bridge', 'False agreement detection', 'Real ownership']
  },
  {
    name: TAYLOR_NAME,
    persona: TAYLOR_PERSONA,
    expected: TAYLOR_EXPECTED,
    description: 'Resistance/Avoidance - Overbuilding as fear avoidance',
    testsFor: ['Resistance detection', 'Perfectionism', 'Visibility fear']
  }
]

interface TestSummary {
  personaName: string
  description: string
  passed: boolean
  diagnosis: {
    expected: string
    actual: string
    match: boolean
  }
  endpoint: {
    expected: string
    actual: string
    match: boolean
  }
  readiness: {
    clarity: { expected: string, actual: string, match: boolean }
    confidence: { expected: string, actual: string, match: boolean }
    capacity: { expected: string, actual: string, match: boolean }
  }
  issues: string[]
  strengths: string[]
}

async function main() {
  console.log('=' .repeat(80))
  console.log('COMPREHENSIVE PERSONA TEST SUITE')
  console.log('Testing orchestration prototype against 4 persona types')
  console.log('=' .repeat(80))
  console.log()

  const results: TestSummary[] = []

  for (const config of PERSONAS) {
    console.log()
    console.log('▶'.repeat(40))
    console.log(`TESTING PERSONA: ${config.name}`)
    console.log(`Description: ${config.description}`)
    console.log(`Tests for: ${config.testsFor.join(', ')}`)
    console.log('▶'.repeat(40))
    console.log()

    try {
      const result = await runPersonaTest({
        name: config.name,
        persona: config.persona,
        expected: config.expected
      })

      const summary: TestSummary = {
        personaName: config.name,
        description: config.description,
        passed: result.success,
        diagnosis: {
          expected: config.expected.constraint,
          actual: result.finalState.constraint_hypothesis || 'null',
          match: result.diagnosis.matched
        },
        endpoint: {
          expected: config.expected.recommended_endpoint,
          actual: determineEndpoint(result.finalState),
          match: result.endpoint.matched
        },
        readiness: {
          clarity: {
            expected: config.expected.readiness.clarity,
            actual: result.finalState.readiness.clarity,
            match: config.expected.readiness.clarity === result.finalState.readiness.clarity
          },
          confidence: {
            expected: config.expected.readiness.confidence,
            actual: result.finalState.readiness.confidence,
            match: config.expected.readiness.confidence === result.finalState.readiness.confidence
          },
          capacity: {
            expected: config.expected.readiness.capacity,
            actual: result.finalState.readiness.capacity,
            match: config.expected.readiness.capacity === result.finalState.readiness.capacity
          }
        },
        issues: [],
        strengths: []
      }

      // Analyze issues and strengths
      if (!summary.diagnosis.match) {
        summary.issues.push(`Wrong diagnosis: expected ${summary.diagnosis.expected}, got ${summary.diagnosis.actual}`)
      } else {
        summary.strengths.push('Correct diagnosis')
      }

      if (!summary.endpoint.match) {
        summary.issues.push(`Wrong endpoint: expected ${summary.endpoint.expected}, got ${summary.endpoint.actual}`)
      } else {
        summary.strengths.push('Correct endpoint')
      }

      if (!summary.readiness.clarity.match) {
        summary.issues.push(`Clarity mismatch: expected ${summary.readiness.clarity.expected}, got ${summary.readiness.clarity.actual}`)
      }

      if (!summary.readiness.confidence.match) {
        summary.issues.push(`Confidence mismatch: expected ${summary.readiness.confidence.expected}, got ${summary.readiness.confidence.actual}`)
      }

      if (!summary.readiness.capacity.match) {
        summary.issues.push(`Capacity mismatch: expected ${summary.readiness.capacity.expected}, got ${summary.readiness.capacity.actual}`)
      }

      results.push(summary)

    } catch (error) {
      console.error(`❌ Test failed for ${config.name}:`, error)

      results.push({
        personaName: config.name,
        description: config.description,
        passed: false,
        diagnosis: { expected: config.expected.constraint, actual: 'ERROR', match: false },
        endpoint: { expected: config.expected.recommended_endpoint, actual: 'ERROR', match: false },
        readiness: {
          clarity: { expected: config.expected.readiness.clarity, actual: 'ERROR', match: false },
          confidence: { expected: config.expected.readiness.confidence, actual: 'ERROR', match: false },
          capacity: { expected: config.expected.readiness.capacity, actual: 'ERROR', match: false }
        },
        issues: [`Test execution error: ${error}`],
        strengths: []
      })
    }
  }

  // Print comprehensive summary
  console.log()
  console.log('=' .repeat(80))
  console.log('COMPREHENSIVE TEST RESULTS')
  console.log('=' .repeat(80))
  console.log()

  const passCount = results.filter(r => r.passed).length
  const totalCount = results.length

  for (const result of results) {
    console.log(`📋 ${result.personaName} - ${result.description}`)
    console.log(`   Result: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`)
    console.log()
    console.log(`   Diagnosis: ${result.diagnosis.match ? '✅' : '❌'} ${result.diagnosis.expected} → ${result.diagnosis.actual}`)
    console.log(`   Endpoint:  ${result.endpoint.match ? '✅' : '❌'} ${result.endpoint.expected} → ${result.endpoint.actual}`)
    console.log(`   Readiness:`)
    console.log(`     Clarity:     ${result.readiness.clarity.match ? '✅' : '❌'} ${result.readiness.clarity.expected} → ${result.readiness.clarity.actual}`)
    console.log(`     Confidence:  ${result.readiness.confidence.match ? '✅' : '❌'} ${result.readiness.confidence.expected} → ${result.readiness.confidence.actual}`)
    console.log(`     Capacity:    ${result.readiness.capacity.match ? '✅' : '❌'} ${result.readiness.capacity.expected} → ${result.readiness.capacity.actual}`)
    console.log()

    if (result.strengths.length > 0) {
      console.log(`   ✅ Strengths:`)
      result.strengths.forEach(s => console.log(`      - ${s}`))
      console.log()
    }

    if (result.issues.length > 0) {
      console.log(`   ❌ Issues:`)
      result.issues.forEach(i => console.log(`      - ${i}`))
      console.log()
    }

    console.log()
  }

  console.log('=' .repeat(80))
  console.log(`OVERALL: ${passCount}/${totalCount} personas passed`)
  console.log('=' .repeat(80))
  console.log()

  // Pattern analysis
  console.log('📊 PATTERN ANALYSIS')
  console.log()

  const diagnosisIssues = results.filter(r => !r.diagnosis.match)
  const endpointIssues = results.filter(r => !r.endpoint.match)
  const readinessIssues = results.filter(r =>
    !r.readiness.clarity.match ||
    !r.readiness.confidence.match ||
    !r.readiness.capacity.match
  )

  if (diagnosisIssues.length > 0) {
    console.log(`⚠️  Diagnosis failures: ${diagnosisIssues.length}/${totalCount}`)
    diagnosisIssues.forEach(r => console.log(`   - ${r.personaName}: ${r.diagnosis.expected} → ${r.diagnosis.actual}`))
    console.log()
  }

  if (endpointIssues.length > 0) {
    console.log(`⚠️  Endpoint failures: ${endpointIssues.length}/${totalCount}`)
    endpointIssues.forEach(r => console.log(`   - ${r.personaName}: ${r.endpoint.expected} → ${r.endpoint.actual}`))
    console.log()
  }

  if (readinessIssues.length > 0) {
    console.log(`⚠️  Readiness scoring issues: ${readinessIssues.length}/${totalCount}`)
    console.log()
  }

  // Exit with appropriate code
  process.exit(passCount === totalCount ? 0 : 1)
}

function determineEndpoint(state: any): string {
  const { clarity, confidence, capacity } = state.readiness

  if (clarity === 'high' && confidence === 'high' && capacity !== 'low') {
    return 'EC'
  }

  if (clarity === 'high' && capacity === 'low') {
    return 'MIST'
  }

  return 'NURTURE'
}

main()
