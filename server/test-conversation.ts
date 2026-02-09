import { processMessage } from './src/services/ai/conversation.js'
import { createSession } from './src/services/session.js'

async function testConversation() {
  console.log('\n=== Starting Conversation Test ===\n')

  // Create a new session
  const session = await createSession({ userName: 'TestUser' })
  console.log(`✓ Created session: ${session.id}\n`)

  // Helper to send message and log results
  async function sendMessage(message: string, description: string) {
    console.log(`\n--- ${description} ---`)
    console.log(`USER: "${message}"`)

    const result = await processMessage(session.id, message, false)

    if (result.advisorMessage) {
      console.log(`ADVISOR: "${result.advisorMessage.message_text.substring(0, 100)}..."`)
    }

    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log(`TOOLS CALLED:`)
      result.toolCalls.forEach(tc => {
        console.log(`  - ${tc.name}`)
      })
    }

    console.log(`Phase: ${result.session.current_phase}`)

    return result
  }

  try {
    // 1. Initial greeting
    await sendMessage('__INIT__', 'Initial Greeting')

    // 2. Business description
    await sendMessage(
      'I help coaches build their online presence. I work with health and wellness coaches.',
      'Phase 1: Business Type'
    )

    // 3. Client acquisition
    await sendMessage(
      'Mostly referrals and some Instagram posts.',
      'Phase 1: Acquisition Channel'
    )

    // 4. Volume
    await sendMessage(
      'About 3-5 clients per month, making around $8k/month.',
      'Phase 1: Volume'
    )

    // 5. Perceived bottleneck
    await sendMessage(
      'Getting people to actually book calls. They seem interested but ghost.',
      'Phase 1: Bottleneck'
    )

    // 6. Exploration
    await sendMessage(
      'When I reach out to people who engage with my content, they say they\'re interested but then never book.',
      'Phase 2: Exploration'
    )

    // 7. More exploration
    await sendMessage(
      'I usually say something like "want to hop on a call and chat about your goals?"',
      'Phase 2: Invitation Language'
    )

    // 8. Diagnosis
    const diagnosisResult = await sendMessage(
      'I\'d like to hear what you\'re seeing.',
      'Phase 3: Diagnosis Request'
    )

    // 9. CRITICAL TEST: Validation - should trigger identify_constraint ONLY
    console.log('\n\n🔍 CRITICAL TEST: Validating constraint (should call identify_constraint ONLY)')
    const validationResult = await sendMessage(
      'yes, that resonates',
      'Phase 3: Validation'
    )

    // Check if ONLY identify_constraint was called
    if (validationResult.toolCalls) {
      const toolNames = validationResult.toolCalls.map(t => t.name)
      console.log('\n✅ Tool Enforcement Check:')
      console.log(`   Tools called: ${toolNames.join(', ')}`)

      if (toolNames.includes('identify_constraint') && !toolNames.includes('collect_readiness_ratings')) {
        console.log('   ✅ SUCCESS: Only identify_constraint called')
      } else if (toolNames.includes('identify_constraint') && toolNames.includes('collect_readiness_ratings')) {
        console.log('   ❌ FAILURE: Both tools called in same turn (enforcement failed)')
      } else {
        console.log('   ⚠️  UNEXPECTED: Different tools called')
      }
    }

    // Check if there's bridging text
    if (validationResult.advisorMessage && validationResult.advisorMessage.message_text.length > 0) {
      console.log(`\n✅ Bridging Text Check:`)
      console.log(`   "${validationResult.advisorMessage.message_text.substring(0, 100)}..."`)
    } else {
      console.log(`\n⚠️  No bridging text in response`)
    }

    // 10. Continue to readiness if bridging text appeared
    if (validationResult.advisorMessage) {
      await sendMessage(
        'My clarity score is 7/10',
        'Phase 4: Clarity Rating'
      )

      await sendMessage(
        'My confidence score is 5/10',
        'Phase 4: Confidence Rating'
      )

      await sendMessage(
        'My capacity score is 8/10',
        'Phase 4: Capacity Rating'
      )

      // Email submission
      await sendMessage(
        'Email provided: test@example.com',
        'Phase 5: Email Submission'
      )

      // Routing acceptance
      const finalResult = await sendMessage(
        'yes, that would be helpful',
        'Phase 5: Routing Acceptance'
      )

      // Check if select_endpoint was called
      if (finalResult.toolCalls?.some(t => t.name === 'select_endpoint')) {
        console.log('\n✅ SUCCESS: select_endpoint called - conversation complete')
        console.log(`   Endpoint: ${finalResult.session.endpoint_selected}`)
        console.log(`   Status: ${finalResult.session.completion_status}`)
      } else {
        console.log('\n⚠️  WARNING: select_endpoint not called yet')
      }
    }

    console.log('\n=== Test Complete ===\n')

  } catch (error) {
    console.error('\n❌ Error during test:', error)
    throw error
  }
}

testConversation()
