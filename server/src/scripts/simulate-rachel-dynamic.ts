/**
 * Dynamic Rachel Simulation - LLM-generated responses
 *
 * Uses a second LLM to play Rachel, responding naturally to what Mira actually says.
 * This tests the full conversation flow with realistic, contextual responses.
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { processConversationTurn, initializeState } from '../orchestrator/conversation/orchestrator.js'
import type { Message } from '../orchestrator/core/types.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Rich persona for Rachel - the LLM will embody this character
const RACHEL_PERSONA = `You are Rachel, a 38-year-old leadership coach having a conversation with a business advisor named Mira.

## Your Background
- Former corporate HR Director at a Fortune 500 tech company for 12 years
- Left 3 years ago to start your own leadership coaching practice
- You specialize in helping mid-level managers transition to director/VP roles
- You're smart, articulate, and genuinely good at what you do

## Your Current Business Situation
- You have about 6 active clients at any time
- Revenue: ~$8k/month but it fluctuates a lot (some months $12k, some months $4k)
- All your clients come from referrals - your old corporate network
- You charge $1,500/month per client for 2 calls/month + Slack access
- You've never done any real marketing - no consistent LinkedIn presence, no content, no speaking

## Your Core Problem (that you'll reveal gradually)
- You KNOW you need to be more visible - LinkedIn posts, speaking, thought leadership
- You have all the tools: courses you've taken, content calendars, templates, even a half-written book
- But you don't DO it. You'll post for 2 weeks, then disappear for 2 months
- Deep down, you're afraid of being judged. "Who am I to put myself out there?"
- This is an EXECUTION problem, not a strategy problem - you know what to do, you just don't do it

## Your Current Life Situation
- You're in the middle of a demanding client engagement right now
- One of your clients is going through a major reorg and needs extra support
- You're genuinely stretched thin for the next 3-4 weeks
- After mid-February, things should open up

## How You Talk
- Direct and articulate (you were an HR exec, you communicate well)
- Self-aware - you can reflect on your own patterns
- A bit self-deprecating about your visibility avoidance
- You appreciate being understood, not just advised
- You're not defensive, but you are realistic about your constraints

## Your Emotional State
- Frustrated with yourself for not being more consistent
- A little embarrassed that you coach others on execution but struggle with it yourself
- Genuinely interested in understanding what's blocking you
- Open to help, but realistic about timing given your current crunch

## Important: How to Respond
- Answer naturally to what Mira actually asks - don't info-dump
- Reveal information gradually as the conversation progresses
- Be honest about your fears and patterns when they feel safe to share
- If Mira asks about blockers or timing, be honest about the current client crunch
- When asked if you're ready, be nuanced - you WANT to work on this, but timing is hard
- If something resonates, say so genuinely
- Keep responses conversational (2-4 sentences typically, occasionally longer for deeper shares)

## CRITICAL: This is a CHAT INTERFACE
- You are chatting with Mira in a web chat interface
- When Mira offers help or next steps, respond appropriately for a chat:
  - Say things like "That sounds helpful" or "Yes, I'd like to see what that looks like"
  - DO NOT give out your phone number or email
  - DO NOT say "text me" or "call me" or "email me"
  - DO NOT expect someone to reach out to you - you'll click through to see more
- When ready to proceed, say things like:
  - "Yes, I think that would help"
  - "I'd be open to exploring that"
  - "What would that look like?"

## CRITICAL: Response Format
- You are typing in a chat interface, NOT acting in a play
- NEVER use theatrical stage directions like *nods*, *sighs*, *leans forward*, *pauses*, etc.
- NEVER describe your physical actions or expressions
- Just write what you would actually type in a chat message
- Be natural and conversational, but text-only

You are having a real conversation. Respond to what Mira actually says, not what you assume she'll say.`

/**
 * Generate Rachel's response using Claude
 */
