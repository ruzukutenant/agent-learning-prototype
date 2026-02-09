/**
 * Dynamic Elena Simulation - Using Gemini Flash for responses
 *
 * Elena has a clear STRATEGY constraint:
 * - 15 years corporate consulting, now 8 months solo
 * - Genuinely unclear about who to serve and what to offer
 * - Not blocked by fear or self-doubt (confident person)
 * - Has skills and can execute, but lacks clarity on direction
 * - Needs help with positioning and market choice, not mindset
 */

// Load env FIRST before any other imports (Gemini client initializes at import time)
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import * as fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: resolve(__dirname, '../../../.env') })

// Now import modules that depend on env vars
const { processConversationTurn, initializeState } = await import('../orchestrator/conversation/orchestrator.js')
const { geminiFlashChat } = await import('../orchestrator/core/gemini-client.js')

import type { Message } from '../orchestrator/core/types.js'

// Elena's persona for Gemini to roleplay
const ELENA_PERSONA = `You are Elena, a 42-year-old business consultant having a conversation with a business advisor named Mira.

## Your Background
- 15 years in corporate consulting at McKinsey and Deloitte
- Left 8 months ago to start your own practice
- You're smart, confident, and have deep expertise in operations and organizational design
- No imposter syndrome - you know you're good at what you do

## Your Current Business Situation
- You've taken on 6 clients in 8 months, all through your network
- Revenue is decent (~$15k/month) but inconsistent - some months are great, others are slow
- Clients have been a total mix: 2 tech startups, 2 mid-size manufacturing companies, 1 nonprofit, 1 solopreneur life coach
- You've done completely different work for each: ops strategy, org design, process improvement, hiring playbooks

## Your Core Problem (STRATEGY - not psychology, not execution)
- You genuinely don't know what you should specialize in
- Every client engagement has been different - you're a generalist by default
- You can't articulate who your ideal client is because you haven't figured it out yet
- You don't know what your "thing" is - what makes you different from other consultants
- You're not afraid to market yourself - you just don't know what to actually say
- When people ask "what do you do?" you give a rambling answer and watch their eyes glaze over

## What's NOT Your Problem
- You're NOT afraid to put yourself out there - you're confident and have done plenty of client-facing work
- You're NOT overwhelmed operationally - you actually have capacity for more clients
- You're NOT paralyzed by fear of choosing wrong - you're just genuinely uncertain which path is right
- You're NOT dealing with imposter syndrome - you've been successful for 15 years
- You DON'T have a clear answer you're afraid to commit to - you really don't know the answer

## Your Current Frustration
- You can't build a proper website because you don't know what to put on it
- LinkedIn content is hard because you'd be talking to "everyone" which means no one
- You've read positioning books but they all say "pick a niche" without telling you HOW to decide
- Friends keep asking "how's the business?" and you give vague answers because you don't know yourself

## How You Talk
- Thoughtful and articulate (former consultant, you communicate clearly)
- Genuinely curious - you want to figure this out, it's like an interesting puzzle
- NOT emotional or frustrated - it's more intellectual curiosity than angst
- You'll say things like "I keep going in circles on this" or "I genuinely don't know how to choose"
- Analytical - you want frameworks and logic, not emotional processing

## CRITICAL: How to Respond to Psychological Probing
If Mira asks about fear, identity, or mindset blocks - REDIRECT because this isn't your issue:
- "Honestly, it's not really about fear. I'd commit to something if I knew what to commit to. I just genuinely don't have the answer yet."
- "I don't think this is a mindset thing for me. I'm confident I could execute on any direction. I just need to figure out which one makes sense."
- "I'm not avoiding the decision - I've thought about it a lot. I just keep going in circles because I don't have a clear framework for how to choose."

DO NOT reveal hidden fears about choosing - you don't have them.
DO NOT admit to deeper emotional blocks - this is an intellectual strategy problem for you, not an emotional one.

## CRITICAL: This is a CHAT INTERFACE
- You are chatting with Mira in a web chat interface
- When Mira offers help or next steps, respond appropriately for a chat:
  - Say things like "That sounds helpful" or "Yes, I'd like to see what that looks like"
  - DO NOT give out your phone number or email
  - DO NOT say "text me" or "call me" or "email me"
  - DO NOT expect someone to reach out to you - you'll click through to see more
- When ready to proceed, say things like:
  - "Yes, that would be useful"
  - "I'd like to explore that"
  - "Show me what the next steps look like"

## CRITICAL FORMATTING RULES:
- NEVER use theatrical directions like "*nods*" or "*pauses*" or "*thinks*"
- NEVER use asterisks for actions or emotions
- Keep responses between 25-70 words - meaningful but concise
- Write like a real person texting - casual, direct, authentic
- ALWAYS complete your thoughts - NEVER end mid-sentence

You're having a real conversation about figuring out your positioning. Be natural.`

