/**
 * Adaptive UI Test with Async Vibium + Claude Haiku
 *
 * Uses async browser API for better evaluate() support
 */

const fs = require('fs').promises
const fsSync = require('fs')
const { browser } = require('vibium')
const Anthropic = require('@anthropic-ai/sdk')
require('dotenv').config()

// Initialize Claude
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Helper to wait
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Persona
const PERSONA = {
  name: 'Test User',
  description: `You are a business coach for small service businesses. You help other coaches and consultants build their practices.

Key facts about you:
- Making about $10K/month from coaching
- Get clients mostly through referrals and LinkedIn
- DROWNING in manual work: scheduling, invoicing, follow-ups - everything is manual
- You KNOW exactly what you need: systems and automation to scale
- You need someone to BUILD these systems for you (deliverable need, not strategic coaching)
- You're clear on what to do (8/10), confident in the solution (8/10), and have capacity (9/10)
- When asked about building vs strategy, you want someone to build it for you

Important traits:
- Be concise (1-2 sentences per response)
- Answer questions directly without over-explaining
- Don't volunteer extra information unless asked
- Progress the conversation efficiently
- For yes/no questions, just say "yes" or "that's right"
- For numeric scores (1-10), give just the number with minimal context
- You're friendly but brief - you're busy and appreciate efficiency`
}

console.log('🌐 Starting Adaptive UI test with Claude Haiku (async)...\n')

async function runTest() {
  const vibe = await browser.launch({ headless: false })

  let messageCount = 0
  let conversationHistory = []

  try {
    // Navigate to interview
    console.log('📱 Opening app')
    await vibe.go('http://localhost:5173/interview')
    await sleep(2000)

    // Enter name
    console.log(`✍️  Entering name: ${PERSONA.name}`)
    const nameInput = await vibe.find('input[placeholder="First Name"]', { timeout: 10000 })
    await nameInput.type(PERSONA.name)
    await sleep(500)

    fsSync.writeFileSync('screenshots/async-01-name.png', await vibe.screenshot())

    // Submit
    console.log('🖱️  Starting assessment')
    const submitButton = await vibe.find('button[type="submit"]')
    await submitButton.click()
    await sleep(4000)

    console.log('💬 Entering adaptive conversation mode...\n')
    fsSync.writeFileSync('screenshots/async-02-chat-start.png', await vibe.screenshot())

    // Main loop
    let lastProcessedMessage = null
    let loopCount = 0
    const MAX_LOOPS = 25

    while (loopCount < MAX_LOOPS) {
      loopCount++
      console.log(`\n[Loop ${loopCount}]`)

      // Check for redirect
      const currentUrl = await vibe.evaluate('window.location.href')
      console.log(`   URL: ${currentUrl}`)

      if (currentUrl && currentUrl.includes('/summary/')) {
        console.log('\n✅ Redirected to summary page!')

        await sleep(2000)
        fsSync.writeFileSync('screenshots/async-99-summary.png', await vibe.screenshot())

        // Check endpoint
        const pageText = await vibe.evaluate('document.body.textContent || ""')
        console.log('\n📊 Routing Result:')
        if (pageText.includes('MIST Implementation')) {
          console.log('✅ MIST endpoint recommended (CORRECT for deliverable need)')
        } else if (pageText.includes('Expert Strategist')) {
          console.log('⚠️  EC endpoint recommended (expected MIST for this scenario)')
        } else if (pageText.includes('Self-Guided')) {
          console.log('❌ NURTURE endpoint recommended (wrong for high readiness)')
        }

        console.log(`\n📝 Session ID: ${currentUrl.split('/summary/')[1]}`)
        console.log(`📈 Total messages exchanged: ${messageCount}`)
        break
      }

      await sleep(2000)

      // Extract advisor messages - try to get the most recent one
      // Note: Vibium's evaluate() is broken, so we have to use find() which only gets the first match
      // Workaround: Get the first element and track message count
      try {
        const element = await vibe.find('.self-start', { timeout: 3000 })
        const messageText = await element.text()

        console.log(`   Found message (${messageText.length} chars)`)

        if (lastProcessedMessage === messageText) {
          console.log('   ⏳ Already responded, waiting for next message...')
          continue
        }

        console.log(`\n💬 Mira: "${messageText.substring(0, 120)}${messageText.length > 120 ? '...' : ''}"`)

        // Add Mira's message as 'user' (from Claude Haiku's perspective, Mira is asking the persona a question)
        conversationHistory.push({ role: 'user', content: messageText })

        // Generate response with Claude Haiku
        console.log('🤔 Generating response with Claude Haiku...')

        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 200,
          temperature: 0.7,
          system: PERSONA.description,
          messages: conversationHistory
        })

        console.log('   Claude response:', JSON.stringify(response, null, 2).substring(0, 300))

        if (!response || !response.content || !response.content[0]) {
          console.log('   ⚠️  Invalid response from Claude')
          console.log('   Response structure:', { has_response: !!response, has_content: !!response?.content, content_length: response?.content?.length })
          conversationHistory.pop() // Remove the assistant message we just added
          continue
        }

        const userResponse = response.content[0].text.trim()
        conversationHistory.push({ role: 'assistant', content: userResponse })

        console.log(`✍️  User: "${userResponse}"`)

        // Type response
        const messageInput = await vibe.find('input[placeholder="Type Message..."]', { timeout: 5000 })
        await messageInput.type(userResponse)
        await sleep(500)

        // Click send
        const sendButton = await vibe.find('button.from-teal-400')
        await sendButton.click()

        // ONLY mark as processed after successfully sending
        lastProcessedMessage = messageText
        messageCount++
        fsSync.writeFileSync(`screenshots/async-${String(messageCount + 2).padStart(2, '0')}-exchange.png`, await vibe.screenshot())

        // Wait for AI response
        await sleep(6000)

      } catch (e) {
        console.log(`   ⚠️  Error in loop: ${e.message}`)
        await sleep(2000)
      }
    }

    if (loopCount >= MAX_LOOPS) {
      console.log('\n⚠️  Max loops reached')
    }

    console.log('\n✅ Adaptive UI test complete!')
    console.log('📸 Screenshots saved to screenshots/ folder')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
    try {
      fsSync.writeFileSync('screenshots/async-error.png', await vibe.screenshot())
    } catch (e) {
      console.log('Could not save error screenshot')
    }
  } finally {
    console.log('\n⏳ Keeping browser open for 5 seconds...')
    await sleep(5000)
    await vibe.quit()
    console.log('👋 Browser closed')
  }
}

runTest().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
