/**
 * E2E Orchestrator Test with Playwright + Claude Haiku
 *
 * Tests the full orchestrator-powered conversation flow with new UX features:
 * - Phase header transitions (context → exploration → diagnosis → complete)
 * - Insights panel accumulation
 * - Handoff button on final message
 * - Summary page with BlockersCard
 */

const { chromium } = require('playwright')
const Anthropic = require('@anthropic-ai/sdk')
require('dotenv').config()

// Initialize Claude for simulated responses
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Test persona - Priya (Execution Constraint with medium-high readiness)
const PERSONA = {
  name: 'Priya',
  email: 'priya.test@example.com',
  description: `You are Priya, a business coach who helps entrepreneurs with mindset and productivity. You've been coaching for 4 years and have a solid client base.

Key facts about you:
- You help entrepreneurs with mindset blocks and productivity systems
- Been doing this for 4 years, making good money ($8-10k/month)
- The problem: You know EXACTLY what you want to do (launch a group program)
- But you keep getting stuck in the DOING - you start things but don't finish
- You have a course half-built, a funnel half-done, emails half-written
- You get distracted by new ideas and shiny objects
- When asked what feels stuck: it's the execution and follow-through
- You recognize you need systems and accountability, not more strategy
- You're ready to invest in help - time and money aren't blockers

Expected constraint: EXECUTION (implementation gap)
Expected readiness: clarity=high, confidence=medium, capacity=high
Expected endpoint: EC or MIST (execution + high readiness)

Response style:
- Be direct and self-aware about your execution struggles
- Show frustration with yourself for not finishing things
- Express enthusiasm when solutions are discussed
- Keep responses conversational (2-3 sentences usually)
- When the advisor validates your struggle, agree enthusiastically
- Show you're ready to take action when asked about commitment`
}

// Test configuration
const CONFIG = {
  baseUrl: 'http://localhost:5173',
  maxTurns: 30,
  responseTimeout: 15000,
  screenshotPrefix: 'e2e'
}

// Results tracking
const testResults = {
  phases: [],
  insights: [],
  turnCount: 0,
  constraintDetected: null,
  endpointSelected: null,
  handoffButtonAppeared: false,
  summaryReached: false,
  blockersShown: false,
  errors: []
}

console.log('=' .repeat(60))
console.log('E2E ORCHESTRATOR TEST - New UX Flow')
console.log('=' .repeat(60))
console.log(`\nPersona: ${PERSONA.name}`)
console.log('Expected constraint: EXECUTION')
console.log('Expected endpoint: EC or MIST (high readiness)')
console.log('\nTesting new UX features:')
console.log('  - Phase header transitions')
console.log('  - Insights panel')
console.log('  - Handoff button')
console.log('  - Summary page components')
console.log('=' .repeat(60) + '\n')

