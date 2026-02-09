/**
 * Test script for Ontraport CRM integration
 * Run with: npx tsx server/src/scripts/test-ontraport.ts
 */

import 'dotenv/config'
import { sendToOntraport, type OntraportLeadData } from '../services/crm/ontraport.js'

async function testOntraport() {
  console.log('='.repeat(60))
  console.log('ONTRAPORT INTEGRATION TEST')
  console.log('='.repeat(60))

  // Check credentials
  const apiKey = process.env.ONTRAPORT_API_KEY
  const appId = process.env.ONTRAPORT_APP_ID

  console.log('\n[1] Checking credentials...')
  console.log(`  API Key: ${apiKey ? apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4) : 'NOT SET'}`)
  console.log(`  App ID: ${appId ? appId.substring(0, 4) + '...' + appId.substring(appId.length - 4) : 'NOT SET'}`)

  if (!apiKey || !appId) {
    console.error('\n❌ FAILED: Ontraport credentials not configured')
    console.error('   Set ONTRAPORT_API_KEY and ONTRAPORT_APP_ID in your .env file')
    process.exit(1)
  }

  // Send test lead
  console.log('\n[2] Sending test lead to Ontraport...')

  const testData: OntraportLeadData = {
    email: 'test-coachmira@morebetterlabs.com',
    firstName: 'Test',
    lastName: 'CoachMira',
    constraintCategory: 'execution',
    constraintSummary: 'This is a test lead from CoachMira Advisor integration testing. You\'re doing everything yourself and need systems to scale.',
    clarityScore: 8,
    confidenceScore: 7,
    capacityScore: 5,
    sessionId: 'test-session-' + Date.now(),
    recommendedPath: 'MIST',
    identifiedBlockers: ['No documented processes', 'Tried hiring VAs but it didn\'t work'],
    completedAt: new Date().toISOString(),
  }

  console.log(`  Email: ${testData.email}`)
  console.log(`  Name: ${testData.firstName} ${testData.lastName}`)
  console.log(`  Constraint: ${testData.constraintCategory}`)

  const result = await sendToOntraport(testData)

  console.log('\n[3] Result:')
  if (result.success) {
    console.log('  ✅ SUCCESS!')
    if (result.contactId) {
      console.log(`  Contact ID: ${result.contactId}`)
    }
    console.log('\n  Check Ontraport for the test contact:')
    console.log(`  - Email: ${testData.email}`)
    console.log('  - Look in the Notes field for assessment data')
  } else {
    console.error('  ❌ FAILED!')
    console.error(`  Error: ${result.error}`)
  }

  console.log('\n' + '='.repeat(60))
}

testOntraport().catch(console.error)
