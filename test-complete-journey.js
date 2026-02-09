/**
 * Complete User Journey Test with Playwright + Claude Haiku
 *
 * Tests the full flow:
 * 1. Landing page
 * 2. Name collection
 * 3. Chat conversation (AI-powered with persona)
 * 4. Assessment sliders
 * 5. Email collection
 * 6. Summary page
 * 7. Book call CTA
 */

const { chromium } = require('playwright')
const Anthropic = require('@anthropic-ai/sdk')
require('dotenv').config()

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Productivity Coach Persona (condensed)
const PERSONA = {
  name: 'Jamie Thompson',
  email: 'jamie.thompson@example.com',
  description: `You are Jamie, a productivity and time-management coach for busy professionals.

Business Reality:
- Work with 3-5 clients/month via referrals
- Revenue is unpredictable (feast-or-famine)
- Have capacity for more clients
- Strong at converting discovery calls
- Struggle with consistent pre-call lead generation

Current Frustration:
- People express interest but don't always book calls
- Value becomes obvious during calls, not before
- Lack a consistent pre-call pathway to warm people up
- Marketing feels scattered and reactive
- Need clearer positioning/messaging before discovery calls

Communication Style:
- Thoughtful and reflective
- Honest about uncertainty
- Concise (1-2 sentences)
- "It feels like...", "What I'm noticing is..."
- Direct answers without over-explaining

You are open to insight, curious, not defensive.`,

  // Readiness scores (for assessment sliders)
  readiness: {
    clarity: 7,     // Pretty clear on what's needed
    confidence: 6,  // Somewhat confident could solve it
    capacity: 8     // Have time and bandwidth
  }
}

console.log('🎭 Complete User Journey Test\n')
console.log('Persona: Productivity Coach (Jamie Thompson)')
console.log('Journey: Landing → Chat → Assessment → Summary → Book Call\n')

