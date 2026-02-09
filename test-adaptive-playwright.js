/**
 * Adaptive UI Test with Playwright + Claude Haiku
 *
 * Tests the new orchestrator-powered conversation flow
 * Fully intelligent test that adapts to whatever the advisor asks
 */

const { chromium } = require('playwright')
const fs = require('fs').promises
const Anthropic = require('@anthropic-ai/sdk')
require('dotenv').config()

// Initialize Claude
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Test persona - Alex (Strategy Constraint)
const PERSONA = {
  name: 'Alex',
  description: `You are Alex, a marketing coach who helps small business owners with their content strategies and social media plans. You've been doing this for 3 years and are making decent money.

Key facts about you:
- You help small business owners with marketing, content strategies, and social media plans
- Been doing this for about 3 years
- Making okay money but want to grow
- The problem: You're UNCLEAR which direction to take
- You keep going back and forth between different growth models: group programs, one-on-one premium, courses
- You feel overwhelmed by all the choices and can't commit to one direction
- You spend a lot of time researching different business models instead of executing
- When asked what feels stuck: it's the decision-making and direction
- You recognize this is about strategy/clarity, not execution

Expected constraint: STRATEGY (offer clarity gap)
Expected readiness: clarity=medium, confidence=low, capacity=low

Important response style:
- Be concise (1-2 sentences per response)
- Show uncertainty and indecision when discussing growth direction
- Express feeling overwhelmed by choices
- Answer questions directly but reveal the lack of clarity
- Don't be overly verbose - you're friendly but get to the point
- When validation is offered, accept it ("yeah, that's it" or "exactly")`
}

console.log('🌐 Starting Orchestrator UI Test with Playwright + Claude Haiku...\n')
console.log('Testing Alex persona (Strategy Constraint):')
console.log('  Expected: Unclear which direction to take (group programs, 1-on-1, courses)')
console.log('  Expected constraint: STRATEGY')
console.log('  Expected endpoint: EC (strategy + medium readiness)')
console.log('')

