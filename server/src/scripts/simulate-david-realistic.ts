/**
 * Realistic David Simulation - More natural conversation flow
 *
 * This version of David is:
 * - Not unrealistically eager to "get to next steps"
 * - Takes time to process and think
 * - Asks clarifying questions
 * - Shows natural conversation pacing
 * - Only asks for next steps when genuinely ready (near end of conversation)
 *
 * Tests that the system can handle a more realistic user who isn't
 * constantly pushing to close.
 */

// Load env FIRST before any other imports (Gemini client initializes at import time)
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: resolve(__dirname, '../../../.env') })

// Now import modules that depend on env vars
const { processConversationTurn, initializeState } = await import('../orchestrator/conversation/orchestrator.js')
const { geminiFlashChat } = await import('../orchestrator/core/gemini-client.js')

import type { Message } from '../orchestrator/core/types.js'

// Realistic David persona - natural conversation flow
const DAVID_PERSONA = `You are David, a 34-year-old fitness and nutrition coach having a conversation with a business advisor named Mira.

## Your Background
- Former personal trainer at Equinox for 6 years
- Started your own online coaching business 2 years ago
- You specialize in busy executives (40-55) who want to get in shape without spending hours at the gym
- You're confident, direct, and good at what you do

## Your Current Business Situation
- You have 12 active clients (your max capacity)
- Revenue: $9,600/month ($800/client)
- Your clients get great results - you have tons of testimonials

## Your Core Problem (EXECUTION)
- You are drowning in operational work
- Every client gets: custom meal plans, custom workout programs, weekly check-ins, Slack access
- You personally write every meal plan, every workout, respond to every message
- You're working 60+ hours a week and can't take on more clients
- You've had to turn away 5 potential clients this month alone

## Your Current Frustration
- You've tried to hire a VA twice but failed because you don't have documented processes
- You know you need to systematize but "there's no time" to build systems
- Every hour spent on systems is an hour not serving clients

## How You Talk
- Direct and no-nonsense - you don't sugarcoat
- Practical and action-oriented
- A bit frustrated but not overly emotional
- You might say things like "I know what I need to do, I just can't find the time"

## CRITICAL: REALISTIC CONVERSATION BEHAVIOR

**DO NOT be unrealistically eager.** You are having a natural conversation, not rushing to close a deal.

**Natural conversation patterns you should follow:**
1. Answer questions thoughtfully - don't immediately ask "what's next?"
2. Take time to process insights - say things like "Hmm, that's an interesting way to put it" or "Let me think about that"
3. Ask clarifying questions when something isn't clear
4. Share more context when it's relevant
5. Reflect on what Mira says before responding
6. Sometimes just acknowledge what was said without asking for more

**DO NOT:**
- Ask "what's the next step?" or "show me what's next" until the very end of the conversation
- Say "I'm ready" prematurely - let the conversation develop naturally
- Rush through the diagnostic process
- Act like you're in a hurry to get to a sales pitch

**Examples of natural responses (USE THESE):**
- "Yeah, that's basically it. The meal plans are killing me."
- "Hmm, I hadn't thought about it that way before."
- "What do you mean by that?"
- "Right, exactly. And on top of that..."
- "That makes sense. I've actually tried something similar before."
- "I'm not sure I follow - can you explain what you mean?"

**Examples of responses that are TOO EAGER (AVOID):**
- "What's the next step?"
- "Show me what you've got"
- "I'm ready to move forward"
- "Let's do it"
- "Sounds good, what's next?"

**Only near the END of conversation (after diagnosis has been clearly shared and you genuinely agree):**
- Then you can start being more direct about wanting to proceed
- But even then, be natural: "Okay, so what would working with someone on this actually look like?"

## CRITICAL: How to respond to offers/closing

**DO NOT reference things Mira hasn't mentioned yet:**
- If Mira hasn't shown a booking link, DO NOT say "I'll check out the link" or "I'll book the call"
- If Mira hasn't mentioned a summary, DO NOT say "I'll look at the summary"
- Only reference specific things after Mira explicitly mentions them

**When Mira offers a free call or consultation:**
- Natural response: "Yeah, that sounds helpful" or "I'd be interested in that"
- DO NOT: "I'll book the call right now" or "I'll click the link" (there may not be a link yet)

**When Mira asks if you want her to arrange something:**
- Natural response: "Yeah, set that up" or "Sure, let's do it"
- DO NOT: Immediately try to end the conversation with goodbye language

**DO NOT use premature goodbye language:**
- Never say "Thanks, Mira" or "Talk soon" until the conversation is truly ending
- Never say "I'll take care of it" or "I'll handle it from here" before Mira wraps up
- The conversation continues until Mira gives a final message

## If Mira asks about mindset/psychology blocks
Redirect politely: "I appreciate the question, but this isn't a mindset thing. I just need more hours in the day or someone to help with the work."

FORMATTING RULES:
- Keep responses between 20-60 words typically
- No theatrical directions like "*nods*" or "*pauses*"
- Write like a real person texting - casual, direct, authentic
- ALWAYS complete your thoughts

You're having a real, thoughtful conversation - not rushing to get somewhere.`

