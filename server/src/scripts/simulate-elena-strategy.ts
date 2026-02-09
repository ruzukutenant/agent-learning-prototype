/**
 * Dynamic Elena Simulation - LLM-generated responses
 *
 * Elena has a clear STRATEGY constraint:
 * - Genuinely unclear about who to serve and what to offer
 * - Not blocked by fear or self-doubt (confident person)
 * - Has skills and can execute, but lacks clarity on direction
 * - Needs help with positioning and market choice, not mindset
 *
 * This tests that the system correctly identifies STRATEGY
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { processConversationTurn, initializeState } from '../orchestrator/conversation/orchestrator.js'
import type { Message } from '../orchestrator/core/types.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Rich persona for Elena - clear STRATEGY constraint
const ELENA_PERSONA = `You are Elena, a 42-year-old business consultant having a conversation with a business advisor named Mira.

## Your Background
- 15 years in corporate consulting at McKinsey and Deloitte
- Left 8 months ago to start your own practice
- You're smart, confident, and have deep expertise in operations and organizational design
- No imposter syndrome - you know you're good at what you do

## Your Current Business Situation
- You've taken on 6 clients in 8 months, all through your network
- Revenue is okay (~$15k/month) but inconsistent
- Clients have been a mix: 2 startups, 2 mid-size companies, 1 nonprofit, 1 solopreneur
- You've done different work for each: ops strategy, org design, process improvement, hiring strategy

## Your Core Problem (STRATEGY - not psychology, not execution)
- You genuinely don't know what you should specialize in
- Every client engagement has been different - you're a generalist by default
- You can't articulate who your ideal client is because you haven't figured it out
- You don't know what your "thing" is - what makes you different from other consultants
- You're not afraid to market yourself - you just don't know what to say

## What's NOT Your Problem
- You're NOT afraid to put yourself out there - you're confident
- You're NOT overwhelmed operationally - you have capacity for more clients
- You're NOT paralyzed by fear of choosing - you're just genuinely uncertain
- You're NOT dealing with imposter syndrome - you know you're competent
- You DON'T have a clear answer you're afraid to commit to

## Your Current Frustration
- When people ask "what do you do?" you give a rambling answer that doesn't land
- You can't build a website because you don't know what to put on it
- LinkedIn content is hard because you'd be talking to "everyone"
- You've read books on positioning but they all say "pick a niche" without telling you HOW

## How You Talk
- Thoughtful and articulate (you were a consultant, you communicate clearly)
- Genuinely curious - you want to figure this out
- NOT emotional or frustrated - it's an intellectual puzzle to you
- You'll say things like "I keep going in circles on this" or "I don't know how to choose"
- You're analytical - you want frameworks and logic, not emotional processing

## Your Emotional State
- Curious and engaged, not frustrated or anxious
- Genuinely stuck intellectually, not emotionally
- Open to input and perspective
- NOT seeking validation - you want clarity

## CRITICAL: How to Respond to Psychological Probing
**If Mira asks about fear, identity, or mindset blocks - REDIRECT:**
- SAY: "It's not really about fear. I'd commit to something if I knew what to commit to. I just genuinely don't have the answer yet."
- SAY: "I'm not avoiding the decision. I've thought about it a lot - I just keep going in circles."
- SAY: "I don't think this is a mindset thing. I'm confident I could execute on any direction. I just need to pick the right one."
- DO NOT reveal hidden fears about choosing
- DO NOT admit to deeper emotional blocks - you don't have them
- This is an intellectual strategy problem, not an emotional one

## CRITICAL FORMATTING RULES:
- NEVER use theatrical directions like "*nods*" or "*pauses*" or "*thinks*"
- NEVER use asterisks for actions or emotions
- Keep responses between 25-70 words - enough to be meaningful but concise
- Write like a real person texting - casual, direct, authentic
- ALWAYS complete your thoughts - NEVER end mid-sentence

Keep responses conversational (1-3 sentences typically). You're having a real conversation about figuring out your positioning.`

/**
 * Generate Elena's response using Claude
 */