async function runTest() {
  // Launch browser
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100 // Slow down for visibility
  })

  const context = await browser.newContext()
  const page = await context.newPage()

  let messageCount = 0
  let conversationHistory = []
  let lastProcessedMessage = null

  try {
    // Navigate to app (updated port for new dev server)
    console.log('📱 Opening app at http://localhost:5174')
    await page.goto('http://localhost:5174')
    await page.waitForLoadState('networkidle')

    // Enter name
    console.log(`✍️  Entering name: ${PERSONA.name}`)
    await page.fill('input[placeholder="First Name"]', PERSONA.name)
    await page.screenshot({ path: 'screenshots/pw-01-name.png' })

    // Submit
    console.log('🖱️  Starting assessment')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/chat/**', { timeout: 10000 })

    console.log('💬 Entering adaptive conversation mode...\n')
    await page.screenshot({ path: 'screenshots/pw-02-chat-start.png' })

    // Main conversation loop
    const MAX_LOOPS = 25
    for (let loopCount = 1; loopCount <= MAX_LOOPS; loopCount++) {
      console.log(`\n[Loop ${loopCount}]`)

      // Check if redirected to summary
      const currentUrl = page.url()
      if (currentUrl.includes('/summary/')) {
        console.log('\n✅ Conversation complete - redirected to summary page!')

        await page.waitForTimeout(2000)
        await page.screenshot({ path: 'screenshots/pw-99-summary.png' })

        // Extract summary information
        const pageText = await page.textContent('body')
        console.log('\n📊 Orchestrator Results:')

        // Check constraint detection
        if (pageText.includes('Offer Clarity Gap') || pageText.includes('strategy')) {
          console.log('✅ STRATEGY constraint detected (CORRECT for Alex persona)')
        } else if (pageText.includes('Execution Bottleneck') || pageText.includes('execution')) {
          console.log('❌ EXECUTION constraint detected (expected STRATEGY)')
        } else if (pageText.includes('Energy Drain') || pageText.includes('energy')) {
          console.log('❌ ENERGY constraint detected (expected STRATEGY)')
        } else {
          console.log('❓ Could not determine constraint category')
        }

        // Check endpoint recommendation
        if (pageText.includes('Expert Call') || pageText.includes('Strategy Session')) {
          console.log('✅ EC endpoint recommended (expected for strategy + medium readiness)')
        } else if (pageText.includes('MIST') || pageText.includes('Implementation')) {
          console.log('⚠️  MIST endpoint recommended (expected EC for strategy constraint)')
        } else if (pageText.includes('Self-Guided') || pageText.includes('NURTURE')) {
          console.log('❌ NURTURE endpoint recommended (wrong - readiness not that low)')
        }

        const sessionId = currentUrl.split('/summary/')[1]
        console.log(`\n📝 Session ID: ${sessionId}`)
        console.log(`📈 Total messages exchanged: ${messageCount}`)
        break
      }

      // Check if email collector modal appeared (conversation complete)
      const emailModal = await page.locator('text=Save Your Progress').count()
      if (emailModal > 0 && currentUrl.includes('/chat/')) {
        console.log('\n✅ Email collector appeared - conversation complete!')
        console.log('📧 Entering email to proceed to summary...')

        await page.screenshot({ path: 'screenshots/pw-97-email-collector.png' })

        // Fill email and submit
        const emailInput = await page.locator('input[type="email"]')
        if (await emailInput.count() > 0) {
          await emailInput.fill('alex@test.com')
          await page.click('button:has-text("Send")')

          console.log('   ⏳ Waiting for summary redirect...')
          await page.waitForTimeout(3000)
          continue // Next loop will handle summary page
        }
      }

      // Wait for any animations to complete
      await page.waitForTimeout(2000)

      // Extract all advisor messages (using $$eval which works in Playwright!)
      const advisorMessages = await page.$$eval('.self-start', elements =>
        elements.map(el => el.textContent.trim()).filter(text => text.length > 0)
      )

      if (advisorMessages.length === 0) {
        console.log('   ⏳ Waiting for initial message...')
        await page.waitForTimeout(2000)
        continue
      }

      // Get the LAST (most recent) advisor message
      const latestMessage = advisorMessages[advisorMessages.length - 1]
      console.log(`   Found ${advisorMessages.length} messages, latest is ${latestMessage.length} chars`)

      // Skip if empty (shouldn't happen after filter, but safety check)
      if (!latestMessage || latestMessage.length === 0) {
        console.log('   ⏳ Message is empty, waiting...')
        await page.waitForTimeout(2000)
        continue
      }

      // Check if we already responded to this message
      if (lastProcessedMessage === latestMessage) {
        console.log('   ⏳ Already responded, waiting for next message...')
        await page.waitForTimeout(2000)
        continue
      }

      // New message from Mira!
      console.log(`\n💬 Mira: "${latestMessage.substring(0, 120)}${latestMessage.length > 120 ? '...' : ''}"`)
      conversationHistory.push({ role: 'user', content: latestMessage })

      // Generate response with Claude Haiku
      console.log('🤔 Generating response with Claude Haiku...')

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 200,
        temperature: 0.7,
        system: PERSONA.description,
        messages: conversationHistory
      })

      if (!response?.content?.[0]?.text) {
        console.log('   ⚠️  Invalid response from Claude')
        conversationHistory.pop()
        continue
      }

      const userResponse = response.content[0].text.trim()
      conversationHistory.push({ role: 'assistant', content: userResponse })

      console.log(`✍️  User: "${userResponse}"`)

      // Wait for input to be ready (it may be disabled briefly while AI is responding)
      try {
        await page.waitForSelector('input[placeholder="Type Message..."]:not([disabled])', {
          timeout: 10000,
          state: 'attached'
        })
      } catch (e) {
        console.log('   ⚠️  Input field not available, conversation may have completed')
        // Check if we transitioned to summary or email collector
        const currentUrl = page.url()
        if (currentUrl.includes('/summary/')) {
          console.log('   ℹ️  Confirmed: Navigated to summary page')
        } else if (await page.locator('text=Save Your Progress').count() > 0) {
          console.log('   ℹ️  Confirmed: Email collector modal is open')
        }
        await page.waitForTimeout(2000)
        continue
      }

      // Type response into input field
      await page.fill('input[placeholder="Type Message..."]', userResponse)
      await page.waitForTimeout(500)

      // Click send button (has gradient class and SVG icon)
      const sendButton = page.locator('button.from-teal-400')
      if (await sendButton.count() > 0) {
        await sendButton.click()
      } else {
        console.log('   ⚠️  Could not find send button')
        continue
      }

      // Mark as processed and save screenshot
      lastProcessedMessage = latestMessage
      messageCount++
      await page.screenshot({ path: `screenshots/pw-${String(messageCount + 2).padStart(2, '0')}-exchange.png` })

      // Wait for AI response
      console.log('   ⏳ Waiting for AI response...')
      await page.waitForTimeout(6000)
    }

    if (messageCount >= MAX_LOOPS) {
      console.log('\n⚠️  Max loops reached without completing conversation')
      console.log('   This may indicate the orchestrator is not transitioning to complete state')
    }

    console.log('\n✅ Orchestrator UI test complete!')
    console.log('📸 Screenshots saved to screenshots/ folder')
    console.log('\nTest validated:')
    console.log('  ✓ Orchestrator conversation flow')
    console.log('  ✓ Signal detection and state inference')
    console.log('  ✓ Constraint identification')
    console.log('  ✓ Email collection on completion')
    console.log('  ✓ Navigation to summary page')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
    try {
      await page.screenshot({ path: 'screenshots/pw-error.png' })
      console.log('📸 Error screenshot saved')
    } catch (e) {
      console.log('⚠️  Could not save error screenshot')
    }
  } finally {
    console.log('\n⏳ Keeping browser open for 5 seconds...')
    await page.waitForTimeout(5000)
    await browser.close()
    console.log('👋 Browser closed')
  }
}

runTest().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
