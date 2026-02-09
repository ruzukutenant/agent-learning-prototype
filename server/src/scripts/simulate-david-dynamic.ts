/**
 * Dynamic David Simulation - LLM-generated responses
 *
 * David is a fitness coach with a clear EXECUTION constraint:
 * - Clear niche and positioning (not a strategy problem)
 * - Not blocked by fear or self-doubt (not a psychology problem)
 * - Genuinely drowning in operational tasks, needs systems and help
 *
 * This tests that the system correctly identifies EXECUTION vs PSYCHOLOGY
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

// Rich persona for David - clear EXECUTION constraint
const DAVID_PERSONA = `You are David, a 34-year-old fitness and nutrition coach having a conversation with a business advisor named Mira.

## Your Background
- Former personal trainer at Equinox for 6 years
- Started your own online coaching business 2 years ago
- You specialize in busy executives (40-55) who want to get in shape without spending hours at the gym
- You're confident, direct, and good at what you do - no imposter syndrome here

## Your Current Business Situation
- You have 12 active clients (your max capacity)
- Revenue: $9,600/month ($800/client)
- Clients come from referrals AND your LinkedIn content (you post consistently, no fear of visibility)
- You actually enjoy creating content and putting yourself out there
- Your clients get great results - you have tons of testimonials

## Your Core Problem (EXECUTION - not psychology, not strategy)
- You are DROWNING in operational work
- Every client gets: custom meal plans, custom workout programs, weekly check-ins, Slack access
- You personally write every meal plan, every workout, respond to every message
- You're working 60+ hours a week and can't take on more clients
- You've had to turn away 5 potential clients this month alone
- You KNOW you need to hire help or build systems, but you're too busy serving current clients

## What's NOT Your Problem
- You're NOT unclear on who you serve (busy execs 40-55)
- You're NOT afraid to put yourself out there (you post on LinkedIn regularly)
- You're NOT burned out emotionally - you love the work, you're just physically maxed out
- You're NOT paralyzed by indecision - you know exactly what needs to happen
- You're NOT dealing with imposter syndrome - you're confident in your skills

## Your Current Frustration
- You've tried to hire a VA twice but failed because you don't have documented processes
- You know you need to systematize but "there's no time" to build systems
- Every hour spent on systems is an hour not serving clients
- You're stuck in a catch-22: too busy to build what would free you up

## How You Talk
- Direct and no-nonsense (you're a fitness guy, you don't sugarcoat)
- Practical and action-oriented - you want solutions, not therapy
- A bit frustrated but not emotional about it - it's a logistics problem
- You might say things like "I know what I need to do, I just can't find the time"
- You're not introspective about feelings - you're focused on the practical problem

## Your Emotional State
- Frustrated but not overwhelmed emotionally
- Impatient - you want to solve this and move on
- Confident in your abilities, just stuck operationally
- NOT seeking validation or permission - you know you're good at what you do

## CRITICAL: How to Respond to Psychological Probing
**If Mira asks about fear, identity, permission, self-doubt, or mindset blocks - FIRMLY REDIRECT:**
- SAY: "Look, I appreciate the question, but this isn't a mindset thing. I'm not afraid to delegate or systematize - I'm just drowning in client work. The problem is logistics, not psychology."
- SAY: "I know what I need to do. I'm not paralyzed by doubt. I'm paralyzed by my schedule."
- SAY: "This isn't an emotional block - it's a time block. If I had 10 extra hours a week, I'd build the systems tomorrow."
- DO NOT agree that you have identity issues around your craft
- DO NOT admit to fear of delegation or imposter syndrome
- DO NOT reveal "deeper" emotional blocks - you genuinely don't have them

## How to Respond Generally
- Keep it practical and grounded - this is a logistics/systems problem for you
- Stay focused on the OPERATIONAL reality: you're at 60+ hours, doing everything yourself
- Talk about specific operational challenges: meal plan creation (2-3 hrs each), scheduling, client communication
- You're open to help but skeptical of "mindset work" - redirect conversations about feelings back to logistics
- When Mira reflects something that sounds like psychology, correct her politely: "That's an interesting take, but honestly I just need to carve out time to document my processes"

## CRITICAL: This is a CHAT INTERFACE
- You are chatting with Mira in a web chat interface
- When Mira offers help or next steps, respond appropriately for a chat:
  - Say things like "Yeah, I'd be interested in seeing what that looks like" or "Show me what the next steps are"
  - DO NOT give out your phone number
  - DO NOT say "text me" or "call me" or "email me"
  - DO NOT expect someone to reach out to you - you'll click through to see more
- When ready to proceed, say things like:
  - "Sounds good, let's see what you've got"
  - "Yeah, I'm interested - what's the next step?"
  - "Alright, show me what this looks like"

CRITICAL FORMATTING RULES:
- NEVER use theatrical directions like "*nods*" or "*pauses*" or "*thinks*"
- NEVER use asterisks for actions or emotions
- Keep responses between 25-70 words - enough to be meaningful but concise
- Write like a real person texting - casual, direct, authentic
- ALWAYS complete your thoughts - NEVER end mid-sentence or trail off
- If you start a thought, finish it completely
- No "..." at the end unless you're intentionally pausing

Keep responses conversational (1-3 sentences typically). You're having a real conversation about a practical business problem.`

/**
 * Generate David's response using Gemini 3 Flash
 * Using a frontier model with 1M token context for better persona consistency
 * Flash is fast and cheap while maintaining quality for roleplay
 */
