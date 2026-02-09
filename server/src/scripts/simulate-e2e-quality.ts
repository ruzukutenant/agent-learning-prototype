/**
 * End-to-End Quality Simulation
 *
 * Tests full conversation quality with a realistic persona.
 * Focus: Natural conversation flow, appropriate pacing, and clean closing.
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { processConversationTurn, initializeState } from '../orchestrator/conversation/orchestrator.js'
import type { Message } from '../orchestrator/core/types.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Sarah - Executive coach with psychology constraint (perfectionism/fear of being "found out")
const SARAH_PERSONA = `You are Sarah, a 42-year-old executive coach chatting with a business advisor named Mira.

YOUR SITUATION:
- Former Fortune 500 VP of People, now independent executive coach (2.5 years)
- 8 clients, ~$12k/month, mostly from old corporate network
- You know you need to raise your rates and take on bigger engagements but you keep underselling
- Deep down: perfectionism, fear of charging "too much" and being exposed as not worth it
- You just finished a big engagement and have bandwidth, but still hesitating on outreach

THE REAL ISSUE (reveal gradually):
- This is NOT about not knowing your value - you have C-suite experience and strong results
- It's about fear that if you charge premium rates, people will expect perfection and "find out" you're not as good as they think
- You help execs with confidence but secretly doubt your own worth

HOW TO RESPOND:
- Write like you're typing in a chat app - SHORT responses (1-3 sentences)
- Be direct and analytical - you're used to being the smartest person in the room
- Answer what's asked, then maybe add one thought
- If something lands, acknowledge it simply
- Be honest about your fears when it feels safe
- When asked about pricing/positioning, be real about your hesitation

CRITICAL RULES:
- NEVER use theatrical directions like "*nods*" or "*pauses*" or "*thinks*"
- NEVER use asterisks for actions or emotions
- Keep responses between 25-70 words - enough to be meaningful but concise
- Write like a real person texting - casual, direct, authentic
- ALWAYS complete your thoughts - NEVER end mid-sentence or trail off
- If you start a thought, finish it completely
- No "..." at the end of sentences unless you're intentionally pausing`

/**
 * Generate Sarah's response
 */
