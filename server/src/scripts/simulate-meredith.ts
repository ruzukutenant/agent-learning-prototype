/**
 * Simulate Meredith's conversation to test orchestrator improvements
 *
 * Based on transcript from Jan 6, 2026 (45 turns)
 *
 * Meredith's profile:
 * - Side business coach, day job teaching LinkedIn lead gen
 * - Says "I don't have a strong offer" but actually has expertise
 * - Core issue: STRATEGY (unclear WHAT to offer), NOT execution
 * - Self-described "shiny object girl", moves goalposts on herself
 * - Goal: Build side business as hedge against unstable day job
 */

import 'dotenv/config'
import { processConversationTurn, initializeState } from '../orchestrator/conversation/orchestrator.js'
import type { Message, ConversationState } from '../orchestrator/core/types.js'

// Meredith's responses - based on actual transcript patterns
const MEREDITH_RESPONSES = [
  // Turn 1: Business description
  "I help solo business owners to escape the hustle by creating authentic relationship based follow up systems",

  // Turn 2: What's stuck
  "I don't feel like I have a strong offer",

  // Turn 3: What's weak about it
  "What to include and how to price... I feel a bit jealous at people who charge more - yet I can't seem to get things to sell at low prices",

  // Turn 4: What have you tried
  "An AI messaging sequence for $27. and also a week of coaching via slack - also $27",

  // Turn 5: How did people respond
  "Crickets all together",

  // Turn 6: Who were you offering to
  "One was to my email list and the other one was to 2 webinar attendees",

  // Turn 7: Email list size/engagement
  "I have about 800 people who are not terribly engaged because I don't email them all that often",

  // Turn 8: Acknowledging the pattern (not showing up)
  "It is - this is a side business to my main gig - so I get discouraged when I don't get engagement and so therefore I stop engaging myself. I recognize this and am working on it.",

  // Turn 9: Time and energy question
  "That IS part of the issue - but it's also important to build this as a hedge against my current gig which is not super stable",

  // Turn 10: Where energy goes
  "I'm doing prospecting on LinkedIn... so to say I'm not engaging when I don't email isn't completely accurate. I also post on substack and answer questions on reddit.",

  // Turn 11: Getting responses?
  "I am getting a few people showing up to webinars who I don't recognize - so there is some traction building... and a few conversations that have nowhere to go because I don't have an offer",

  // Turn 12: What problems are people bringing
  "It's usually around lead generation.... and crickets can mean a few people.... not as many as I would like... and I would say the conversations are more 'let's connect' and see where it goes vs showing interest in anything specific",

  // Turn 13: How follow-up connects to lead gen
  "yes... they are part of the same thing -- and most people leave money on the table with the lack of follow up (including me)",

  // Turn 14: Why not just offer it
  "I think that goes back to my day job teaching people how to use LinkedIn to generate leads :). But yes the follow up system is really the key because such a small sliver of people want to buy when you first approach them.",

  // Turn 15: Does "permission to sell" resonate? (The "hmmm" moment)
  "hmmm",

  // Turn 16: What's the hmmm about
  "No I think you are on track - although there is a part of me that wants to offer a mastermind, etc. etc... but you've helped me see a need that I can fill",

  // Turn 17: What would you actually do with them
  "I would look at the list of people they have, what the stages are in their follow up system - and find an easy way for them to automate that - either through software like Connect 365 - calendaring etc. I suppose I could build it for them on Notion or even Twos.app (free) but I think keeping everything super simple is important. Things I could incorporate tho are Go High Level, Send Out Cards, various email services (in the past I've been certified in Keap, Active Campaign...)",

  // Turn 18: ONE thing you'd deliver
  "We'll do a VIP day. I'll look at your pipeline, your sales process and your current tools and create a blueprint that I can implement or you can pass off to your team",

  // Turn 19: What's the hesitation
  "No hesitation other than time at the moment (not forever - but right now...).",

  // Turn 20: How much time
  "I used to do something very much like this for Active Campaign consulting. It took about 4 hours total - A lot of clients were fairly similar so I could template things out.",

  // Turn 21: Does this sound right
  "Yep... I'm a bit of a shiny object girl :)",

  // Turn 22: Price
  "$497 - refundable if they have me create their system.",

  // Additional turns for completion flow testing
  // Turn 23: Ready to proceed with diagnosis
  "Yes, that really resonates. I think you're right.",

  // Turn 24: Any blockers
  "No, I think I just need to actually do it instead of overthinking.",
]