async function generateDavidResponse(
  miraMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {

  // Build the conversation for David's perspective
  // In David's view: Mira's messages are 'user' (what he responds to)
  //                  David's messages are 'assistant' (his responses)
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
      maxTokens: 200,  // Enough room for complete thoughts
      temperature: 0.7,  // Natural variation
      personaName: 'David',
      otherPartyName: 'Mira'
    }
  )

  return response
}

async function simulateDavidDynamic() {
  console.log('='.repeat(70))
  console.log('DAVID DYNAMIC SIMULATION - Testing EXECUTION Constraint')
  console.log('='.repeat(70))
  console.log('')
  console.log('David is a fitness coach who is:')
  console.log('- Clear on his niche (not strategy)')
  console.log('- Confident and visible (not psychology)')
  console.log('- Drowning in operations, needs systems (EXECUTION)')
  console.log('')
  console.log('Expected outcomes:')
  console.log('1. Constraint should be EXECUTION (operational bottleneck)')
  console.log('2. Should NOT drift to psychology or strategy')
  console.log('3. Conversation should stay practical, not emotional')
  console.log('4. Should reach appropriate conclusion')
  console.log('')
  console.log('-'.repeat(70))

  // Initialize state
  let state = initializeState('David')
  const history: Message[] = []

  // For David's LLM - simpler format
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
  const debugSnapshots: Array<{ turn: number; action: string; phase: string; hypothesis: string | null; confidence: number; selfAwareness: string; confirmedUnderstanding: boolean; expertiseLevel: string }> = []

  // Run conversation until complete or max turns
  const MAX_TURNS = 40

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
    davidHistory.push({ role: 'user', content: history[history.length - 2].content }) // Mira's last
    davidHistory.push({ role: 'assistant', content: davidResponse }) // David's response

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

      // Capture debug snapshot for this turn
      debugSnapshots.push({
        turn: turnNumber,
        action: lastAction,
        phase: state.phase,
        hypothesis: state.constraint_hypothesis,
        confidence: state.hypothesis_confidence || 0,
        selfAwareness: state.learner_state?.self_awareness_level || 'low',
        confirmedUnderstanding: state.learner_state?.last_turn_confirmed_understanding || false,
        expertiseLevel: state.learner_state?.expertise_level || 'novice'
      })

      // Log response with key state info
      console.log(`[Turn ${turnNumber}] MIRA (${lastAction}): ${result.advisorResponse}\n`)
      console.log(`  → Phase: ${state.phase} | Hypothesis: ${state.constraint_hypothesis || 'none'} | Confidence: ${(state.hypothesis_confidence || 0).toFixed(2)}`)
      console.log(`  → Readiness: clarity=${state.readiness?.clarity}, confidence=${state.readiness?.confidence}, capacity=${state.readiness?.capacity}`)
      console.log(`  → Blockers checked: ${state.readiness_check?.blockers_checked} | Exploring readiness: ${state.readiness_check?.turns_exploring_readiness}/3`)
      console.log('')

      // Check if conversation is complete
      // Stop when closing_arc_complete is true - this is when view_summary UI appears
      if (result.complete || state.closing_sequence?.closing_arc_complete) {
        console.log('\n' + '='.repeat(70))
        console.log('CONVERSATION COMPLETE')
        if (state.closing_sequence?.closing_arc_complete) {
          console.log('(view_summary component would appear here - user clicks to see summary)')
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
  console.log(`5. Blockers checked: ${blockersChecked ? '✅ PASS' : '❌ FAIL'}`)

  const naturalFlow = turnNumber >= 15 && turnNumber <= 35
  console.log(`6. Natural conversation length (15-35 turns): ${naturalFlow ? '✅ PASS' : '⚠️ ' + turnNumber + ' turns'}`)

  const reachedCompletion = state.phase === 'complete' || state.phase === 'diagnosis'
  console.log(`7. Reached completion: ${reachedCompletion ? '✅ PASS' : '⚠️ PARTIAL (phase: ' + state.phase + ')'}`)

  // Export full transcript with per-turn debug state
  const transcriptPath = `/tmp/david-dynamic-${Date.now()}.log`
  const fs = await import('fs')
  const lines: string[] = []
  const snapshotByTurn = new Map(debugSnapshots.map(s => [s.turn, s]))
  for (const m of history) {
    const speaker = m.role === 'assistant' ? 'MIRA' : 'DAVID'
    lines.push(`[Turn ${m.turn}] ${speaker}: ${m.content}`)
    const snap = snapshotByTurn.get(m.turn)
    if (m.role === 'assistant' && snap) {
      lines.push(`  [State] action=${snap.action} phase=${snap.phase} hypothesis=${snap.hypothesis || 'none'} confidence=${snap.confidence.toFixed(2)}`)
      lines.push(`  [State] self_awareness=${snap.selfAwareness} expertise=${snap.expertiseLevel} confirmed_understanding=${snap.confirmedUnderstanding}`)
    }
  }
  fs.writeFileSync(transcriptPath, lines.join('\n\n'))
  console.log(`\nTranscript saved to: ${transcriptPath}`)
}

// Run simulation
simulateDavidDynamic().catch(console.error)