async function runTest() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  })
  const page = await context.newPage()

  let conversationHistory = []
  let lastAdvisorMessage = null
  let screenshotCount = 0

  const takeScreenshot = async (name) => {
    screenshotCount++
    const filename = `screenshots/${CONFIG.screenshotPrefix}-${String(screenshotCount).padStart(2, '0')}-${name}.png`
    await page.screenshot({ path: filename })
    console.log(`  [Screenshot: ${filename}]`)
  }

  try {
    // ========================================
    // STEP 1: Landing Page
    // ========================================
    console.log('\n[Step 1] Landing Page')
    await page.goto(CONFIG.baseUrl)
    await page.waitForLoadState('networkidle')
    await takeScreenshot('landing')

    // Click "Find My Next Step" button
    const startButton = page.locator('button:has-text("Find My Next Step")')
    if (await startButton.count() > 0) {
      await startButton.click()
      console.log('  Clicked "Find My Next Step"')
    } else {
      // May have a saved session, look for alternative
      const newButton = page.locator('text=Start a new assessment')
      if (await newButton.count() > 0) {
        await newButton.click()
      }
    }

    await page.waitForURL('**/interview**', { timeout: 5000 })
    console.log('  Navigated to name collection')

    // ========================================
    // STEP 2: Name Collection
    // ========================================
    console.log('\n[Step 2] Name Collection')
    await page.waitForSelector('input[placeholder="First Name"]')
    await page.fill('input[placeholder="First Name"]', PERSONA.name)
    await takeScreenshot('name-entry')

    await page.click('button:has-text("Start Assessment")')
    await page.waitForURL('**/chat/**', { timeout: 10000 })
    console.log(`  Entered name: ${PERSONA.name}`)
    console.log('  Navigated to chat')

    // ========================================
    // STEP 3: Conversation Loop
    // ========================================
    console.log('\n[Step 3] Conversation')

    for (let turn = 1; turn <= CONFIG.maxTurns; turn++) {
      console.log(`\n--- Turn ${turn} ---`)
      testResults.turnCount = turn

      // Check current URL
      const currentUrl = page.url()

      // Check if we've reached summary
      if (currentUrl.includes('/summary/')) {
        console.log('\n[SUCCESS] Reached summary page!')
        testResults.summaryReached = true
        await takeScreenshot('summary-page')
        break
      }

      // Check for handoff button (new UX)
      const handoffButton = page.locator('button:has-text("View Your Summary")')
      if (await handoffButton.count() > 0) {
        console.log('\n[NEW UX] Handoff button appeared!')
        testResults.handoffButtonAppeared = true
        await takeScreenshot('handoff-button')

        // Click it to proceed
        await handoffButton.click()
        console.log('  Clicked handoff button')

        // Wait for either email collector or summary
        await page.waitForTimeout(2000)
        continue
      }

      // Check for email collector modal
      const emailModal = page.locator('text=Save Your Progress')
      if (await emailModal.count() > 0) {
        console.log('\n[Modal] Email collector appeared')
        await takeScreenshot('email-modal')

        const emailInput = page.locator('input[type="email"]')
        if (await emailInput.count() > 0) {
          await emailInput.fill(PERSONA.email)
          console.log(`  Entered email: ${PERSONA.email}`)

          // Find and click the submit button
          const sendButton = page.locator('button:has-text("Send")')
          if (await sendButton.count() > 0) {
            await sendButton.click()
          } else {
            // Try form submission
            await emailInput.press('Enter')
          }

          console.log('  Submitted email')
          await page.waitForTimeout(3000)
          continue
        }
      }

      // Check phase header (new UX)
      const phaseHeader = page.locator('.fixed.top-0')
      if (await phaseHeader.count() > 0) {
        const phaseText = await phaseHeader.textContent()
        const phases = ['Exploring', 'Discovering', 'Testing', 'Ready']
        for (const phase of phases) {
          if (phaseText.includes(phase) && !testResults.phases.includes(phase)) {
            testResults.phases.push(phase)
            console.log(`  [Phase] ${phase}`)
          }
        }
      }

      // Check insights panel (new UX)
      const insightPanel = page.locator('[class*="InsightPanel"], [class*="insight"]')
      if (await insightPanel.count() > 0) {
        const insightText = await insightPanel.textContent()
        if (insightText && insightText.length > 10) {
          console.log('  [Insights] Panel visible')
        }
      }

      // Wait for advisor message
      await page.waitForTimeout(2000)

      // Get all advisor messages
      const advisorMessages = await page.$$eval('.self-start', elements =>
        elements
          .map(el => el.textContent?.trim())
          .filter(text => text && text.length > 20)
      )

      if (advisorMessages.length === 0) {
        console.log('  Waiting for advisor message...')
        await page.waitForTimeout(3000)
        continue
      }

      const latestMessage = advisorMessages[advisorMessages.length - 1]

      // Skip if already processed
      if (latestMessage === lastAdvisorMessage) {
        console.log('  Waiting for new message...')
        await page.waitForTimeout(2000)
        continue
      }

      lastAdvisorMessage = latestMessage
      console.log(`  Advisor: "${latestMessage.substring(0, 100)}${latestMessage.length > 100 ? '...' : ''}"`)

      // Add to conversation history
      conversationHistory.push({ role: 'user', content: latestMessage })

      // Generate response with Claude Haiku
      console.log('  Generating response...')

      try {
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 200,
          temperature: 0.7,
          system: PERSONA.description,
          messages: conversationHistory
        })

        const userResponse = response.content[0]?.text?.trim()
        if (!userResponse) {
          console.log('  [Warning] Empty response from Claude')
          conversationHistory.pop()
          continue
        }

        conversationHistory.push({ role: 'assistant', content: userResponse })
        console.log(`  User: "${userResponse}"`)

        // Check if input is available
        const inputSelector = 'input[placeholder="Type Message..."]'
        try {
          await page.waitForSelector(`${inputSelector}:not([disabled])`, { timeout: 5000 })
        } catch {
          console.log('  [Note] Input not available, checking for completion...')
          continue
        }

        // Type and send response
        await page.fill(inputSelector, userResponse)
        await page.waitForTimeout(300)

        const sendButton = page.locator('button.from-teal-400, button[type="submit"]').first()
        if (await sendButton.count() > 0) {
          await sendButton.click()
        } else {
          await page.locator(inputSelector).press('Enter')
        }

        // Take periodic screenshots
        if (turn % 5 === 0) {
          await takeScreenshot(`turn-${turn}`)
        }

        // Wait for AI response
        await page.waitForTimeout(CONFIG.responseTimeout / 2)

      } catch (err) {
        console.log(`  [Error] ${err.message}`)
        testResults.errors.push(err.message)
      }
    }

    // ========================================
    // STEP 4: Summary Page Verification
    // ========================================
    if (testResults.summaryReached || page.url().includes('/summary/')) {
      console.log('\n[Step 4] Summary Page Verification')
      await page.waitForTimeout(2000)

      const pageContent = await page.textContent('body')

      // Check constraint detection
      if (pageContent.includes('Execution') || pageContent.includes('Implementation')) {
        testResults.constraintDetected = 'EXECUTION'
        console.log('  [Constraint] EXECUTION detected (CORRECT)')
      } else if (pageContent.includes('Strategy') || pageContent.includes('Clarity')) {
        testResults.constraintDetected = 'STRATEGY'
        console.log('  [Constraint] STRATEGY detected')
      } else if (pageContent.includes('Energy') || pageContent.includes('Drain')) {
        testResults.constraintDetected = 'ENERGY'
        console.log('  [Constraint] ENERGY detected')
      }

      // Check for BlockersCard (new UX)
      const blockersCard = page.locator('text=Things to Consider')
      if (await blockersCard.count() > 0) {
        testResults.blockersShown = true
        console.log('  [BlockersCard] Visible')
      }

      // Check for endpoint recommendation
      if (pageContent.includes('Expert Call') || pageContent.includes('Strategy Session')) {
        testResults.endpointSelected = 'EC'
        console.log('  [Endpoint] EC recommended')
      } else if (pageContent.includes('MIST') || pageContent.includes('Implementation')) {
        testResults.endpointSelected = 'MIST'
        console.log('  [Endpoint] MIST recommended')
      }

      // Check for learning narrative
      const narrativeCard = page.locator('text=What You Discovered')
      if (await narrativeCard.count() > 0) {
        console.log('  [LearningNarrative] Visible')
      }

      await takeScreenshot('summary-final')
    }

    // ========================================
    // RESULTS
    // ========================================
    console.log('\n' + '=' .repeat(60))
    console.log('TEST RESULTS')
    console.log('=' .repeat(60))
    console.log(`\nTotal turns: ${testResults.turnCount}`)
    console.log(`Phases observed: ${testResults.phases.join(' → ') || 'None'}`)
    console.log(`Constraint detected: ${testResults.constraintDetected || 'None'}`)
    console.log(`Endpoint selected: ${testResults.endpointSelected || 'None'}`)
    console.log(`\nNew UX Features:`)
    console.log(`  - Handoff button appeared: ${testResults.handoffButtonAppeared ? 'Yes' : 'No'}`)
    console.log(`  - Summary reached: ${testResults.summaryReached ? 'Yes' : 'No'}`)
    console.log(`  - BlockersCard shown: ${testResults.blockersShown ? 'Yes' : 'No'}`)

    if (testResults.errors.length > 0) {
      console.log(`\nErrors (${testResults.errors.length}):`)
      testResults.errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
    }

    // Validation
    console.log('\n' + '=' .repeat(60))
    console.log('VALIDATION')
    console.log('=' .repeat(60))

    const passed = []
    const failed = []

    // Core flow
    if (testResults.summaryReached) {
      passed.push('Reached summary page')
    } else {
      failed.push('Did not reach summary page')
    }

    // Constraint detection
    if (testResults.constraintDetected === 'EXECUTION') {
      passed.push('Correct constraint detected (EXECUTION)')
    } else if (testResults.constraintDetected) {
      failed.push(`Wrong constraint: expected EXECUTION, got ${testResults.constraintDetected}`)
    } else {
      failed.push('No constraint detected')
    }

    // Phase transitions
    if (testResults.phases.length >= 2) {
      passed.push(`Phase transitions observed: ${testResults.phases.join(' → ')}`)
    } else {
      failed.push('Insufficient phase transitions observed')
    }

    // Handoff button (new UX)
    if (testResults.handoffButtonAppeared) {
      passed.push('Handoff button appeared (new UX)')
    }

    console.log('\nPassed:')
    passed.forEach(p => console.log(`  [PASS] ${p}`))

    if (failed.length > 0) {
      console.log('\nFailed:')
      failed.forEach(f => console.log(`  [FAIL] ${f}`))
    }

    console.log(`\nOverall: ${passed.length}/${passed.length + failed.length} checks passed`)
    console.log('=' .repeat(60))

  } catch (error) {
    console.error('\n[FATAL ERROR]', error.message)
    console.error(error.stack)
    await takeScreenshot('error')
  } finally {
    console.log('\nKeeping browser open for 10 seconds...')
    await page.waitForTimeout(10000)
    await browser.close()
    console.log('Browser closed.')
  }
}

runTest().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