async function simulateMeredith() {
  console.log('=' .repeat(70))
  console.log('MEREDITH SIMULATION - Testing Orchestrator Improvements')
  console.log('=' .repeat(70))
  console.log('')
  console.log('Expected outcomes with new code:')
  console.log('1. No duplicate greetings')
  console.log('2. Constraint should be STRATEGY (not execution)')
  console.log('3. Conversation should complete < 30 turns')
  console.log('4. Implicit consent ("I think you\'re on track") should be detected')
  console.log('')
  console.log('-'.repeat(70))

  // Initialize state
  let state = initializeState('Meredith')
  const history: Message[] = []

  // Add initial greeting
  const greeting = "Hey Meredith! I'm here to help you identify what's really holding your business back. Let's start: Tell me about your coaching or consulting business—what do you do and who do you serve?"
  history.push({
    role: 'assistant',
    content: greeting,
    turn: 1,
    timestamp: new Date()
  })

  console.log(`\n[Turn 1] MIRA: ${greeting}\n`)

  let turnNumber = 1
  let lastAction = ''
  let constraintDetected = ''

  for (const userResponse of MEREDITH_RESPONSES) {
    turnNumber++

    // Add user message to history
    history.push({
      role: 'user',
      content: userResponse,
      turn: turnNumber,
      timestamp: new Date()
    })

    console.log(`[Turn ${turnNumber}] USER: ${userResponse}\n`)

    try {
      // Process turn through orchestrator
      const result = await processConversationTurn(userResponse, history, state)

      // Update state
      state = result.state
      lastAction = result.decision?.action || 'unknown'

      // Track constraint hypothesis
      if (state.constraint_hypothesis) {
        constraintDetected = state.constraint_hypothesis
      }

      turnNumber++

      // Add advisor response to history
      history.push({
        role: 'assistant',
        content: result.advisorResponse,
        turn: turnNumber,
        timestamp: new Date()
      })

      // Log response with key state info
      console.log(`[Turn ${turnNumber}] MIRA (${lastAction}): ${result.advisorResponse}\n`)
      console.log(`  → Phase: ${state.phase} | Hypothesis: ${state.constraint_hypothesis || 'none'} | Validated: ${state.hypothesis_validated}`)
      console.log(`  → Consent requested: ${state.consent_state?.diagnosis_requested} | Confirmed: ${state.consent_state?.diagnosis_confirmed}`)
      console.log('')

      // Check if conversation is complete
      if (result.complete) {
        console.log('\n' + '='.repeat(70))
        console.log('CONVERSATION COMPLETE')
        console.log('='.repeat(70))
        break
      }

      // Safety check - stop after 35 turns
      if (turnNumber >= 35) {
        console.log('\n⚠️  Safety limit reached (35 turns)')
        break
      }

    } catch (error) {
      console.error(`\n❌ Error at turn ${turnNumber}:`, error)
      break
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(70))
  console.log('SIMULATION SUMMARY')
  console.log('='.repeat(70))
  console.log(`Total turns: ${turnNumber}`)
  console.log(`Final phase: ${state.phase}`)
  console.log(`Constraint detected: ${constraintDetected || 'none'}`)
  console.log(`Hypothesis validated: ${state.hypothesis_validated}`)
  console.log(`Diagnosis requested: ${state.consent_state?.diagnosis_requested}`)
  console.log(`Diagnosis confirmed: ${state.consent_state?.diagnosis_confirmed}`)
  console.log(`Blockers checked: ${state.readiness_check?.blockers_checked}`)
  console.log('')

  // Evaluate against expected outcomes
  console.log('EVALUATION:')

  const isStrategy = constraintDetected === 'strategy'
  console.log(`✓ Constraint = STRATEGY: ${isStrategy ? '✅ PASS' : '❌ FAIL (got: ' + constraintDetected + ')'}`)

  const completedInTime = turnNumber < 30
  console.log(`✓ Completed < 30 turns: ${completedInTime ? '✅ PASS' : '❌ FAIL'}`)

  const reachedDiagnosis = state.phase === 'diagnosis' || state.phase === 'complete'
  console.log(`✓ Reached diagnosis/complete: ${reachedDiagnosis ? '✅ PASS' : '❌ FAIL'}`)

  const consentDetected = state.consent_state?.diagnosis_confirmed
  console.log(`✓ Consent detected: ${consentDetected ? '✅ PASS' : '❌ FAIL'}`)
}

// Run simulation
simulateMeredith().catch(console.error)
