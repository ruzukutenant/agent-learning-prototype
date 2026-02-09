/**
 * Simulate Marcus's conversation to test STRATEGY constraint path
 *
 * Marcus's profile:
 * - Career transition coach, 18 months in business
 * - Has skills and some clients, but unclear positioning
 * - Core issue: STRATEGY (doesn't know who he really serves or what makes him different)
 * - Keeps pivoting between niches, can't commit to one direction
 * - Should trigger validation, diagnosis consent, and clean closing flow
 */

import 'dotenv/config'
import { processConversationTurn, initializeState } from '../orchestrator/conversation/orchestrator.js'
import type { Message, ConversationState } from '../orchestrator/core/types.js'

// Marcus's responses - designed to reveal strategy/positioning confusion
const MARCUS_RESPONSES = [
  // Turn 1: Business description - vague positioning
  "I'm a career coach. I help people figure out their next career move - whether that's a promotion, a pivot, or starting something new.",

  // Turn 2: Who specifically
  "Honestly, it's been all over the place. I've worked with mid-career professionals, recent grads, executives... whoever shows up.",

  // Turn 3: How clients find you
  "Mostly through LinkedIn. I post content and people reach out. But it feels random - I never know who's going to message me next.",

  // Turn 4: Scale
  "I'm doing about 4-5 clients at a time. Charging around $150/session, so maybe $3-4k a month. It's not bad but I want to grow.",

  // Turn 5: What's the challenge
  "I feel like I'm spinning. I've tried niching down - tech workers, then women in leadership, then career changers over 40. Nothing sticks.",

  // Turn 6: What happens when you try to niche
  "I'll commit to one thing, start creating content for it, then I'll get a client who's totally different and think 'maybe I should serve them instead.' And then I'm back to square one.",

  // Turn 7: Exploring the pattern
  "I think I'm afraid of missing out on clients. If I say I only work with tech workers, what about the marketing person who reaches out? I don't want to turn away money.",

  // Turn 8: Going deeper
  "Yeah, I guess I don't really know who I'm BEST at helping. They all seem fine. I get decent results with everyone.",

  // Turn 9: What makes it hard to choose
  "When I think about picking one niche, I feel... trapped? Like I'm closing doors. But I also know that trying to serve everyone means my message is generic.",

  // Turn 10: Consent for diagnosis
  "Yes, I'd like to hear what you think is going on.",

  // Turn 11: Response to diagnosis
  "That makes sense. I've been treating this like a marketing problem - 'just pick a niche' - but really I don't actually know what I want.",

  // Turn 12: Blockers question
  "Honestly, I think the main thing stopping me is fear. Fear of choosing wrong. Fear of committing and it not working out.",

  // Turn 13: Ready to proceed
  "Yes, I think I need help with this. I've been going in circles on my own for over a year.",

  // Turn 14: Final confirmation
  "That sounds right. Let's do it.",
]

async function simulateMarcus() {
  console.log('='.repeat(70))
  console.log('MARCUS SIMULATION - Testing Strategy Constraint Path')
  console.log('='.repeat(70))
  console.log('')
  console.log('Expected outcomes:')
  console.log('1. Constraint should be STRATEGY (unclear positioning/direction)')
  console.log('2. No premature CTAs during exploration')
  console.log('3. Diagnosis consent gate should trigger')
  console.log('4. Clean closing with handoff')
  console.log('5. Response validator should catch any violations')
  console.log('')
  console.log('-'.repeat(70))

  // Initialize state
  let state = initializeState('Marcus')
  const history: Message[] = []

  // Add initial greeting
  const greeting = "Hey Marcus! I'm here to help you identify what's really holding your business back. Let's start: Tell me about your coaching or consulting business—what do you do and who do you serve?"
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
  let ctaViolations = 0
  let diagnosisConsentRequested = false
  let diagnosisDelivered = false
  let closingReached = false

  for (const userResponse of MARCUS_RESPONSES) {
    turnNumber++

    // Add user message to history
    history.push({
      role: 'user',
      content: userResponse,
      turn: turnNumber,
      timestamp: new Date()
    })

    console.log(`[Turn ${turnNumber}] MARCUS: ${userResponse}\n`)

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

      // Track key milestones
      if (lastAction === 'request_diagnosis_consent') {
        diagnosisConsentRequested = true
      }
      if (lastAction === 'diagnose') {
        diagnosisDelivered = true
      }
      if (lastAction === 'complete_with_handoff') {
        closingReached = true
      }

      // Check for CTA violations in non-closing responses
      const nonClosingActions = ['explore', 'reflect_insight', 'validate', 'surface_contradiction',
                                  'deepen', 'contain', 'build_criteria', 'stress_test',
                                  'pre_commitment_check', 'explore_readiness', 'check_blockers']
      if (nonClosingActions.includes(lastAction)) {
        // More specific patterns to avoid false positives
        const ctaPatterns = /click below|book a call|schedule a call|see your summary|your personalized summary|the next step is to|here's the next step/i
        if (ctaPatterns.test(result.advisorResponse)) {
          ctaViolations++
          console.log(`  ⚠️ CTA VIOLATION detected in ${lastAction} response!`)
        }
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
      console.log(`  → Readiness: clarity=${state.readiness?.clarity}, confidence=${state.readiness?.confidence}, capacity=${state.readiness?.capacity}`)
      console.log(`  → Consent: requested=${state.consent_state?.diagnosis_requested}, confirmed=${state.consent_state?.diagnosis_confirmed}`)
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
  console.log(`Final readiness: clarity=${state.readiness?.clarity}, confidence=${state.readiness?.confidence}, capacity=${state.readiness?.capacity}`)
  console.log(`Diagnosis consent requested: ${diagnosisConsentRequested}`)
  console.log(`Diagnosis delivered: ${diagnosisDelivered}`)
  console.log(`Closing reached: ${closingReached}`)
  console.log(`CTA violations in non-closing turns: ${ctaViolations}`)
  console.log('')

  // Evaluate against expected outcomes
  console.log('EVALUATION:')

  const isStrategy = constraintDetected === 'strategy'
  console.log(`1. Constraint = STRATEGY: ${isStrategy ? '✅ PASS' : '❌ FAIL (got: ' + constraintDetected + ')'}`)

  console.log(`2. CTA violations: ${ctaViolations === 0 ? '✅ PASS (0 violations)' : '❌ FAIL (' + ctaViolations + ' violations)'}`)

  console.log(`3. Diagnosis consent gate: ${diagnosisConsentRequested ? '✅ PASS' : '⚠️ NOT TRIGGERED'}`)

  console.log(`4. Diagnosis delivered: ${diagnosisDelivered ? '✅ PASS' : '⚠️ NOT REACHED'}`)

  const completedSuccessfully = state.phase === 'complete' || closingReached
  console.log(`5. Reached completion: ${completedSuccessfully ? '✅ PASS' : '⚠️ PARTIAL (phase: ' + state.phase + ')'}`)

  // Overall assessment
  console.log('')
  const passCount = [isStrategy, ctaViolations === 0, diagnosisConsentRequested, diagnosisDelivered, completedSuccessfully].filter(Boolean).length
  console.log(`OVERALL: ${passCount}/5 criteria passed`)
}

// Run simulation
simulateMarcus().catch(console.error)
