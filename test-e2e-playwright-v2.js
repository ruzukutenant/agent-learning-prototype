/**
 * E2E Playwright Test v2 - Realistic Coach Persona
 *
 * Uses the proven persona prompting pattern from test-e2e-priya-dynamic.js
 * with Playwright for full UI verification including new UX features.
 */

const { chromium } = require('playwright')
const Anthropic = require('@anthropic-ai/sdk')
require('dotenv').config()

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Realistic coach persona based on actual Reddit coach language
const PERSONA = {
  name: 'Rachel',
  email: 'rachel.test@example.com',
  expectedConstraint: 'strategy',

  description: `You are typing messages as Rachel in a text chat with a business advisor.

CRITICAL: This is a TEXT CHAT. Type only what you'd actually send in Slack or iMessage. No asterisks, no actions, no narration. Just plain text like a real person.

WHO YOU ARE:
- Rachel, 36, career transition coach
- Left corporate HR 18 months ago to start coaching
- Invested $6K in coaching certification
- Making around $2K/month, still doing HR consulting on the side
- ICF trained but they didn't teach you the business side

YOUR SITUATION (based on real coach struggles):
- You're good at actual coaching but hate the business/marketing side
- You've tried LinkedIn posts, a webinar, networking events - get likes but no clients
- Changed your niche 3 times trying to find what works
- No clear offer - sometimes packages, sometimes hourly
- Starting to wonder if you should just go back to corporate

ACTUAL PHRASES COACHES USE (use these naturally):
- "I'm good at the coaching part, it's the business side I struggle with"
- "I get engagement on posts but nobody actually books calls"
- "I've changed my niche like 3 times and nothing seems to stick"
- "The training didn't really cover marketing at all"
- "I keep trying different things but I'm basically winging it"
- "I can't figure out what makes me different from every other coach"
- "Marketing feels so unnatural to me"
- "I'm kind of allergic to the whole sales thing"

HOW TO RESPOND:
- 1-2 sentences max. Like a text message.
- Direct and matter-of-fact
- Frustrated but not dramatic
- Answer the question, don't overexplain

GOOD EXAMPLES:
- "About 18 months. Still doing some HR stuff on the side to pay bills."
- "Honestly I've changed my niche like 3 times. Nothing sticks."
- "I'm good at the coaching. It's getting people to sign up that's hard."
- "Yeah that's it. I keep trying stuff instead of committing to one thing."
- "The business side just doesn't come naturally to me."

NEVER DO THIS:
- "*sighs*" or any actions in asterisks
- "I feel a realization washing over me" or any narration
- Paragraphs of backstory
- Therapy-speak or overly introspective language`
}

const CONFIG = {
  baseUrl: 'http://localhost:5173',
  maxTurns: 35,  // More turns to allow conversation to complete
  screenshotPrefix: 'e2e-v2'
}

const results = {
  turnCount: 0,
  phases: [],
  constraint: null,
  handoffButtonSeen: false,
  summaryReached: false,
  errors: []
}

console.log('='.repeat(60))
console.log('E2E PLAYWRIGHT TEST v2 - Realistic Coach Persona')
console.log('='.repeat(60))
console.log(`Persona: ${PERSONA.name} (Career Transition Coach)`)
console.log('Expected: STRATEGY constraint (lack of clear positioning)')
console.log('='.repeat(60) + '\n')

async function generateResponse(conversationHistory, advisorMessage) {
  const historyContext = conversationHistory
    .slice(-6)
    .map(m => `${m.role === 'advisor' ? 'Advisor' : 'Rachel'}: ${m.text}`)
    .join('\n')

  const prompt = `${PERSONA.description}

CONVERSATION SO FAR:
${historyContext || '(Starting conversation)'}

ADVISOR JUST SAID:
"${advisorMessage}"

Type your reply as Rachel. Plain text only, 1-3 sentences max.`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 150,
    temperature: 0.7,
    messages: [{ role: 'user', content: prompt }]
  })

  return response.content[0]?.text?.trim() || "I'm not sure what to say to that."
}

