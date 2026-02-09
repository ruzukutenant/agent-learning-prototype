/**
 * Adaptive UI End-to-End Test with Vibium + Claude Haiku
 *
 * Uses Claude Haiku to generate realistic responses based on a persona,
 * making the test adaptive to whatever Mira asks.
 */

const fs = require('fs')
const { browserSync } = require('vibium')
const Anthropic = require('@anthropic-ai/sdk')
require('dotenv').config()

// Initialize Claude
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Helper to wait/sleep
function sleep(ms) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    // Busy wait for synchronous sleep
  }
}

// Persona we're simulating
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

console.log('🌐 Starting Adaptive UI test with Claude Haiku...\n')

// Main async function
async function runTest() {
  // Launch browser
  const vibe = browserSync.launch({
    headless: false
  })

  let messageCount = 0
  let conversationHistory = []

  try {
  // Navigate to interview page
  console.log('📱 Opening app at http://localhost:5173/interview')
  vibe.go('http://localhost:5173/interview')
  sleep(2000)

  // Enter name
  console.log(`✍️  Entering name: ${PERSONA.name}`)
  const nameInput = vibe.find('input[placeholder="First Name"]', { timeout: 10000 })
  nameInput.type(PERSONA.name)
  sleep(500)

  fs.writeFileSync('screenshots/adaptive-01-name.png', vibe.screenshot())

  // Submit form
  console.log('🖱️  Starting assessment')
  const submitButton = vibe.find('button[type="submit"]')
  submitButton.click()
  sleep(4000) // Wait for navigation to chat

  console.log('💬 Entering adaptive conversation mode...\n')
  fs.writeFileSync('screenshots/adaptive-02-chat-start.png', vibe.screenshot())

  // Main conversation loop
  async function conversationLoop() {
    let loopCount = 0
    const MAX_LOOPS = 25 // Safety limit
    let lastProcessedMessage = null

    while (loopCount < MAX_LOOPS) {
      loopCount++
      console.log(`\n[Loop ${loopCount}]`)

      // Check if we've been redirected to summary
      const currentUrl = vibe.evaluate('window.location.href')
      if (currentUrl && typeof currentUrl === 'string' && currentUrl.includes('/summary/')) {
        console.log('\n✅ Redirected to summary page!')
        return { redirected: true, url: currentUrl }
      }

      // Wait a moment for any ongoing message to complete
      sleep(2000)

      // Extract Mira's messages from the page (advisor messages have self-start class)
      const advisorMessages = vibe.evaluate('Array.from(document.querySelectorAll(".self-start")).map(el => el.textContent.trim()).filter(text => text.length > 0)')

      console.log(`   Found ${advisorMessages ? advisorMessages.length : 0} advisor messages`)

      if (!advisorMessages || advisorMessages.length === 0) {
        console.log('   ⏳ Waiting for initial message...')
        sleep(2000)
        continue
      }

      // Get the last advisor message
      const lastAiMessage = advisorMessages[advisorMessages.length - 1]

      if (!lastAiMessage) {
        console.log('   ⏳ Waiting for AI response...')
        sleep(2000)
        continue
      }

      // Check if we already responded to this message
      if (lastProcessedMessage === lastAiMessage) {
        console.log('   ⏳ Already responded to this message, waiting for next...')
        sleep(2000)
        continue
      }

      // Mark this message as processed
      lastProcessedMessage = lastAiMessage

      // New message from Mira! Log it
      console.log(`\n💬 Mira: "${lastAiMessage.substring(0, 120)}${lastAiMessage.length > 120 ? '...' : ''}"`)
      conversationHistory.push({ role: 'assistant', content: lastAiMessage })

      // Generate response using Claude Haiku
      console.log('🤔 Generating response with Claude Haiku...')

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 200,
        temperature: 0.7,
        system: PERSONA.description,
        messages: conversationHistory
      })

      const userResponse = response.content[0].text.trim()
      conversationHistory.push({ role: 'user', content: userResponse })

      console.log(`✍️  User: "${userResponse}"`)

      // Type the response into the input
      const messageInput = vibe.find('input[placeholder="Type Message..."]', { timeout: 5000 })
      messageInput.type(userResponse)
      sleep(500)

      // Click send
      const sendButton = vibe.find('button.from-teal-400')
      sendButton.click()

      messageCount++
      fs.writeFileSync(`screenshots/adaptive-${String(messageCount + 2).padStart(2, '0')}-exchange.png`, vibe.screenshot())

      // Wait for AI to start responding (typing indicator appears)
      sleep(2000)

      // Wait for response to complete (longer wait for AI processing)
      sleep(5000)
    }

    return { redirected: false, maxLoopsReached: true }
  }

  // Run the conversation
  const result = await conversationLoop()

  if (result.redirected) {
    console.log(`📍 Final URL: ${result.url}`)

    // Take screenshot of summary
    sleep(2000)
    fs.writeFileSync('screenshots/adaptive-99-summary.png', vibe.screenshot())

    // Check which endpoint was recommended
    const pageText = vibe.evaluate('document.body.textContent')

    console.log('\n📊 Routing Result:')
    if (pageText.includes('MIST Implementation')) {
      console.log('✅ MIST endpoint recommended (CORRECT for deliverable need)')
    } else if (pageText.includes('Expert Strategist')) {
      console.log('⚠️  EC endpoint recommended (expected MIST for this scenario)')
    } else if (pageText.includes('Self-Guided')) {
      console.log('❌ NURTURE endpoint recommended (wrong for high readiness)')
    } else {
      console.log('❓ Could not determine endpoint recommendation')
    }

    // Extract session ID
    const sessionId = result.url.split('/summary/')[1]
    console.log(`\n📝 Session ID: ${sessionId}`)
    console.log(`📈 Total messages exchanged: ${messageCount}`)
  } else if (result.maxLoopsReached) {
    console.log('\n⚠️  Max conversation loops reached without redirect')
  }

  console.log('\n✅ Adaptive UI test complete!')
  console.log('📸 Screenshots saved to screenshots/ folder')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Error stack:', error.stack)
    try {
      fs.writeFileSync('screenshots/adaptive-error.png', vibe.screenshot())
      console.log('📸 Error screenshot saved')
    } catch (screenshotError) {
      console.log('⚠️  Could not save error screenshot')
    }
  } finally {
    console.log('\n⏳ Keeping browser open for 5 seconds...')
    sleep(5000)

    vibe.quit()
    console.log('👋 Browser closed')
  }
}

// Run the test
runTest().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