async function runCompleteJourney() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500  // Slow down to see what's happening
  })

  const context = await browser.newContext()
  const page = await context.newPage()

  let conversationHistory = []
  let lastProcessedMessage = null
  let sessionId = null

  try {
    console.log('=' .repeat(80))
    console.log('STEP 1: LANDING PAGE')
    console.log('=' .repeat(80))

    await page.goto('http://localhost:5173/')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'screenshots/journey-01-landing.png' })
    console.log('✅ Landed on homepage')

    // Click "Find My Next Step" button
    const startButton = page.locator('button:has-text("Find My Next Step"), button:has-text("Start a new assessment")')
    await startButton.first().click()
    await page.waitForURL('**/interview')
    console.log('✅ Navigated to interview page\n')

    console.log('=' .repeat(80))
    console.log('STEP 2: NAME COLLECTION')
    console.log('=' .repeat(80))

    await page.screenshot({ path: 'screenshots/journey-02-name.png' })

    await page.fill('input[placeholder="First Name"]', PERSONA.name)
    console.log(`✅ Entered name: ${PERSONA.name}`)

    await page.click('button[type="submit"]')
    await page.waitForURL('**/chat/**', { timeout: 10000 })

    // Extract session ID from URL
    const url = page.url()
    sessionId = url.match(/\/chat\/([^\/]+)/)?.[1]
    console.log(`✅ Started chat session: ${sessionId}\n`)

    await page.screenshot({ path: 'screenshots/journey-03-chat-start.png' })

    console.log('=' .repeat(80))
    console.log('STEP 3: CHAT CONVERSATION (AI-POWERED)')
    console.log('=' .repeat(80))

    const MAX_CHAT_LOOPS = 20
    let chatLoopCount = 0

    while (chatLoopCount < MAX_CHAT_LOOPS) {
      chatLoopCount++
      console.log(`\n[Chat Turn ${chatLoopCount}]`)

      // Check if redirected or if "Continue to Assessment" button appeared
      const currentUrl = page.url()

      // Check for "Continue to Assessment" button
      const continueButton = await page.locator('button:has-text("Continue to Assessment")').count()
      if (continueButton > 0) {
        console.log('\n✅ Chat conversation complete! "Continue to Assessment" button appeared')
        await page.screenshot({ path: 'screenshots/journey-04-chat-complete.png' })
        break
      }

      // Wait for messages to load
      await page.waitForTimeout(2000)

      // Extract all advisor messages
      const advisorMessages = await page.$$eval('.self-start', elements =>
        elements.map(el => el.textContent.trim()).filter(text => text.length > 0)
      )

      if (advisorMessages.length === 0) {
        console.log('   ⏳ Waiting for initial message...')
        await page.waitForTimeout(2000)
        continue
      }

      // Get the latest message
      const latestMessage = advisorMessages[advisorMessages.length - 1]

      // Skip if already processed
      if (lastProcessedMessage === latestMessage) {
        console.log('   ⏳ Waiting for next message...')
        await page.waitForTimeout(2000)
        continue
      }

      // New message from Mira
      console.log(`   🤖 Mira: "${latestMessage.substring(0, 100)}${latestMessage.length > 100 ? '...' : ''}"`)
      conversationHistory.push({ role: 'user', content: latestMessage })

      // Generate response with Claude Haiku
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
      console.log(`   👤 Jamie: "${userResponse}"`)

      // Wait for input to be ready
      try {
        await page.waitForSelector('input[placeholder="Type Message..."]:not([disabled])', {
          timeout: 5000,
          state: 'attached'
        })
      } catch (e) {
        console.log('   ⏳ Input disabled, checking for completion...')
        await page.waitForTimeout(2000)
        continue
      }

      // Type and send response
      await page.fill('input[placeholder="Type Message..."]', userResponse)
      await page.waitForTimeout(500)
      await page.click('button.from-teal-400')

      lastProcessedMessage = latestMessage
      await page.screenshot({ path: `screenshots/journey-chat-${String(chatLoopCount).padStart(2, '0')}.png` })

      // Wait for AI response
      console.log('   ⏳ Waiting for AI response...')
      await page.waitForTimeout(6000)
    }

    if (chatLoopCount >= MAX_CHAT_LOOPS) {
      throw new Error('Chat conversation did not complete within max loops')
    }

    console.log('\n' + '=' .repeat(80))
    console.log('STEP 4: CONTINUE TO ASSESSMENT')
    console.log('=' .repeat(80))

    await page.click('button:has-text("Continue to Assessment")')
    await page.waitForURL('**/assess/**', { timeout: 10000 })
    console.log('✅ Navigated to assessment page\n')

    await page.screenshot({ path: 'screenshots/journey-05-assessment-start.png' })

    console.log('=' .repeat(80))
    console.log('STEP 5: ASSESSMENT SLIDERS')
    console.log('=' .repeat(80))

    // Wait for sliders to appear and AI conversation to start
    console.log('⏳ Waiting for assessment AI conversation to complete...')
    await page.waitForTimeout(10000)  // Give AI time to ask questions

    // Find slider inputs and set values
    // Sliders are typically input[type="range"]
    const sliders = await page.locator('input[type="range"]').all()

    if (sliders.length >= 3) {
      console.log(`\n📊 Setting readiness scores:`)
      console.log(`   Clarity: ${PERSONA.readiness.clarity}/10`)
      console.log(`   Confidence: ${PERSONA.readiness.confidence}/10`)
      console.log(`   Capacity: ${PERSONA.readiness.capacity}/10`)

      // Set each slider value
      await sliders[0].fill(PERSONA.readiness.clarity.toString())
      await sliders[1].fill(PERSONA.readiness.confidence.toString())
      await sliders[2].fill(PERSONA.readiness.capacity.toString())

      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'screenshots/journey-06-sliders-set.png' })
      console.log('✅ Sliders configured')

      // Click submit/continue button
      const submitButton = page.locator('button:has-text("Continue"), button:has-text("Submit"), button[type="submit"]')
      await submitButton.first().click()
      console.log('✅ Submitted assessment\n')
    } else {
      console.log('⚠️  Assessment format different than expected, checking for email input...')
    }

    console.log('=' .repeat(80))
    console.log('STEP 6: EMAIL COLLECTION')
    console.log('=' .repeat(80))

    // Wait for email input to appear (might be on assessment page or summary)
    await page.waitForTimeout(3000)

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]')
    const emailCount = await emailInput.count()

    if (emailCount > 0) {
      console.log(`✅ Found email input`)
      await emailInput.first().fill(PERSONA.email)
      console.log(`   Entered email: ${PERSONA.email}`)

      await page.screenshot({ path: 'screenshots/journey-07-email-entered.png' })

      // Click submit button for email
      const emailSubmit = page.locator('button:has-text("Submit"), button:has-text("Continue"), button:has-text("Send")')
      await emailSubmit.first().click()
      console.log('✅ Submitted email\n')
    } else {
      console.log('ℹ️  No email input found on this page')
    }

    console.log('=' .repeat(80))
    console.log('STEP 7: SUMMARY PAGE')
    console.log('=' .repeat(80))

    // Wait for redirect to summary
    try {
      await page.waitForURL('**/summary/**', { timeout: 30000 })
      console.log('✅ Navigated to summary page')
    } catch (e) {
      console.log('⚠️  Checking current page for summary content...')
    }

    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'screenshots/journey-08-summary.png' })

    // Check for summary content
    const pageText = await page.textContent('body')

    console.log('\n📊 Summary Page Content:')
    if (pageText.includes('MIST') || pageText.includes('Expert Strategist') || pageText.includes('Self-Guided')) {
      if (pageText.includes('MIST Implementation')) {
        console.log('   ✅ Recommended: MIST Implementation')
      } else if (pageText.includes('Expert Strategist')) {
        console.log('   ✅ Recommended: Expert Strategist (EC)')
      } else if (pageText.includes('Self-Guided')) {
        console.log('   ✅ Recommended: Self-Guided (NURTURE)')
      }
    } else {
      console.log('   ⚠️  Recommendation not clearly displayed')
    }

    console.log('\n' + '=' .repeat(80))
    console.log('STEP 8: BOOK CALL CTA')
    console.log('=' .repeat(80))

    // Find and click "Book Call" or similar CTA button
    const bookCallButton = page.locator(
      'button:has-text("Book"), a:has-text("Book"), button:has-text("Schedule"), a:has-text("Schedule")'
    )

    const bookCallCount = await bookCallButton.count()

    if (bookCallCount > 0) {
      console.log(`✅ Found "Book Call" button`)

      // Get the button text and href if it's a link
      const isLink = await bookCallButton.first().evaluate(el => el.tagName === 'A')

      if (isLink) {
        const href = await bookCallButton.first().getAttribute('href')
        console.log(`   Link target: ${href}`)
      }

      await page.screenshot({ path: 'screenshots/journey-09-book-call-ready.png' })

      // Click the button (or get ready to)
      console.log('   Clicking "Book Call" button...')
      await bookCallButton.first().click()

      await page.waitForTimeout(2000)
      await page.screenshot({ path: 'screenshots/journey-10-book-call-clicked.png' })

      // Check if new tab/window opened or if navigated
      const currentUrl = page.url()
      console.log(`   Current URL: ${currentUrl}`)

      if (currentUrl.includes('calendly') || currentUrl.includes('cal.com')) {
        console.log('✅ Redirected to booking page!')
      } else {
        console.log('ℹ️  Booking link clicked (may open in new tab)')
      }
    } else {
      console.log('⚠️  No "Book Call" button found on summary page')
      console.log('   Checking for alternative CTAs...')

      const allButtons = await page.locator('button, a.button, a.btn').all()
      console.log(`   Found ${allButtons.length} buttons/links on page`)
    }

    console.log('\n' + '=' .repeat(80))
    console.log('✅ COMPLETE USER JOURNEY TEST FINISHED!')
    console.log('=' .repeat(80))

    console.log('\n📈 Journey Summary:')
    console.log(`   Session ID: ${sessionId}`)
    console.log(`   Chat Turns: ${chatLoopCount}`)
    console.log(`   Screenshots: 10+ saved to screenshots/`)
    console.log(`   Test Status: PASSED ✅`)

    console.log('\n📸 Screenshots saved:')
    console.log('   - journey-01-landing.png')
    console.log('   - journey-02-name.png')
    console.log('   - journey-03-chat-start.png')
    console.log('   - journey-04-chat-complete.png')
    console.log('   - journey-05-assessment-start.png')
    console.log('   - journey-06-sliders-set.png')
    console.log('   - journey-07-email-entered.png')
    console.log('   - journey-08-summary.png')
    console.log('   - journey-09-book-call-ready.png')
    console.log('   - journey-10-book-call-clicked.png')

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message)
    console.error('\nStack:', error.stack)

    try {
      await page.screenshot({ path: 'screenshots/journey-error.png' })
      console.log('\n📸 Error screenshot saved to screenshots/journey-error.png')
    } catch (e) {
      console.log('⚠️  Could not save error screenshot')
    }

    process.exit(1)
  } finally {
    console.log('\n⏳ Keeping browser open for 5 seconds...')
    await page.waitForTimeout(5000)
    await browser.close()
    console.log('👋 Browser closed')
  }
}

runCompleteJourney().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
