/**
 * Test script for Signal Session Agent
 *
 * This script simulates a conversation through the Signal Session
 * to verify the orchestrator works correctly.
 *
 * Run with: npx tsx server/src/scripts/test-signal-session.ts
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

import {
  processOpeningMessage,
  processMessage,
  getSessionSummary
} from '../agents/signal-session/index.js'
import type { SignalSessionState, Message } from '../agents/signal-session/index.js'

// Test conversation - simulating a user working through a Signal Session
const TEST_MESSAGES = [
  // Opening - user shares initial idea
  "I've been thinking about why so many coaches overcomplicate their offerings. There's something there but I haven't quite figured out what I want to say about it.",

  // Deepening - user goes deeper
  "I think the part that's hardest to say is... most coaches overcomplicate because they're scared. Scared that a simple offer won't be enough, that they'll be seen as not sophisticated enough. But the complication is actually what kills the sale.",

  // Insight crystallization - user articulates insight
  "If someone really understood this, they'd see that simplicity isn't about being unsophisticated - it's about having the courage to be seen clearly. When you hide behind complexity, you're protecting yourself from rejection, but you're also making it impossible for the right people to find you.",

  // Confirming insight
  "Yes, that's it. The courage to be seen clearly - that's the heart of it.",

  // Arc building - opening tension
  "The piece should start with that moment every coach knows - you're about to send a proposal and you add one more thing to it. One more bonus, one more feature. You tell yourself it's to add value, but really you're padding it because you're afraid the core isn't enough.",

  // Arc building - progression
  "The shift is realizing that every time you add complexity, you're actually communicating doubt. You're telling the prospect 'I'm not sure this is enough.' And that uncertainty transfers. The progression is seeing that simplicity is a confidence signal.",

  // Arc building - destination
  "By the end, they should feel permission to strip away the padding. Not because minimalism is trendy, but because they understand that a clear, simple offer is an act of confidence - and confidence sells.",

  // Arc confirmation
  "Yes, the arc feels right. It starts with the familiar behavior, reframes it as a confidence issue, and ends with permission to be simple.",

  // Brief confirmation
  "This looks right. The brief captures it well."
]

async function runTest() {
  console.log('='.repeat(60))
  console.log('SIGNAL SESSION AGENT - TEST RUN')
  console.log('='.repeat(60))
  console.log()

  // Start session
  const sessionId = 'test-' + Date.now()
  console.log(`Starting session: ${sessionId}`)
  console.log()

  try {
    // Get opening message
    const opening = await processOpeningMessage(sessionId)
    let state = opening.state
    const messages: Message[] = [{
      role: 'assistant',
      content: opening.message,
      turn_number: 1,
      timestamp: new Date()
    }]

    console.log('─'.repeat(60))
    console.log(`[TURN 1] ASSISTANT (${state.phase}):`)
    console.log(opening.message)
    console.log()

    // Process each test message
    for (let i = 0; i < TEST_MESSAGES.length; i++) {
      const userMessage = TEST_MESSAGES[i]

      // Add user message
      const userMsg: Message = {
        role: 'user',
        content: userMessage,
        turn_number: messages.length + 1,
        timestamp: new Date()
      }
      messages.push(userMsg)

      console.log('─'.repeat(60))
      console.log(`[TURN ${userMsg.turn_number}] USER:`)
      console.log(userMessage)
      console.log()

      // Process message
      const result = await processMessage(userMessage, messages.slice(0, -1), state)

      // Add assistant response
      const assistantMsg: Message = {
        role: 'assistant',
        content: result.message,
        turn_number: messages.length + 1,
        timestamp: new Date()
      }
      messages.push(assistantMsg)

      // Update state
      state = result.state

      console.log(`[TURN ${assistantMsg.turn_number}] ASSISTANT (${state.phase}):`)
      console.log(`Action: ${result.decision.action}`)
      console.log(`Reasoning: ${result.decision.reasoning}`)
      console.log()
      console.log(result.message)
      console.log()

      // Check for phase transition
      if (result.decision.phase_transition) {
        console.log(`>>> PHASE TRANSITION: ${result.decision.phase_transition}`)
        console.log()
      }

      // Check for completion
      if (result.complete) {
        console.log('='.repeat(60))
        console.log('SESSION COMPLETE')
        console.log('='.repeat(60))

        if (result.brief) {
          console.log()
          console.log('GENERATED BRIEF:')
          console.log(JSON.stringify(result.brief, null, 2))
        }

        break
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Print final summary
    console.log()
    console.log('='.repeat(60))
    console.log('SESSION SUMMARY')
    console.log('='.repeat(60))
    const summary = getSessionSummary(state)
    console.log(`Phase: ${summary.phase}`)
    console.log(`Total Turns: ${summary.turn}`)
    console.log(`Has Insight: ${summary.hasInsight}`)
    console.log(`Has Arc: ${summary.hasArc}`)
    console.log(`Has Brief: ${summary.hasBrief}`)

    if (state.confirmed_insight) {
      console.log()
      console.log('Confirmed Insight:')
      console.log(state.confirmed_insight)
    }

    if (state.arc_opening) {
      console.log()
      console.log('Arc:')
      console.log(`- Opening: ${state.arc_opening}`)
      console.log(`- Progression: ${state.arc_progression}`)
      console.log(`- Destination: ${state.arc_destination}`)
    }

  } catch (error) {
    console.error('Test failed:', error)
    process.exit(1)
  }
}

// Run the test
runTest().then(() => {
  console.log()
  console.log('Test completed successfully!')
  process.exit(0)
}).catch(error => {
  console.error('Test error:', error)
  process.exit(1)
})
