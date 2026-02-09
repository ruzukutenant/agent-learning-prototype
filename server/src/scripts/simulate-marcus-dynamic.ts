/**
 * Dynamic simulation using Haiku to generate Marcus's responses
 *
 * Marcus's persona:
 * - Career transition coach, 18 months in business
 * - Has skills and some clients, but unclear positioning
 * - Core issue: STRATEGY (doesn't know who he really serves)
 * - Keeps pivoting between niches, can't commit
 * - Fear of missing out on clients if he narrows down
 * - Has tried: tech workers, women in leadership, career changers over 40
 * - Revenue: ~$3-4k/month, 4-5 clients at $150/session
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { processConversationTurn, initializeState } from '../orchestrator/conversation/orchestrator.js'
import type { Message } from '../orchestrator/core/types.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Marcus's persona for Haiku to roleplay
const MARCUS_PERSONA = `You are Marcus, a career transition coach who has been in business for 18 months.

YOUR SITUATION:
- You help people figure out their next career move (promotions, pivots, starting something new)
- You have 4-5 clients at a time, charging $150/session (~$3-4k/month)
- Clients find you through LinkedIn - you post content and people reach out
- You've tried niching down multiple times: tech workers, women in leadership, career changers over 40
- Nothing sticks - you keep second-guessing and pivoting

YOUR CORE STRUGGLE (which you may not fully realize at first):
- You're afraid of missing out on clients if you narrow down
- You don't actually know what YOU want - you're trying to optimize for the market
- Every time a different type of client shows up, you second-guess your niche choice
- You've been going in circles for over a year
- Deep down, you feel trapped when thinking about committing to one direction

YOUR PERSONALITY:
- Honest and self-aware when pushed
- Initially gives surface-level answers but opens up with good questions
- Gets frustrated with the spinning but doesn't know how to stop it
- Appreciates when someone sees through his deflections
- Ready to get help but has some hesitation about committing (ironic given his problem)

HOW TO RESPOND:
- Keep responses conversational, 1-3 sentences typically
- Be authentic - don't just agree with everything the coach says
- Push back a little when something doesn't quite land
- Share real feelings when asked about emotions
- When the coach names something true, acknowledge it genuinely
- If asked to consent to hearing a diagnosis, say yes
- If asked about blockers, be honest about your fears

## CRITICAL: This is a CHAT INTERFACE
- You are chatting with Mira in a web chat interface
- When Mira offers help or next steps, respond appropriately for a chat:
  - Say things like "That could help" or "I'd be interested in seeing what that looks like"
  - DO NOT give out your phone number or email
  - DO NOT say "text me" or "call me" or "email me"
  - DO NOT expect someone to reach out to you - you'll click through to see more
- When ready to proceed, say things like:
  - "Okay, what's the next step?"
  - "I'd be open to that"
  - "Show me what that involves"

CRITICAL - Response Format:
- You are typing in a chat interface, NOT acting in a play
- NEVER use theatrical stage directions like *nods*, *sighs*, *leans forward*, *pauses*, etc.
- NEVER describe your physical actions or expressions
- Just write what you would actually type in a chat message
- Be natural and conversational, but text-only

IMPORTANT: You are having a real conversation. Don't script or plan ahead. Just respond naturally to what the coach says.`

async function generateMarcusResponse(
  coachMessage: string,
  conversationHistory: { role: 'user' | 'assistant', content: string }[]
): Promise<string> {
  const messages = [
    ...conversationHistory,
    { role: 'assistant' as const, content: coachMessage }
  ]

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    system: MARCUS_PERSONA,
    messages: messages.map(m => ({
      role: m.role === 'user' ? 'assistant' : 'user', // Flip roles - Marcus is "assistant" in his view
      content: m.content
    }))
  })

  const text = response.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n')

  return text.trim()
}

async function simulateMarcusDynamic() {
  console.log('='.repeat(70))
  console.log('MARCUS DYNAMIC SIMULATION - Haiku-Generated Responses')
  console.log('='.repeat(70))
  console.log('')
  console.log('Marcus\'s persona: Career coach struggling with positioning')
  console.log('Expected constraint: STRATEGY')
  console.log('Using Claude Haiku to generate Marcus\'s responses dynamically')
  console.log('')
  console.log('-'.repeat(70))

  // Initialize state
  let state = initializeState('Marcus')
  const history: Message[] = []
  const marcusHistory: { role: 'user' | 'assistant', content: string }[] = []

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
  const debugSnapshots: Array<{ turn: number; action: string; phase: string; hypothesis: string | null; confidence: number; selfAwareness: string; confirmedUnderstanding: boolean; expertiseLevel: string }> = []
  let diagnosisConsentRequested = false
  let diagnosisDelivered = false
  let closingReached = false

  const MAX_TURNS = 40

  while (turnNumber < MAX_TURNS) {
    // Generate Marcus's response using Haiku
    const lastCoachMessage = history[history.length - 1].content
    const marcusResponse = await generateMarcusResponse(lastCoachMessage, marcusHistory)

    turnNumber++

    // Add Marcus's response to histories
    history.push({
      role: 'user',
      content: marcusResponse,
      turn: turnNumber,
      timestamp: new Date()
    })
    marcusHistory.push({ role: 'user', content: marcusResponse })

    console.log(`[Turn ${turnNumber}] MARCUS: ${marcusResponse}\n`)

    try {
      // Process turn through orchestrator
      const result = await processConversationTurn(marcusResponse, history, state)

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
                                  'pre_commitment_check', 'explore_readiness', 'check_blockers',
                                  'request_diagnosis_consent', 'diagnose']
      if (nonClosingActions.includes(lastAction)) {
        const ctaPatterns = /click below|book a call|schedule a call|see your summary|your personalized summary|the next step is to|here's the next step/i
        if (ctaPatterns.test(result.advisorResponse)) {
          ctaViolations++
          console.log(`  ⚠️ CTA VIOLATION detected in ${lastAction} response!`)
        }
      }

      turnNumber++

      // Add advisor response to histories
      history.push({
        role: 'assistant',
        content: result.advisorResponse,
        turn: turnNumber,
        timestamp: new Date()
      })
      marcusHistory.push({ role: 'assistant', content: result.advisorResponse })

      // Capture debug snapshot
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
      console.log(`  → Phase: ${state.phase} | Hypothesis: ${state.constraint_hypothesis || 'none'} | Validated: ${state.hypothesis_validated}`)
      console.log(`  → Consent: requested=${state.consent_state?.diagnosis_requested}, confirmed=${state.consent_state?.diagnosis_confirmed}`)
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
    console.log('\n⚠️  Maximum turns reached (40)')
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
  console.log(`Diagnosis consent confirmed: ${state.consent_state?.diagnosis_confirmed}`)
  console.log(`Diagnosis delivered: ${diagnosisDelivered}`)
  console.log(`Closing reached: ${closingReached}`)
  console.log(`CTA violations in non-closing turns: ${ctaViolations}`)
  console.log('')

  // Evaluate
  console.log('EVALUATION:')

  const isStrategy = constraintDetected === 'strategy'
  console.log(`1. Constraint = STRATEGY: ${isStrategy ? '✅ PASS' : '❌ FAIL (got: ' + constraintDetected + ')'}`)

  console.log(`2. CTA violations: ${ctaViolations === 0 ? '✅ PASS (0 violations)' : '❌ FAIL (' + ctaViolations + ' violations)'}`)

  console.log(`3. Diagnosis consent gate: ${diagnosisConsentRequested ? '✅ PASS' : '⚠️ NOT TRIGGERED'}`)

  console.log(`4. Diagnosis delivered: ${diagnosisDelivered ? '✅ PASS' : '⚠️ NOT REACHED'}`)

  const completedSuccessfully = state.phase === 'complete' || closingReached
  console.log(`5. Reached completion: ${completedSuccessfully ? '✅ PASS' : '⚠️ PARTIAL (phase: ' + state.phase + ')'}`)

  // Overall
  console.log('')
  const passCount = [isStrategy, ctaViolations === 0, diagnosisConsentRequested, diagnosisDelivered, completedSuccessfully].filter(Boolean).length
  console.log(`OVERALL: ${passCount}/5 criteria passed`)

  // Export full transcript with per-turn debug state
  const transcriptPath = `/tmp/marcus-dynamic-${Date.now()}.log`
  const fs = await import('fs')
  const lines: string[] = []
  const snapshotByTurn = new Map(debugSnapshots.map(s => [s.turn, s]))
  for (const m of history) {
    const speaker = m.role === 'assistant' ? 'MIRA' : 'MARCUS'
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
simulateMarcusDynamic().catch(console.error)