/**
 * Generate David's response using Gemini Flash
 */
async function generateDavidResponse(
  miraMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {

  // Build the conversation for David's perspective
  const davidPerspective = conversationHistory.map(msg => ({
    role: (msg.role === 'user' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: msg.content
  }))

  // Add Mira's latest message
  davidPerspective.push({
    role: 'user',
    content: miraMessage
  })

  const response = await geminiFlashChat(
    DAVID_PERSONA,
    davidPerspective,
    {
      maxTokens: 150,
      temperature: 0.7,
      personaName: 'David',
      otherPartyName: 'Mira'
    }
  )

  return response
}

async function simulateDavidRealistic() {
  console.log('='.repeat(70))
  console.log('REALISTIC DAVID SIMULATION - Natural Conversation Flow')
  console.log('='.repeat(70))
  console.log('')
  console.log('This David is:')
  console.log('- NOT unrealistically eager for "next steps"')
  console.log('- Takes time to think and process')
  console.log('- Has natural conversation pacing')
  console.log('- Only asks for next steps when genuinely ready')
  console.log('')
  console.log('Testing:')
  console.log('- Can the system handle a realistic user?')
  console.log('- Does it still reach completion naturally?')
  console.log('- Are the fixes working (no redundant questions)?')
  console.log('')
  console.log('-'.repeat(70))

  // Initialize state
  let state = initializeState('David')
  const history: Message[] = []
  const davidHistory: { role: 'user' | 'assistant'; content: string }[] = []

  // Add initial greeting
  const greeting = "Hey David! I'm here to help you identify what's really holding your business back. Let's start with the basics - tell me about your coaching business. What do you do and who do you help?"

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

  const MAX_TURNS = 50

  while (turnNumber < MAX_TURNS) {
    turnNumber++

    // Generate David's response using LLM
    console.log('[Generating David response...]')
    const davidResponse = await generateDavidResponse(
      history[history.length - 1].content,
      davidHistory
    )

    // Add to histories
    history.push({
      role: 'user',
      content: davidResponse,
      turn: turnNumber,
      timestamp: new Date()
    })
    davidHistory.push({ role: 'user', content: history[history.length - 2].content })
    davidHistory.push({ role: 'assistant', content: davidResponse })

    console.log(`[Turn ${turnNumber}] DAVID: ${davidResponse}\n`)

    try {
      // Process turn through orchestrator
      const result = await processConversationTurn(davidResponse, history, state)

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
      console.log(`  → Phase: ${state.phase} | Hypothesis: ${state.constraint_hypothesis || 'none'} | Confidence: ${(state.hypothesis_confidence || 0).toFixed(2)}`)
      console.log(`  → Readiness: clarity=${state.readiness?.clarity}, confidence=${state.readiness?.confidence}, capacity=${state.readiness?.capacity}`)
      console.log(`  → Blockers checked: ${state.readiness_check?.blockers_checked} | Ground coverage: ${(state.conversation_memory?.ground_covered_score || 0).toFixed(2)}`)
      console.log('')

      // Check if conversation is complete
      if (result.complete || state.closing_sequence?.closing_arc_complete) {
        console.log('\n' + '='.repeat(70))
        console.log('CONVERSATION COMPLETE')
        if (state.closing_sequence?.closing_arc_complete) {
          console.log('(view_summary component would appear here)')
        }
        console.log('='.repeat(70))
        break
      }

    } catch (error) {
      console.error(`\n❌ Error at turn ${turnNumber}:`, error)
      break
    }
  }

  if (turnNumber >= MAX_TURNS) {
    console.log('\n⚠️  Max turns reached (40)')
  }

  // Final summary
  console.log('\n' + '='.repeat(70))
  console.log('SIMULATION SUMMARY')
  console.log('='.repeat(70))
  console.log(`Total turns: ${turnNumber}`)
  console.log(`Final phase: ${state.phase}`)
  console.log(`Constraint detected: ${constraintDetected || 'none'}`)
  console.log(`Constraint confidence: ${(state.hypothesis_confidence || 0).toFixed(2)}`)
  console.log(`Hypothesis validated: ${state.hypothesis_validated}`)
  console.log(`Final readiness: clarity=${state.readiness?.clarity}, confidence=${state.readiness?.confidence}, capacity=${state.readiness?.capacity}`)
  console.log(`Blockers checked: ${state.readiness_check?.blockers_checked}`)
  console.log(`Explore readiness triggered: ${exploreReadinessTriggered}`)
  console.log(`Turns in readiness exploration: ${state.readiness_check?.turns_exploring_readiness || 0}`)
  console.log(`Diagnosis delivered: ${state.diagnosis_delivered}`)
  console.log(`Closing sequence phase: ${state.closing_sequence?.phase || 'not_started'}`)
  console.log('')

  // Evaluate against expected outcomes
  console.log('EVALUATION:')

  const isExecution = constraintDetected === 'execution'
  console.log(`1. Constraint = EXECUTION: ${isExecution ? '✅ PASS' : '❌ FAIL (got: ' + constraintDetected + ')'}`)

  const notPsychology = constraintDetected !== 'psychology'
  console.log(`2. Did NOT drift to PSYCHOLOGY: ${notPsychology ? '✅ PASS' : '❌ FAIL'}`)

  const notStrategy = constraintDetected !== 'strategy'
  console.log(`3. Did NOT drift to STRATEGY: ${notStrategy ? '✅ PASS' : '❌ FAIL'}`)

  const diagnosisDelivered = state.diagnosis_delivered
  console.log(`4. Diagnosis delivered: ${diagnosisDelivered ? '✅ PASS' : '❌ FAIL'}`)

  const blockersChecked = state.readiness_check?.blockers_checked
  console.log(`5. Blockers checked: ${blockersChecked ? '✅ PASS' : '⚠️ May have been skipped (user said no blockers)'}`)

  const naturalFlow = turnNumber >= 15 && turnNumber <= 45
  console.log(`6. Natural conversation length (15-45 turns): ${naturalFlow ? '✅ PASS' : '⚠️ ' + turnNumber + ' turns'}`)

  const reachedCompletion = state.phase === 'complete' || state.closing_sequence?.closing_arc_complete
  console.log(`7. Reached completion: ${reachedCompletion ? '✅ PASS' : '⚠️ PARTIAL (phase: ' + state.phase + ')'}`)

  // Export transcript
  const transcriptPath = `/tmp/david-realistic-${Date.now()}.log`
  const fs = await import('fs')
  const transcript = history.map(m =>
    `[Turn ${m.turn}] ${m.role === 'assistant' ? 'MIRA' : 'DAVID'}: ${m.content}`
  ).join('\n\n')
  fs.writeFileSync(transcriptPath, transcript)
  console.log(`\nTranscript saved to: ${transcriptPath}`)
}

// Run simulation
simulateDavidRealistic().catch(console.error)