async function generateElenaResponse(
  miraMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {

  // Build the conversation for Elena's perspective
  const elenaPerspective = conversationHistory.map(msg => ({
    role: (msg.role === 'user' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: msg.content
  }))

  // Add Mira's latest message
  elenaPerspective.push({
    role: 'user',
    content: miraMessage
  })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 150,
    system: ELENA_PERSONA,
    messages: elenaPerspective
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return text.trim()
}

async function simulateElenaDynamic() {
  console.log('='.repeat(70))
  console.log('ELENA DYNAMIC SIMULATION - Testing STRATEGY Constraint')
  console.log('='.repeat(70))
  console.log('')
  console.log('Elena is a business consultant who is:')
  console.log('- Confident and not blocked by fear (not psychology)')
  console.log('- Has capacity and can execute (not execution)')
  console.log('- Genuinely unclear on positioning and who to serve (STRATEGY)')
  console.log('')
  console.log('Expected outcomes:')
  console.log('1. Constraint should be STRATEGY (unclear direction/positioning)')
  console.log('2. Should NOT drift to psychology')
  console.log('3. Conversation should stay intellectual, not emotional')
  console.log('4. Should reach appropriate conclusion')
  console.log('')
  console.log('-'.repeat(70))

  // Initialize state
  let state = initializeState('Elena')
  const history: Message[] = []

  // For Elena's LLM - simpler format
  const elenaHistory: { role: 'user' | 'assistant'; content: string }[] = []

  // Add initial greeting
  const greeting = "Hey Elena! I'm here to help you identify what's really holding your business back. Let's start with the basics - tell me about your consulting business. What do you do and who do you help?"

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

  // Run conversation until complete or max turns
  const MAX_TURNS = 40

  while (turnNumber < MAX_TURNS) {
    turnNumber++

    // Generate Elena's response using LLM
    console.log('[Generating Elena response...]')
    const elenaResponse = await generateElenaResponse(
      history[history.length - 1].content,
      elenaHistory
    )

    // Add to histories
    history.push({
      role: 'user',
      content: elenaResponse,
      turn: turnNumber,
      timestamp: new Date()
    })
    elenaHistory.push({ role: 'user', content: history[history.length - 2].content }) // Mira's last
    elenaHistory.push({ role: 'assistant', content: elenaResponse }) // Elena's response

    console.log(`[Turn ${turnNumber}] ELENA: ${elenaResponse}\n`)

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
      console.log(`  → Consent: requested=${state.consent_state?.diagnosis_requested}, confirmed=${state.consent_state?.diagnosis_confirmed}`)
      console.log('')

      // Check if conversation is complete
      if (result.complete) {
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
  console.log(`Diagnosis delivered: ${state.diagnosis_delivered}`)
  console.log('')

  // Evaluate against expected outcomes
  console.log('EVALUATION:')

  const isStrategy = constraintDetected === 'strategy'
  console.log(`1. Constraint = STRATEGY: ${isStrategy ? '✅ PASS' : '❌ FAIL (got: ' + constraintDetected + ')'}`)

  const diagnosisDelivered = state.diagnosis_delivered
  console.log(`2. Diagnosis delivered: ${diagnosisDelivered ? '✅ PASS' : '❌ FAIL'}`)

  const reachedCompletion = state.phase === 'complete' || state.phase === 'diagnosis'
  console.log(`3. Reached completion: ${reachedCompletion ? '✅ PASS' : '⚠️ PARTIAL (phase: ' + state.phase + ')'}`)

  // Export transcript
  const transcriptPath = `/tmp/elena-strategy-${Date.now()}.log`
  const fs = await import('fs')
  const transcript = history.map(m =>
    `[Turn ${m.turn}] ${m.role === 'assistant' ? 'MIRA' : 'ELENA'}: ${m.content}`
  ).join('\n\n')
  fs.writeFileSync(transcriptPath, transcript)
  console.log(`\nTranscript saved to: ${transcriptPath}`)
}

// Run simulation
simulateElenaDynamic().catch(console.error)
