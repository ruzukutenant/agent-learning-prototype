// Test runner - execute the persona simulation

import { runPersonaTest } from './test-harness.js'

/**
 * Main test execution
 */
async function main() {
  try {
    console.log('Starting orchestration prototype test...\n')

    const result = await runPersonaTest()

    console.log('='.repeat(80))
    console.log('FINAL VERDICT')
    console.log('='.repeat(80))
    console.log()

    if (result.success) {
      console.log('✅ TEST PASSED')
      console.log()
      console.log('The orchestration prototype successfully:')
      console.log('- Detected the correct constraint (strategy)')
      console.log('- Recommended the correct endpoint (MIST)')
      console.log('- Handled containment when overwhelm was detected')
      console.log('- Validated hypothesis before diagnosing')
      console.log('- Generated closing message programmatically (no tool calls)')
    } else {
      console.log('❌ TEST FAILED')
      console.log()
      console.log('Issues detected:')

      if (!result.diagnosis.matched) {
        console.log(`- Wrong diagnosis: expected ${result.diagnosis.expected}, got ${result.diagnosis.actual}`)
      }

      if (!result.endpoint.matched) {
        console.log(`- Wrong endpoint: expected ${result.endpoint.expected}, got ${result.endpoint.actual}`)
      }
    }

    console.log()
    console.log('='.repeat(80))

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1)

  } catch (error) {
    console.error('Test execution failed:', error)
    process.exit(1)
  }
}

main()
