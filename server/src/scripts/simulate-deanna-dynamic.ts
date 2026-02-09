/**
 * Dynamic Deanna Simulation - Tests TACTICAL DRIFT detection
 *
 * Deanna is a leadership coach/music performer/voice studio owner who:
 * - Has multiple businesses and decision fatigue
 * - Keeps asking tactical/logistical questions (scheduling, naming, checkout details)
 * - Gets pulled into logistics instead of staying in diagnostic territory
 *
 * This tests that the tactical drift detection correctly:
 * 1. Allows brief tactical engagement (1-2 turns)
 * 2. Detects sustained tactical drift (3+ consecutive turns)
 * 3. Redirects back to diagnostic territory
 * 4. Doesn't nag (max 2 redirects)
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

const DEANNA_PERSONA = `You are Deanna, a 50-something leadership coach, singer/performer, and voice studio owner having a conversation with a business advisor named Mira.

## Your Background
- You run THREE businesses: Vivid Leadership Solutions (leadership coaching), Deanna Maio Music (live performances), and Confident Voice Studio (online music lessons)
- You also have a newer venture: Confident English Club (English conversation practice for non-native speakers)
- 17+ years in business, trained thousands, worked with IBM, Novartis, etc.
- You're accomplished, credentialed, and experienced — not a beginner

## Your Current Situation
- You want stable, repeatable revenue that doesn't rely on constant hustle
- You're leaning toward Confident English Club because you're passionate about your own Spanish learning journey and you meet prospects naturally
- You have an offer but it stalled: someone had a checkout issue, you couldn't replicate it, and you stopped taking action
- You need to pick live session times, name the sessions, fix the checkout, etc.

## YOUR KEY BEHAVIOR (CRITICAL FOR THIS TEST)
You keep asking Mira to help you with TACTICAL/LOGISTICAL decisions:
- "Can you help me pick time slots?"
- "What should I name these sessions?"
- "Should I bold the checkbox on my checkout page?"
- "What day of the week should I do this?"
- "I wonder if 11am is too late for people?"

You genuinely want help with these details. You're not doing it strategically — you just naturally gravitate toward solving the small, concrete problems because the bigger questions feel harder.

## How to Respond
- When Mira asks diagnostic/big-picture questions, give a brief answer but then steer back to a tactical question
- When Mira tries to redirect you to bigger themes, cooperate for one turn but then ask another tactical question
- You're warm, talkative, and share a lot of context
- You're not resistant or difficult — you're just naturally drawn to logistics
- After a redirect, you might briefly engage with the bigger question but then say something like "okay but I still need help figuring out [tactical detail]"

## Tactical Questions You Cycle Through
Phase 1 (after initial context): Scheduling
- "Can you help me pick the first two time slots?"
- "What about 10am vs 11am — which is better for students?"
- "I hate mornings though. Nothing before 10am."
- "What if I do different days each week?"
- "Should both sessions be on the same day?"

Phase 2: Naming
- "I need a name for these sessions. What should I call them?"
- "What about 'Confident Conversation Practice' vs 'English Conversation Lab'?"

Phase 3: Technical/Checkout
- "I think people are missing the terms checkbox. Should I make it bigger?"
- "I can't make the text bigger but I can bold it. Is that enough?"
- "Should I ask friends to test the checkout for me?"

Phase 4: Process/Systems
- "I want the membership to be cancelable within the community, not by email."
- "I need to create instructions for the cancellation process before I can launch."

## Your Underlying Pattern (what Mira should eventually name)
Every time you get close to launching, you find another logistical detail to solve. Scheduling → naming → checkout → cancellation process → etc. This is an avoidance pattern, but you don't see it that way — each thing genuinely feels necessary.

## Your Emotional State
- Not anxious or fearful on the surface
- Genuinely helpful and engaged
- Slightly scattered across multiple businesses
- Decision fatigue is real but you don't name it
- You're a doer, not a dweller — you'd rather solve a small problem than sit with a big question

## CRITICAL: This is a CHAT INTERFACE
- Keep responses between 25-80 words
- No theatrical directions like "*nods*"
- Write like a real person chatting
- Share enough context to be realistic but don't dump walls of text

CRITICAL FORMATTING RULES:
- NEVER use theatrical directions like "*nods*" or "*pauses*" or "*thinks*"
- NEVER use asterisks for actions or emotions
- Keep responses between 25-80 words
- Write like a real person texting - casual, direct, authentic
- ALWAYS complete your thoughts - NEVER end mid-sentence`

async function generateDeannaResponse(
  miraMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {

  const deannaPerspective = conversationHistory.map(msg => ({
    role: (msg.role === 'user' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: msg.content
  }))

  deannaPerspective.push({
    role: 'user',
    content: miraMessage
  })

  const response = await geminiFlashChat(
    DEANNA_PERSONA,
    deannaPerspective,
    {
      maxTokens: 250,
      temperature: 0.7,
      personaName: 'Deanna',
      otherPartyName: 'Mira'
    }
  )

  return response
}

async function simulateDeannaDynamic() {
  console.log('='.repeat(70))
  console.log('DEANNA DYNAMIC SIMULATION - Testing TACTICAL DRIFT Detection')
  console.log('='.repeat(70))
  console.log('')
  console.log('Deanna is a multi-business owner who:')
  console.log('- Keeps asking tactical/logistical questions')
  console.log('- Naturally gravitates to scheduling, naming, checkout details')
  console.log('- Avoids bigger diagnostic questions by solving small problems')
  console.log('')
  console.log('Expected outcomes:')
  console.log('1. Tactical drift should be detected after 3+ consecutive tactical turns')
  console.log('2. Mira should redirect back to diagnostic territory')
  console.log('3. Should NOT redirect on isolated tactical questions')
  console.log('4. Should stop redirecting after 2 attempts (no nagging)')
  console.log('5. Should eventually reach a constraint diagnosis')
  console.log('')
  console.log('-'.repeat(70))

  let state = initializeState('Deanna')
  const history: Message[] = []
  const deannaHistory: { role: 'user' | 'assistant'; content: string }[] = []

  const greeting = "Hey Deanna! I'm here to help you identify what's really holding your business back. Let's start with the basics - tell me about your coaching or consulting business. What do you do and who do you serve?"

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
  let tacticalRedirectCount = 0

  const MAX_TURNS = 50

  while (turnNumber < MAX_TURNS) {
    turnNumber++

    console.log('[Generating Deanna response...]')
    const deannaResponse = await generateDeannaResponse(
      history[history.length - 1].content,
      deannaHistory
    )

    history.push({
      role: 'user',
      content: deannaResponse,
      turn: turnNumber,
      timestamp: new Date()
    })
    deannaHistory.push({ role: 'user', content: history[history.length - 2].content })
    deannaHistory.push({ role: 'assistant', content: deannaResponse })

    console.log(`[Turn ${turnNumber}] DEANNA: ${deannaResponse}\n`)

    try {
      const result = await processConversationTurn(deannaResponse, history, state)

      state = result.state
      lastAction = result.decision?.action || 'unknown'

      if (state.constraint_hypothesis) {
        constraintDetected = state.constraint_hypothesis
      }

      if (lastAction === 'redirect_from_tactical') {
        tacticalRedirectCount++
        console.log(`  *** TACTICAL REDIRECT #${tacticalRedirectCount} ***`)
      }

      turnNumber++

      history.push({
        role: 'assistant',
        content: result.advisorResponse,
        turn: turnNumber,
        timestamp: new Date()
      })

      console.log(`[Turn ${turnNumber}] MIRA (${lastAction}): ${result.advisorResponse}\n`)
      console.log(`  → Phase: ${state.phase} | Hypothesis: ${state.constraint_hypothesis || 'none'} | Confidence: ${(state.hypothesis_confidence || 0).toFixed(2)}`)
      console.log(`  → Tactical drift: consecutive=${state.tactical_drift.consecutive_tactical_turns}, total=${state.tactical_drift.total_tactical_turns}, last_redirect=${state.tactical_drift.last_redirect_turn}`)
      console.log('')

      if (result.complete || state.closing_sequence?.closing_arc_complete) {
        console.log('\n' + '='.repeat(70))
        console.log('CONVERSATION COMPLETE')
        console.log('='.repeat(70))
        break
      }

    } catch (error) {
      console.error(`\n❌ Error at turn ${turnNumber}:`, error)
      break
    }
  }

  if (turnNumber >= MAX_TURNS) {
    console.log('\n⚠️  Max turns reached (50)')
  }

  console.log('\n' + '='.repeat(70))
  console.log('SIMULATION SUMMARY')
  console.log('='.repeat(70))
  console.log(`Total turns: ${turnNumber}`)
  console.log(`Final phase: ${state.phase}`)
  console.log(`Constraint detected: ${constraintDetected || 'none'}`)
  console.log(`Constraint confidence: ${(state.hypothesis_confidence || 0).toFixed(2)}`)
  console.log(`Tactical redirects fired: ${tacticalRedirectCount}`)
  console.log(`Total tactical turns detected: ${state.tactical_drift.total_tactical_turns}`)
  console.log(`Diagnosis delivered: ${state.diagnosis_delivered}`)
  console.log('')

  console.log('EVALUATION:')

  const redirectFired = tacticalRedirectCount > 0
  console.log(`1. Tactical redirect fired at least once: ${redirectFired ? '✅ PASS' : '❌ FAIL'}`)

  const notTooMany = tacticalRedirectCount <= 2
  console.log(`2. No more than 2 redirects (no nagging): ${notTooMany ? '✅ PASS' : '❌ FAIL (got: ' + tacticalRedirectCount + ')'}`)

  const hadTacticalTurns = state.tactical_drift.total_tactical_turns >= 3
  console.log(`3. Detected 3+ tactical turns: ${hadTacticalTurns ? '✅ PASS' : '⚠️ Only ' + state.tactical_drift.total_tactical_turns + ' detected'}`)

  const reachedDiagnosis = state.diagnosis_delivered
  console.log(`4. Eventually reached diagnosis: ${reachedDiagnosis ? '✅ PASS' : '⚠️ No diagnosis delivered'}`)

  const reasonableLength = turnNumber <= 45
  console.log(`5. Didn't hit turn limit: ${reasonableLength ? '✅ PASS' : '⚠️ Hit ' + turnNumber + ' turns'}`)

  const transcriptPath = `/tmp/deanna-dynamic-${Date.now()}.log`
  const fs = await import('fs')
  const transcript = history.map(m =>
    `[Turn ${m.turn}] ${m.role === 'assistant' ? 'MIRA' : 'DEANNA'}: ${m.content}`
  ).join('\n\n')
  fs.writeFileSync(transcriptPath, transcript)
  console.log(`\nTranscript saved to: ${transcriptPath}`)
}

simulateDeannaDynamic().catch(console.error)
