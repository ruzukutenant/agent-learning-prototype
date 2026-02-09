/**
 * Simulate Rachel's conversation to test MEDIUM READINESS PROTOCOL
 *
 * Rachel's profile:
 * - Leadership coach, 3 years in business
 * - Getting referrals but no systematic lead gen
 * - Core issue: EXECUTION (knows what to do, doesn't do it consistently)
 * - KEY TEST: After diagnosis, shows MEDIUM readiness (clear but low capacity)
 * - Should trigger explore_readiness action for 1-3 turns before routing
 */

import 'dotenv/config'
import { processConversationTurn, initializeState } from '../orchestrator/conversation/orchestrator.js'
import type { Message, ConversationState } from '../orchestrator/core/types.js'

// Rachel's responses - designed to trigger medium readiness
const RACHEL_RESPONSES = [
  // Turn 1: Business description
  "I'm a leadership coach. I work with mid-level managers who are stepping into their first director roles - helping them develop executive presence and lead teams effectively.",

  // Turn 2: How clients find you
  "Mostly referrals. I had a corporate career before this so my network has been good to me. But it's inconsistent - some months I get three referrals, some months nothing.",

  // Turn 3: Volume
  "I'm working with about 6 clients right now. Revenue is around $8k/month, but it fluctuates a lot.",

  // Turn 4: What's the bottleneck
  "Honestly, I know I need to be more visible - LinkedIn, speaking, content - but I just don't do it consistently. I'll post for two weeks, then disappear for a month.",

  // Turn 5: What happens when you disappear
  "I get busy with client work, or I tell myself I don't have time, or I just... don't feel like it. Then I feel guilty, which makes it harder to start again.",

  // Turn 6: Is this a know-how problem or doing problem?
  "Oh, I know exactly what to do. I've taken courses, I have a content calendar, I have templates. I just don't execute.",

  // Turn 7: What gets in the way
  "I think I'm afraid of being judged. Like, who am I to put myself out there? Even though I know that's irrational. My clients get great results.",

  // Turn 8: So the constraint isn't strategy
  "Right, it's not that I don't know what to do. It's that I don't do it. There's something stopping me.",

  // Turn 9: Consent gate - ready for diagnosis
  "Yes, I'd like to hear what you're seeing.",

  // Turn 10: Validation of diagnosis
  "That really resonates. It's execution - I have the strategy, I just don't follow through consistently. And yeah, the fear piece is real.",

  // Turn 11: Blockers question - HERE'S WHERE MEDIUM READINESS SHOWS
  "The thing is... I'm in the middle of a big client engagement right now. It's taking all my bandwidth. I don't know if I can realistically work on this for the next 3-4 weeks.",

  // Turn 12: Response to readiness exploration (capacity gap)
  "After this engagement wraps up mid-February, things should open up. But right now I'm barely keeping my head above water.",

  // Turn 13: What would need to shift
  "I think I just need to get through this crunch period. I'm not saying no, I'm saying not right now.",

  // Turn 14: Checking for shift
  "Yeah, I think booking something for after this engagement makes sense. I don't want to lose momentum on this realization.",

  // Turn 15: Ready to proceed
  "Yes, let's do that.",
]

async function simulateRachel() {
  console.log('='.repeat(70))
  console.log('RACHEL SIMULATION - Testing Medium Readiness Protocol')
  console.log('='.repeat(70))
  console.log('')
  console.log('Expected outcomes:')
  console.log('1. Constraint should be EXECUTION (knows what to do, doesn\'t do it)')
  console.log('2. After diagnosis + blockers, should detect MEDIUM readiness')
  console.log('3. explore_readiness action should trigger (capacity gap)')
  console.log('4. After 1-3 turns exploring, should route appropriately')
  console.log('')
  console.log('-'.repeat(70))

  // Initialize state
  let state = initializeState('Rachel')
  const history: Message[] = []

  // Add initial greeting
  const greeting = "Hey Rachel! I'm here to help you identify what's really holding your business back. Let's start: Tell me about your coaching or consulting business—what do you do and who do you serve?"
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
  let exploreReadinessTriggered = false
  let exploreReadinessTurns = 0

  for (const userResponse of RACHEL_RESPONSES) {
    turnNumber++

    // Add user message to history
    history.push({
      role: 'user',
      content: userResponse,
      turn: turnNumber,
      timestamp: new Date()
    })

    console.log(`[Turn ${turnNumber}] RACHEL: ${userResponse}\n`)

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

      // Track if explore_readiness triggered
      if (lastAction === 'explore_readiness') {
        exploreReadinessTriggered = true
        exploreReadinessTurns = state.readiness_check?.turns_exploring_readiness || 0
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
      console.log(`  → Blockers checked: ${state.readiness_check?.blockers_checked} | Exploring readiness: ${state.readiness_check?.turns_exploring_readiness}/3`)
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
  console.log(`Blockers checked: ${state.readiness_check?.blockers_checked}`)
  console.log(`Explore readiness triggered: ${exploreReadinessTriggered}`)
  console.log(`Turns in readiness exploration: ${state.readiness_check?.turns_exploring_readiness || 0}`)
  console.log('')

  // Evaluate against expected outcomes
  console.log('EVALUATION:')

  const isExecution = constraintDetected === 'execution'
  console.log(`1. Constraint = EXECUTION: ${isExecution ? '✅ PASS' : '❌ FAIL (got: ' + constraintDetected + ')'}`)

  const blockersChecked = state.readiness_check?.blockers_checked
  console.log(`2. Blockers checked: ${blockersChecked ? '✅ PASS' : '❌ FAIL'}`)

  console.log(`3. explore_readiness triggered: ${exploreReadinessTriggered ? '✅ PASS' : '❌ FAIL'}`)

  const exploredCorrectly = (state.readiness_check?.turns_exploring_readiness || 0) >= 1
  console.log(`4. Spent turns exploring readiness: ${exploredCorrectly ? '✅ PASS' : '❌ FAIL'} (${state.readiness_check?.turns_exploring_readiness || 0} turns)`)

  const reachedCompletion = state.phase === 'complete' || state.phase === 'diagnosis'
  console.log(`5. Reached completion: ${reachedCompletion ? '✅ PASS' : '⚠️ PARTIAL (phase: ' + state.phase + ')'}`)
}

// Run simulation
simulateRachel().catch(console.error)