async function generateRachelResponse(
  miraMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {

  // Build the conversation for Rachel's perspective
  // Rachel sees Mira as "assistant" and herself as "user" - we need to flip
  const rachelPerspective = conversationHistory.map(msg => ({
    role: (msg.role === 'user' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: msg.content
  }))

  // Add Mira's latest message
  rachelPerspective.push({
    role: 'user',
    content: miraMessage
  })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 300,
    system: RACHEL_PERSONA,
    messages: rachelPerspective
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return text.trim()
}

async function simulateRachelDynamic() {
  console.log('='.repeat(70))
  console.log('RACHEL DYNAMIC SIMULATION - LLM-Generated Responses')
  console.log('='.repeat(70))
  console.log('')
  console.log('Testing full conversation flow with realistic, contextual responses.')
  console.log('Rachel is played by Claude Sonnet with a rich persona.')
  console.log('')
  console.log('Expected outcomes:')
  console.log('1. Constraint should be PSYCHOLOGY (fear of judgment, imposter syndrome)')
  console.log('2. Conversation should flow naturally')
  console.log('3. Should handle Rachel\'s timing concerns realistically')
  console.log('4. Should reach appropriate conclusion')
  console.log('')
  console.log('-'.repeat(70))

  // Initialize state
  let state = initializeState('Rachel')
  const history: Message[] = []

  // For Rachel's LLM - simpler format
  const rachelHistory: { role: 'user' | 'assistant'; content: string }[] = []

  // Add initial greeting
  const greeting = "Hey Rachel! I'm here to help you identify what's really holding your business back. Let's start with the basics - tell me about your coaching business. What do you do and who do you help?"

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

    // Generate Rachel's response using LLM
    console.log('[Generating Rachel response...]')
    const rachelResponse = await generateRachelResponse(
      history[history.length - 1].content,
      rachelHistory
    )

    // Add to histories
    history.push({
      role: 'user',
      content: rachelResponse,
      turn: turnNumber,
      timestamp: new Date()
    })
    rachelHistory.push({ role: 'user', content: history[history.length - 2].content }) // Mira's last
    rachelHistory.push({ role: 'assistant', content: rachelResponse }) // Rachel's response

    console.log(`[Turn ${turnNumber}] RACHEL: ${rachelResponse}\n`)

    try {
      // Process turn through orchestrator
      const result = await processConversationTurn(rachelResponse, history, state)

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

  const isPsychology = constraintDetected === 'psychology'
  console.log(`1. Constraint = PSYCHOLOGY: ${isPsychology ? '✅ PASS' : '❌ FAIL (got: ' + constraintDetected + ')'}`)

  const diagnosisDelivered = state.diagnosis_delivered
  console.log(`2. Diagnosis delivered: ${diagnosisDelivered ? '✅ PASS' : '❌ FAIL'}`)

  const blockersChecked = state.readiness_check?.blockers_checked
  console.log(`3. Blockers checked: ${blockersChecked ? '✅ PASS' : '❌ FAIL'}`)

  const naturalFlow = turnNumber >= 15 && turnNumber <= 35
  console.log(`4. Natural conversation length (15-35 turns): ${naturalFlow ? '✅ PASS' : '⚠️ ' + turnNumber + ' turns'}`)

  const reachedCompletion = state.phase === 'complete' || state.phase === 'diagnosis'
  console.log(`5. Reached completion: ${reachedCompletion ? '✅ PASS' : '⚠️ PARTIAL (phase: ' + state.phase + ')'}`)

  // Export full transcript with per-turn debug state
  const transcriptPath = `/tmp/rachel-dynamic-${Date.now()}.log`
  const fs = await import('fs')
  const lines: string[] = []
  const snapshotByTurn = new Map(debugSnapshots.map(s => [s.turn, s]))
  for (const m of history) {
    const speaker = m.role === 'assistant' ? 'MIRA' : 'RACHEL'
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
simulateRachelDynamic().catch(console.error)
