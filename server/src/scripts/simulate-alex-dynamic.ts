/**
 * Dynamic simulation using Haiku to generate Alex's responses
 *
 * Alex's persona:
 * - Course creator / online educator, 2 years in business
 * - Has created multiple courses but none have taken off
 * - Core issue: STRATEGY (unclear who they're really for)
 * - Keeps creating new courses instead of focusing
 * - Afraid of picking wrong audience and being stuck
 * - Revenue: ~$2-3k/month from various courses, inconsistent
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

// Alex's persona for Haiku to roleplay
const ALEX_PERSONA = `You are Alex, a course creator and online educator who has been building an online business for about 2 years.

YOUR SITUATION:
- You create and sell online courses on topics like productivity, personal development, and career growth
- You have 4 different courses on your site, each targeting slightly different audiences
- Revenue is inconsistent: ~$2-3k/month, mostly from evergreen funnels but nothing scales
- You've built courses for: young professionals, entrepreneurs, remote workers, career changers
- Nothing has really taken off - you keep creating new courses hoping one will hit

YOUR CORE STRUGGLE (which you may not fully realize at first):
- You're afraid of picking the "wrong" audience and getting stuck
- You don't know who YOUR people really are - you've been following market trends
- Every time you see someone else succeed in a niche, you wonder if you should pivot
- You've been spreading yourself thin across multiple audiences for 2 years
- You secretly know you need to pick a lane but the commitment feels scary
- You worry that narrowing down means leaving money on the table

YOUR PERSONALITY:
- Thoughtful and analytical - you like to think things through
- Open to feedback but need to process it
- Gets energized when something clicks, willing to go deep
- Values genuine conversation over surface-level advice
- Ready for change but wants to understand the path first
- When something resonates, you say so clearly

HOW TO RESPOND:
- Keep responses conversational, 2-4 sentences typically
- Be authentic - share what's really going on when asked
- When the coach names something true, acknowledge it genuinely
- If asked to consent to hearing a diagnosis, say yes
- If asked about blockers, be honest about your concerns
- When asked about next steps, engage with the question thoughtfully
- If something resonates, express that clearly ("Yes, that's exactly it" or "That really lands")

## CRITICAL: This is a CHAT INTERFACE
- You are chatting with Mira in a web chat interface
- When Mira offers help or next steps, respond appropriately for a chat:
  - Say things like "That sounds helpful" or "Yes, I'd like to see what that looks like"
  - DO NOT give out your phone number or email
  - DO NOT say "text me" or "call me" or "email me"
  - DO NOT expect someone to reach out to you - you'll click through to see more
- When ready to proceed, say things like:
  - "Yes, let's do that"
  - "I'd like to explore that option"
  - "What does that look like?"

CRITICAL - Response Format:
- You are typing in a chat interface, NOT acting in a play
- NEVER use theatrical stage directions like *nods*, *sighs*, *leans forward*, *pauses*, etc.
- NEVER describe your physical actions or expressions
- Just write what you would actually type in a chat message
- Be natural and conversational, but text-only

IMPORTANT: You are having a real conversation. Respond naturally to what the coach says. When things resonate, say so. When you have questions, ask them.`

async function generateAlexResponse(
  coachMessage: string,
  conversationHistory: { role: 'user' | 'assistant', content: string }[]
): Promise<string> {
  // Build conversation for Gemini (Alex's perspective)
  // From Alex's POV: their messages are "assistant", Mira's are "user"
  const alexPerspective: Array<{ role: 'user' | 'assistant', content: string }> = conversationHistory.map(m => ({
    role: (m.role === 'user' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: m.content
  }))

  // Add the latest coach message (from Alex's POV, Mira is "user")
  alexPerspective.push({ role: 'user', content: coachMessage })

  const response = await geminiFlashChat(
    ALEX_PERSONA,
    alexPerspective,
    {
      maxTokens: 300,
      temperature: 0.7,
      personaName: 'Alex',
      otherPartyName: 'Mira'
    }
  )

  return response.trim()
}

async function simulateAlexDynamic() {
  const logFile = `/tmp/alex-dynamic-${Date.now()}.log`
  const logStream = fs.createWriteStream(logFile)

  const log = (msg: string) => {
    console.log(msg)
    logStream.write(msg + '\n')
  }

  log('='.repeat(70))
  log('ALEX DYNAMIC SIMULATION - Testing STRATEGY Constraint')
  log('='.repeat(70))
  log('')
  log('Alex is a course creator who:')
  log('- Has 4 different courses targeting different audiences')
  log('- Revenue is inconsistent (~$2-3k/month)')
  log('- Keeps creating new courses instead of focusing')
  log('- Core issue: STRATEGY (unclear positioning)')
  log('')
  log('Expected outcomes:')
  log('1. Constraint should be STRATEGY (unclear audience/positioning)')
  log('2. Should NOT drift to execution or psychology')
  log('3. Should complete closing sequence with FREE consultation framing')
  log('4. Should reach appropriate conclusion')
  log('')
  log('-'.repeat(70))

  // Initialize state
  let state = initializeState('Alex')
  const history: Message[] = []
  const alexHistory: { role: 'user' | 'assistant', content: string }[] = []

  // Add initial greeting
  const greeting = "Hey Alex! I'm here to help you identify what's really holding your business back. Let's start with the basics - tell me about your coaching business. What do you do and who do you help?"
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
    // Generate Alex's response
    console.log('[Generating Alex response...]')
    const lastCoachMessage = history[history.length - 1].content
    const alexResponse = await generateAlexResponse(lastCoachMessage, alexHistory)

    turnNumber++

    // Add Alex's response to histories
    history.push({
      role: 'user',
      content: alexResponse,
      turn: turnNumber,
      timestamp: new Date()
    })
    alexHistory.push({ role: 'user', content: alexResponse })

    log(`[Turn ${turnNumber}] ALEX: ${alexResponse}\n`)

    try {
      // Process turn through orchestrator
      const result = await processConversationTurn(alexResponse, history, state)

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
      alexHistory.push({ role: 'assistant', content: result.advisorResponse })

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
simulateAlexDynamic().catch(console.error)