/**
 * Generate Elena's response using Gemini Flash
 */
async function generateElenaResponse(
  miraMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  // Build conversation for Gemini (Elena's perspective)
  // From Elena's POV: her messages are "assistant", Mira's are "user"
  const elenaPerspective: Array<{ role: 'user' | 'assistant'; content: string }> = conversationHistory.map(msg => ({
    role: (msg.role === 'user' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: msg.content
  }))

  // Add Mira's latest message
  elenaPerspective.push({
    role: 'user',
    content: miraMessage
  })

  const response = await geminiFlashChat(
    ELENA_PERSONA,
    elenaPerspective,
    {
      maxTokens: 300,
      temperature: 0.7,
      personaName: 'Elena',
      otherPartyName: 'Mira'
    }
  )

  return response.trim()
}

async function simulateElenaDynamic() {
  const logFile = `/tmp/elena-dynamic-${Date.now()}.log`
  const logStream = fs.createWriteStream(logFile)

  const log = (msg: string) => {
    console.log(msg)
    logStream.write(msg + '\n')
  }

  log('='.repeat(70))
  log('ELENA DYNAMIC SIMULATION - Testing STRATEGY Constraint')
  log('='.repeat(70))
  log('')
  log('Elena is a business consultant who:')
  log('- Has 15 years corporate experience, 8 months solo')
  log('- 6 clients from network, all different types of work')
  log('- Revenue ~$15k/month but inconsistent')
  log('- Core issue: STRATEGY (unclear positioning/who to serve)')
  log('')
  log('Expected outcomes:')
  log('1. Constraint should be STRATEGY (unclear direction/positioning)')
  log('2. Should NOT drift to psychology (she is confident, not blocked by fear)')
  log('3. Should complete closing sequence with FREE consultation framing')
  log('4. Should reach appropriate conclusion')
  log('')
  log('-'.repeat(70))

  // Initialize state
  let state = initializeState('Elena')
  const history: Message[] = []
  const elenaHistory: { role: 'user' | 'assistant'; content: string }[] = []

  // Add initial greeting
  const greeting = "Hey Elena! I'm here to help you identify what's really holding your business back. Let's start with the basics - tell me about your consulting business. What kind of work do you do and who are your clients?"
  history.push({
    role: 'assistant',
    content: greeting,
    turn: 1,
    timestamp: new Date()
  })

  log(`\n[Turn 1] MIRA: ${greeting}\n`)

  let turnNumber = 1
  let lastAction = ''
  let constraintDetected = ''
  let closingPhaseReached = ''
  let freeConsultationMentioned = false

  const MAX_TURNS = 45

  while (turnNumber < MAX_TURNS) {
    // Generate Elena's response
    console.log('[Generating Elena response...]')
    const lastCoachMessage = history[history.length - 1].content
    const elenaResponse = await generateElenaResponse(lastCoachMessage, elenaHistory)

    turnNumber++

    // Add Elena's response to histories
    history.push({
      role: 'user',
      content: elenaResponse,
      turn: turnNumber,
      timestamp: new Date()
    })
    elenaHistory.push({ role: 'user', content: elenaResponse })

    log(`[Turn ${turnNumber}] ELENA: ${elenaResponse}\n`)

    try {
      // Process turn through orchestrator
      const result = await processConversationTurn(elenaResponse, history, state)

      // Update state
      state = result.state
      lastAction = result.decision?.action || 'unknown'

      // Track constraint hypothesis
      if (state.constraint_hypothesis) {
        constraintDetected = state.constraint_hypothesis
      }

      // Track closing sequence
      if (state.closing_sequence?.phase && state.closing_sequence.phase !== 'not_started') {
        closingPhaseReached = state.closing_sequence.phase
      }

      // Check for FREE consultation language
      const freePatterns = /free|complimentary|no cost|no obligation/i
      if (freePatterns.test(result.advisorResponse)) {
        freeConsultationMentioned = true
        log(`  ✓ FREE consultation language detected`)
      }

      turnNumber++

      // Add advisor response to histories
      history.push({
        role: 'assistant',
        content: result.advisorResponse,
        turn: turnNumber,
        timestamp: new Date()
      })
      elenaHistory.push({ role: 'assistant', content: result.advisorResponse })

      // Log response with key state info
      log(`[Turn ${turnNumber}] MIRA (${lastAction}): ${result.advisorResponse}\n`)
      log(`  → Phase: ${state.phase} | Hypothesis: ${state.constraint_hypothesis || 'none'} | Confidence: ${state.hypothesis_confidence?.toFixed(2) || '0.00'}`)
      log(`  → Readiness: clarity=${state.readiness?.clarity}, confidence=${state.readiness?.confidence}, capacity=${state.readiness?.capacity}`)
      log(`  → Blockers checked: ${state.readiness_check?.blockers_checked} | Exploring readiness: ${state.readiness_check?.turns_exploring_readiness}/3`)
      if (state.closing_sequence?.phase !== 'not_started') {
        log(`  → Closing phase: ${state.closing_sequence?.phase} | Arc complete: ${state.closing_sequence?.closing_arc_complete}`)
      }
      log('')

      // Check if conversation is complete
      // Stop when closing_arc_complete is true - this is when view_summary UI appears
      if (result.complete || state.closing_sequence?.closing_arc_complete) {
        log('\n' + '='.repeat(70))
        log('CONVERSATION COMPLETE')
        if (state.closing_sequence?.closing_arc_complete) {
          log('(view_summary component would appear here - user clicks to see summary)')
        }
        log('='.repeat(70))
        break
      }

    } catch (error) {
      log(`\n❌ Error at turn ${turnNumber}: ${error}`)
      break
    }
  }

  if (turnNumber >= MAX_TURNS) {
    log('\n⚠️  Maximum turns reached')
  }

  // Final summary
  log('\n' + '='.repeat(70))
  log('SIMULATION SUMMARY')
  log('='.repeat(70))
  log(`Total turns: ${turnNumber}`)
  log(`Final phase: ${state.phase}`)
  log(`Constraint detected: ${constraintDetected || 'none'}`)
  log(`Constraint confidence: ${state.hypothesis_confidence?.toFixed(2) || '0.00'}`)
  log(`Hypothesis validated: ${state.hypothesis_validated}`)
  log(`Final readiness: clarity=${state.readiness?.clarity}, confidence=${state.readiness?.confidence}, capacity=${state.readiness?.capacity}`)
  log(`Blockers checked: ${state.readiness_check?.blockers_checked}`)
  log(`Explore readiness triggered: ${(state.readiness_check?.turns_exploring_readiness || 0) > 0}`)
  log(`Turns in readiness exploration: ${state.readiness_check?.turns_exploring_readiness || 0}`)
  log(`Diagnosis delivered: ${state.diagnosis_delivered}`)
  log(`Closing phase reached: ${closingPhaseReached || 'none'}`)
  log(`Closing arc complete: ${state.closing_sequence?.closing_arc_complete}`)
  log(`FREE consultation mentioned: ${freeConsultationMentioned}`)
  log('')

  // Evaluate
  log('EVALUATION:')

  const isStrategy = constraintDetected === 'strategy'
  log(`1. Constraint = STRATEGY: ${isStrategy ? '✅ PASS' : '❌ FAIL (got: ' + constraintDetected + ')'}`)

  const notExecution = constraintDetected !== 'execution'
  log(`2. Did NOT drift to EXECUTION: ${notExecution ? '✅ PASS' : '❌ FAIL'}`)

  const notPsychology = constraintDetected !== 'psychology'
  log(`3. Did NOT drift to PSYCHOLOGY: ${notPsychology ? '✅ PASS' : '❌ FAIL'}`)

  log(`4. Diagnosis delivered: ${state.diagnosis_delivered ? '✅ PASS' : '⚠️ NOT REACHED'}`)

  log(`5. Blockers checked: ${state.readiness_check?.blockers_checked ? '✅ PASS' : '⚠️ NOT CHECKED'}`)

  const naturalLength = turnNumber >= 15 && turnNumber <= 40
  log(`6. Natural conversation length (15-40 turns): ${naturalLength ? '✅ PASS' : '⚠️ ' + turnNumber + ' turns'}`)

  const completedSuccessfully = state.phase === 'complete' || state.closing_sequence?.closing_arc_complete
  log(`7. Reached completion: ${completedSuccessfully ? '✅ PASS' : '⚠️ PARTIAL (phase: ' + state.phase + ')'}`)

  log(`8. FREE consultation framing: ${freeConsultationMentioned ? '✅ PASS' : '⚠️ NOT DETECTED'}`)

  log('')
  log(`Transcript saved to: ${logFile}`)

  logStream.end()
}

// Run simulation
simulateElenaDynamic().catch(console.error)