async function runTest() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  })

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  let conversationHistory = []
  let lastAdvisorMessage = null
  let screenshotNum = 0

  const screenshot = async (name) => {
    screenshotNum++
    const path = `screenshots/${CONFIG.screenshotPrefix}-${String(screenshotNum).padStart(2, '0')}-${name}.png`
    await page.screenshot({ path })
    console.log(`  [Screenshot: ${path}]`)
  }

  try {
    // === LANDING PAGE ===
    console.log('\n[1] Landing Page')
    await page.goto(CONFIG.baseUrl)
    await page.waitForLoadState('networkidle')
    await screenshot('landing')

    // Click start button
    const startBtn = page.locator('button:has-text("Find My Next Step")')
    if (await startBtn.count() > 0) {
      await startBtn.click()
    } else {
      await page.locator('text=Start a new assessment').click()
    }
    await page.waitForURL('**/interview**', { timeout: 5000 })

    // === NAME ENTRY ===
    console.log('\n[2] Name Entry')
    await page.fill('input[placeholder="First Name"]', PERSONA.name)
    await screenshot('name')
    await page.click('button:has-text("Start Assessment")')
    await page.waitForURL('**/chat/**', { timeout: 10000 })
    console.log(`  Entered: ${PERSONA.name}`)

    // === CONVERSATION ===
    console.log('\n[3] Conversation')

    for (let turn = 1; turn <= CONFIG.maxTurns; turn++) {
      results.turnCount = turn
      const url = page.url()

      // Check for summary page
      if (url.includes('/summary/')) {
        console.log('\n[COMPLETE] Reached summary page')
        results.summaryReached = true
        await screenshot('summary')
        break
      }

      // Check for handoff button (new UX)
      const handoffBtn = page.locator('button:has-text("View Your Summary")')
      if (await handoffBtn.count() > 0) {
        console.log('\n[NEW UX] Handoff button appeared!')
        results.handoffButtonSeen = true
        await screenshot('handoff-button')
        await handoffBtn.click()
        await page.waitForTimeout(2000)
        continue
      }

      // Check for email modal
      const emailModal = page.locator('text=Save Your Progress')
      if (await emailModal.count() > 0) {
        console.log('\n[Modal] Email collection')
        await screenshot('email-modal')
        const emailInput = page.locator('input[type="email"]')
        if (await emailInput.count() > 0) {
          await emailInput.fill(PERSONA.email)
          const sendBtn = page.locator('button:has-text("Send")')
          if (await sendBtn.count() > 0) await sendBtn.click()
          else await emailInput.press('Enter')
          console.log(`  Email: ${PERSONA.email}`)
          await page.waitForTimeout(3000)
          continue
        }
      }

      // Check phase header
      const header = page.locator('.fixed.top-0')
      if (await header.count() > 0) {
        const text = await header.textContent()
        for (const phase of ['Exploring', 'Discovering', 'Testing', 'Ready']) {
          if (text.includes(phase) && !results.phases.includes(phase)) {
            results.phases.push(phase)
            console.log(`  [Phase: ${phase}]`)
          }
        }
      }

      await page.waitForTimeout(2000)

      // Get advisor messages
      const messages = await page.$$eval('.self-start', els =>
        els.map(el => el.textContent?.trim()).filter(t => t && t.length > 20)
      )

      if (messages.length === 0) {
        await page.waitForTimeout(2000)
        continue
      }

      const latestMsg = messages[messages.length - 1]
      if (latestMsg === lastAdvisorMessage) {
        await page.waitForTimeout(2000)
        continue
      }

      lastAdvisorMessage = latestMsg
      console.log(`\n--- Turn ${turn} ---`)
      console.log(`Advisor: "${latestMsg.substring(0, 100)}${latestMsg.length > 100 ? '...' : ''}"`)

      conversationHistory.push({ role: 'advisor', text: latestMsg })

      // Generate response
      const userReply = await generateResponse(conversationHistory, latestMsg)
      conversationHistory.push({ role: 'user', text: userReply })
      console.log(`${PERSONA.name}: "${userReply}"`)

      // Send message
      try {
        await page.waitForSelector('input[placeholder="Type Message..."]:not([disabled])', { timeout: 5000 })
        await page.fill('input[placeholder="Type Message..."]', userReply)
        await page.waitForTimeout(300)

        const sendBtn = page.locator('button.from-teal-400').first()
        if (await sendBtn.count() > 0) await sendBtn.click()
        else await page.locator('input[placeholder="Type Message..."]').press('Enter')

        if (turn % 5 === 0) await screenshot(`turn-${turn}`)
        await page.waitForTimeout(8000) // Wait for AI response
      } catch (e) {
        console.log(`  [Input unavailable - checking completion]`)
        continue
      }
    }

    // === SUMMARY VERIFICATION ===
    if (results.summaryReached || page.url().includes('/summary/')) {
      console.log('\n[4] Summary Verification')
      await page.waitForTimeout(2000)
      const content = await page.textContent('body')

      if (content.includes('Strategy') || content.includes('Clarity')) {
        results.constraint = 'STRATEGY'
      } else if (content.includes('Execution') || content.includes('Implementation')) {
        results.constraint = 'EXECUTION'
      } else if (content.includes('Energy') || content.includes('Drain')) {
        results.constraint = 'ENERGY'
      }

      // Check for new UX components
      const blockersCard = await page.locator('text=Things to Consider').count()
      const learningNarrative = await page.locator('text=What You Discovered').count()

      console.log(`  Constraint: ${results.constraint || 'Unknown'}`)
      console.log(`  BlockersCard: ${blockersCard > 0 ? 'Yes' : 'No'}`)
      console.log(`  LearningNarrative: ${learningNarrative > 0 ? 'Yes' : 'No'}`)

      await screenshot('summary-final')
    }

    // === RESULTS ===
    console.log('\n' + '='.repeat(60))
    console.log('RESULTS')
    console.log('='.repeat(60))
    console.log(`Turns: ${results.turnCount}`)
    console.log(`Phases: ${results.phases.join(' → ') || 'None'}`)
    console.log(`Constraint: ${results.constraint || 'Not detected'}`)
    console.log(`Handoff button: ${results.handoffButtonSeen ? 'Yes' : 'No'}`)
    console.log(`Summary reached: ${results.summaryReached ? 'Yes' : 'No'}`)

    // Validation
    console.log('\n' + '='.repeat(60))
    console.log('VALIDATION')
    console.log('='.repeat(60))

    const checks = []
    if (results.summaryReached) checks.push('[PASS] Reached summary')
    else checks.push('[FAIL] Did not reach summary')

    if (results.constraint === 'STRATEGY') checks.push('[PASS] Correct constraint (STRATEGY)')
    else if (results.constraint) checks.push(`[WARN] Constraint: ${results.constraint} (expected STRATEGY)`)
    else checks.push('[FAIL] No constraint detected')

    if (results.phases.length >= 2) checks.push(`[PASS] Phase transitions: ${results.phases.join(' → ')}`)
    else checks.push('[WARN] Limited phase transitions')

    checks.forEach(c => console.log(c))
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n[ERROR]', error.message)
    results.errors.push(error.message)
    await screenshot('error')
  } finally {
    console.log('\nBrowser staying open for 10s...')
    await page.waitForTimeout(10000)
    await browser.close()
  }
}

runTest().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