async function generateSarahResponse(
  miraMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  turnNumber: number
): Promise<string> {
  const rachelPerspective = conversationHistory.map(msg => ({
    role: (msg.role === 'user' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: msg.content
  }))

  rachelPerspective.push({
    role: 'user',
    content: miraMessage
  })

  // Add turn-specific guidance to help conversation progress naturally
  let turnGuidance = ''
  if (turnNumber > 12 && turnNumber <= 18) {
    turnGuidance = '\n\nNote: If insights land, acknowledge briefly. Show you understand your situation.'
  } else if (turnNumber > 18 && turnNumber <= 24) {
    turnGuidance = '\n\nNote: If diagnosis resonates, say so clearly. Be honest about readiness.'
  } else if (turnNumber > 24) {
    turnGuidance = '\n\nNote: Conversation wrapping up. Respond directly to what\'s offered.'
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 150,  // Enough room for complete thoughts
    system: SARAH_PERSONA + turnGuidance,
    messages: rachelPerspective
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return text.trim()
}

// Quality metrics
interface QualityMetrics {
  totalTurns: number
  phaseTransitions: string[]
  constraintEvolution: string[]
  repetitivePatterns: string[]
  awkwardTransitions: string[]
  goodMoments: string[]
  componentTriggers: number
  finalConstraint: string | null
  diagnosisDelivered: boolean
  conversationComplete: boolean
}

async function runQualitySimulation() {
  console.log('═'.repeat(70))
  console.log('END-TO-END QUALITY SIMULATION')
  console.log('═'.repeat(70))
  console.log('')
  console.log('Persona: Sarah (Executive Coach)')
  console.log('Expected Constraint: Psychology (perfectionism/fear of not being worth it)')
  console.log('Focus: Conversation quality, natural flow, appropriate pacing')
  console.log('')
  console.log('─'.repeat(70))

  const metrics: QualityMetrics = {
    totalTurns: 0,
    phaseTransitions: [],
    constraintEvolution: [],
    repetitivePatterns: [],
    awkwardTransitions: [],
    goodMoments: [],
    componentTriggers: 0,
    finalConstraint: null,
    diagnosisDelivered: false,
    conversationComplete: false
  }

  let state = initializeState('Sarah')
  const history: Message[] = []
  const sarahHistory: { role: 'user' | 'assistant'; content: string }[] = []

  // Track for pattern detection
  const miraOpeners: string[] = []

  // Initial greeting
  const greeting = "Hey Sarah! I'm here to help you get clear on what's really holding your business back. Tell me about your coaching practice - what do you do and how's it going?"

  history.push({
    role: 'assistant',
    content: greeting,
    turn: 1,
    timestamp: new Date()
  })

  console.log(`\n[Turn 1] MIRA: ${greeting}\n`)

  let turnNumber = 1
  let lastPhase = state.phase
  let lastConstraint = state.constraint_hypothesis
  const MAX_TURNS = 35

  while (turnNumber < MAX_TURNS) {
    turnNumber++

    // Generate Rachel's response
    const sarahResponse = await generateSarahResponse(
      history[history.length - 1].content,
      sarahHistory,
      turnNumber
    )

    history.push({
      role: 'user',
      content: sarahResponse,
      turn: turnNumber,
      timestamp: new Date()
    })
    sarahHistory.push({ role: 'user', content: history[history.length - 2].content })
    sarahHistory.push({ role: 'assistant', content: sarahResponse })

    console.log(`[Turn ${turnNumber}] SARAH: ${sarahResponse}\n`)

    try {
      const result = await processConversationTurn(sarahResponse, history, state)
      state = result.state

      // Track phase transitions
      if (state.phase !== lastPhase) {
        metrics.phaseTransitions.push(`Turn ${turnNumber}: ${lastPhase} → ${state.phase}`)
        lastPhase = state.phase
      }

      // Track constraint evolution
      if (state.constraint_hypothesis !== lastConstraint) {
        metrics.constraintEvolution.push(
          `Turn ${turnNumber}: ${lastConstraint || 'none'} → ${state.constraint_hypothesis}`
        )
        lastConstraint = state.constraint_hypothesis
      }

      // Track component triggers
      if (result.components?.components && result.components.components.length > 0) {
        metrics.componentTriggers++
      }

      turnNumber++

      history.push({
        role: 'assistant',
        content: result.advisorResponse,
        turn: turnNumber,
        timestamp: new Date()
      })

      // Check for repetitive openers
      const opener = result.advisorResponse.split('.')[0]
      if (miraOpeners.includes(opener)) {
        metrics.repetitivePatterns.push(`Turn ${turnNumber}: Repeated opener "${opener.substring(0, 40)}..."`)
      }
      miraOpeners.push(opener)

      // Check for good moments (insights, breakthroughs)
      if (result.decision?.action === 'reflect_insight') {
        metrics.goodMoments.push(`Turn ${turnNumber}: Insight reflection`)
      }
      if (result.decision?.action === 'surface_contradiction') {
        metrics.goodMoments.push(`Turn ${turnNumber}: Surfaced contradiction`)
      }

      // Log turn with context
      const actionLabel = result.decision?.action || 'unknown'
      console.log(`[Turn ${turnNumber}] MIRA (${actionLabel}): ${result.advisorResponse}\n`)
      console.log(`  Phase: ${state.phase} | Constraint: ${state.constraint_hypothesis || 'none'} (${(state.hypothesis_confidence || 0).toFixed(2)})`)
      console.log(`  Readiness: clarity=${state.readiness?.clarity}, confidence=${state.readiness?.confidence}`)
      console.log('')

      if (result.complete) {
        metrics.conversationComplete = true
        console.log('\n' + '═'.repeat(70))
        console.log('CONVERSATION COMPLETE')
        console.log('═'.repeat(70))
        break
      }

    } catch (error) {
      console.error(`\n❌ Error at turn ${turnNumber}:`, error)
      break
    }
  }

  // Final metrics
  metrics.totalTurns = turnNumber
  metrics.finalConstraint = state.constraint_hypothesis
  metrics.diagnosisDelivered = state.diagnosis_delivered

  // Print quality assessment
  console.log('\n' + '═'.repeat(70))
  console.log('CONVERSATION QUALITY ASSESSMENT')
  console.log('═'.repeat(70))

  console.log('\n📊 BASIC METRICS:')
  console.log(`   Total turns: ${metrics.totalTurns}`)
  console.log(`   Final constraint: ${metrics.finalConstraint || 'none'}`)
  console.log(`   Diagnosis delivered: ${metrics.diagnosisDelivered ? '✅' : '❌'}`)
  console.log(`   Conversation complete: ${metrics.conversationComplete ? '✅' : '❌'}`)
  console.log(`   Component triggers: ${metrics.componentTriggers}`)

  console.log('\n📈 PHASE PROGRESSION:')
  if (metrics.phaseTransitions.length > 0) {
    metrics.phaseTransitions.forEach(t => console.log(`   ${t}`))
  } else {
    console.log('   No phase transitions recorded')
  }

  console.log('\n🎯 CONSTRAINT EVOLUTION:')
  if (metrics.constraintEvolution.length > 0) {
    metrics.constraintEvolution.forEach(e => console.log(`   ${e}`))
  } else {
    console.log('   No constraint changes recorded')
  }

  console.log('\n✨ GOOD MOMENTS:')
  if (metrics.goodMoments.length > 0) {
    metrics.goodMoments.forEach(m => console.log(`   ${m}`))
  } else {
    console.log('   No notable moments recorded')
  }

  console.log('\n⚠️  REPETITIVE PATTERNS:')
  if (metrics.repetitivePatterns.length > 0) {
    metrics.repetitivePatterns.forEach(p => console.log(`   ${p}`))
  } else {
    console.log('   ✅ No repetitive patterns detected')
  }

  // Overall assessment
  console.log('\n' + '═'.repeat(70))
  console.log('OVERALL QUALITY EVALUATION')
  console.log('═'.repeat(70))

  const correctConstraint = metrics.finalConstraint === 'psychology'
  const naturalLength = metrics.totalTurns >= 15 && metrics.totalTurns <= 35
  const noExcessiveRepetition = metrics.repetitivePatterns.length <= 2
  const reachedConclusion = metrics.diagnosisDelivered

  console.log(`\n1. Correct constraint identified (psychology): ${correctConstraint ? '✅ PASS' : '❌ FAIL - got: ' + metrics.finalConstraint}`)
  console.log(`2. Natural conversation length (15-35 turns): ${naturalLength ? '✅ PASS' : '⚠️ ' + metrics.totalTurns + ' turns'}`)
  console.log(`3. Minimal repetitive patterns (≤2): ${noExcessiveRepetition ? '✅ PASS' : '⚠️ ' + metrics.repetitivePatterns.length + ' patterns'}`)
  console.log(`4. Reached diagnosis: ${reachedConclusion ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`5. Component shown once: ${metrics.componentTriggers === 1 ? '✅ PASS' : metrics.componentTriggers === 0 ? '⚠️ No component' : '❌ ' + metrics.componentTriggers + ' triggers'}`)

  const overallPass = correctConstraint && naturalLength && noExcessiveRepetition && reachedConclusion
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`RESULT: ${overallPass ? '✅ QUALITY STANDARDS MET' : '⚠️ SOME AREAS NEED ATTENTION'}`)
  console.log('═'.repeat(70))

  // Save transcript
  const transcriptPath = `/tmp/e2e-quality-sarah-${Date.now()}.log`
  const fs = await import('fs')
  const transcript = history.map(m =>
    `[Turn ${m.turn}] ${m.role === 'assistant' ? 'MIRA' : 'SARAH'}: ${m.content}`
  ).join('\n\n')
  fs.writeFileSync(transcriptPath, transcript)
  console.log(`\nTranscript saved to: ${transcriptPath}`)
}

runQualitySimulation().catch(console.error)
