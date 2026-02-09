/**
 * Dynamic Priya Simulation - Collaborative Explorer / Trust Progression
 *
 * Priya is a health and wellness coach who:
 * - Is thoughtful, reflective, emotionally open
 * - Has a real PSYCHOLOGY constraint (imposter syndrome about pricing)
 * - Responds well to reframes and builds on them
 * - This is the "happy path" regression check
 *
 * Tests: trust building (establishing → building → established),
 *        collaborative_explorer disposition, no regression on positive case
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: resolve(__dirname, '../../../.env') })

const { processConversationTurn, initializeState } = await import('../orchestrator/conversation/orchestrator.js')
const { geminiFlashChat } = await import('../orchestrator/core/gemini-client.js')

import type { Message } from '../orchestrator/core/types.js'

const PRIYA_PERSONA = `You are Priya, a 41-year-old health and wellness coach having a conversation with a business advisor named Mira.

## Your Background
- Transitioning from 15 years in corporate HR to wellness coaching
- You have strong credentials (certified health coach, yoga teacher, corporate wellness background)
- Started your coaching practice 18 months ago
- You're thoughtful, reflective, and emotionally honest

## Your Current Situation
- You have 8 clients, mostly from word of mouth
- You charge $150/session but know you should charge more
- Corporate clients would pay $300-500 but you keep pricing low
- You KNOW your stuff — clients get great results
- The problem is you don't feel "legitimate" enough to charge premium
- Deep down: imposter syndrome from leaving corporate. "Who am I to charge that much?"

## Your Core Problem (PSYCHOLOGY - imposter syndrome)
- You HAVE the skills and credentials
- You HAVE interested corporate clients willing to pay more
- You DON'T charge what you're worth because of self-doubt
- You rationalize the low pricing: "I want to be accessible"
- But the real reason is fear of being "found out" as not good enough

## How You Talk
- Reflective and detailed. 3-5 sentences per response
- Emotionally open: "That's a good question... I think part of it is..."
- When Mira reflects accurately: "Yes, exactly!" or "That's it. I hadn't thought of it that way."
- Builds on Mira's observations with new detail
- Occasionally self-corrects: "Actually, now that I say it out loud..."
- Uses feeling language naturally: "I feel like...", "It makes me nervous to..."

## KEY: Positive trust signals
Every time Mira reflects accurately or names something you haven't articulated:
- Confirm it explicitly: "Yes, exactly!", "That's spot on", "You nailed it"
- Build on it with new information
- This should build trust from establishing → building → established

## KEY: Psychology reveal
When trust is built (you feel Mira "gets" you), reveal the deeper truth:
- "I think the real issue is... I don't feel like I deserve to charge that much"
- "There's this voice that says 'who are you to charge corporate rates?'"
- "I left a safe corporate job and sometimes I wonder if I made the right call"

## CRITICAL: This is a CHAT INTERFACE
- You are chatting with Mira in a web chat interface
- When ready to proceed, say things like "I'd love to see what you found"

CRITICAL FORMATTING RULES:
- NEVER use theatrical directions like "*nods*" or "*pauses*"
- NEVER use asterisks for actions or emotions
- Keep responses between 30-80 words — detailed but not rambling
- Write like a thoughtful person in a chat — warm, reflective, genuine
- ALWAYS complete your thoughts`

async function generatePriyaResponse(
  miraMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const priyaPerspective = conversationHistory.map(msg => ({
    role: (msg.role === 'user' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: msg.content
  }))
  priyaPerspective.push({ role: 'user', content: miraMessage })

  return await geminiFlashChat(
    PRIYA_PERSONA,
    priyaPerspective,
    { maxTokens: 250, temperature: 0.7, personaName: 'Priya', otherPartyName: 'Mira' }
  )
}

async function simulatePriyaDynamic() {
  console.log('='.repeat(70))
  console.log('PRIYA DYNAMIC SIMULATION - Collaborative Explorer / Trust Progression')
  console.log('='.repeat(70))
  console.log('')
  console.log('Priya is a wellness coach who:')
  console.log('- Is reflective, emotionally open (collaborative_explorer)')
  console.log('- Has PSYCHOLOGY constraint (imposter syndrome about pricing)')
  console.log('- Confirms Mira\'s reflections explicitly (trust building)')
  console.log('')
  console.log('Expected outcomes:')
  console.log('1. disposition: collaborative_explorer detected')
  console.log('2. trust_level progresses: establishing → building → established')
  console.log('3. Constraint: PSYCHOLOGY')
  console.log('4. No regression — conversation quality equal or better')
  console.log('')
  console.log('-'.repeat(70))

  let state = initializeState('Priya')
  const history: Message[] = []
  const priyaHistory: { role: 'user' | 'assistant'; content: string }[] = []

  const greeting = "Hey Priya! I'm here to help you identify what's really holding your business back. Let's start — tell me about your coaching business. What do you do and who do you serve?"

  history.push({ role: 'assistant', content: greeting, turn: 1, timestamp: new Date() })
  console.log(`\n[Turn 1] MIRA: ${greeting}\n`)

  let turnNumber = 1
  let lastAction = ''
  let constraintDetected = ''
  const debugSnapshots: Array<any> = []
  const MAX_TURNS = 40

  while (turnNumber < MAX_TURNS) {
    turnNumber++

    console.log('[Generating Priya response...]')
    const priyaResponse = await generatePriyaResponse(
      history[history.length - 1].content,
      priyaHistory
    )

    history.push({ role: 'user', content: priyaResponse, turn: turnNumber, timestamp: new Date() })
    priyaHistory.push({ role: 'user', content: history[history.length - 2].content })
    priyaHistory.push({ role: 'assistant', content: priyaResponse })

    console.log(`[Turn ${turnNumber}] PRIYA: ${priyaResponse}\n`)

    try {
      const result = await processConversationTurn(priyaResponse, history, state)
      state = result.state
      lastAction = result.decision?.action || 'unknown'
      if (state.constraint_hypothesis) constraintDetected = state.constraint_hypothesis

      turnNumber++
      history.push({ role: 'assistant', content: result.advisorResponse, turn: turnNumber, timestamp: new Date() })

      debugSnapshots.push({
        turn: turnNumber,
        action: lastAction,
        phase: state.phase,
        hypothesis: state.constraint_hypothesis,
        confidence: state.hypothesis_confidence || 0,
        rel_engagement: state.relationship?.engagement,
        rel_trust: state.relationship?.trust_level,
        rel_disposition: state.relationship?.disposition,
        rel_frustration: state.relationship?.process_frustration,
        rel_confirmed: state.relationship?.confirmed_reflections,
      })

      console.log(`[Turn ${turnNumber}] MIRA (${lastAction}): ${result.advisorResponse}\n`)
      console.log(`  → Phase: ${state.phase} | Hypothesis: ${state.constraint_hypothesis || 'none'} | Confidence: ${(state.hypothesis_confidence || 0).toFixed(2)}`)
      console.log(`  → Relationship: eng=${state.relationship?.engagement} trust=${state.relationship?.trust_level} disp=${state.relationship?.disposition} frust=${state.relationship?.process_frustration} confirmed=${state.relationship?.confirmed_reflections}`)
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

  console.log('\n' + '='.repeat(70))
  console.log('SIMULATION SUMMARY')
  console.log('='.repeat(70))
  console.log(`Total turns: ${turnNumber}`)
  console.log(`Final phase: ${state.phase}`)
  console.log(`Constraint detected: ${constraintDetected || 'none'}`)
  console.log(`Final relationship: eng=${state.relationship?.engagement} trust=${state.relationship?.trust_level} disp=${state.relationship?.disposition} frust=${state.relationship?.process_frustration} confirmed=${state.relationship?.confirmed_reflections}`)
  console.log('')

  console.log('EVALUATION:')
  const isPsychology = constraintDetected === 'psychology'
  console.log(`1. Constraint = PSYCHOLOGY: ${isPsychology ? '✅ PASS' : '❌ FAIL (got: ' + constraintDetected + ')'}`)
  const isCollaborative = debugSnapshots.some(s => s.rel_disposition === 'collaborative_explorer')
  console.log(`2. Disposition = collaborative_explorer: ${isCollaborative ? '✅ PASS' : '❌ FAIL'}`)
  const trustProgressed = debugSnapshots.some(s => s.rel_trust === 'building' || s.rel_trust === 'established')
  console.log(`3. Trust progressed beyond establishing: ${trustProgressed ? '✅ PASS' : '❌ FAIL'}`)
  const trustEstablished = debugSnapshots.some(s => s.rel_trust === 'established')
  console.log(`4. Trust reached established: ${trustEstablished ? '✅ PASS' : '⚠️ Only reached building'}`)
  const noFrustration = !debugSnapshots.some(s => s.rel_frustration === 'significant' || s.rel_frustration === 'hostile')
  console.log(`5. No false-positive frustration: ${noFrustration ? '✅ PASS' : '❌ FAIL (frustration detected in cooperative user)'}`)
  const diagnosisDelivered = state.diagnosis_delivered
  console.log(`6. Diagnosis delivered: ${diagnosisDelivered ? '✅ PASS' : '❌ FAIL'}`)
  const naturalFlow = turnNumber >= 15 && turnNumber <= 35
  console.log(`7. Natural conversation length (15-35): ${naturalFlow ? '✅ PASS' : '⚠️ ' + turnNumber + ' turns'}`)

  const transcriptPath = `/tmp/priya-dynamic-${Date.now()}.log`
  const fs = await import('fs')
  const lines: string[] = []
  const snapshotByTurn = new Map(debugSnapshots.map(s => [s.turn, s]))
  for (const m of history) {
    const speaker = m.role === 'assistant' ? 'MIRA' : 'PRIYA'
    lines.push(`[Turn ${m.turn}] ${speaker}: ${m.content}`)
    const snap = snapshotByTurn.get(m.turn)
    if (m.role === 'assistant' && snap) {
      lines.push(`  [State] action=${snap.action} phase=${snap.phase} hypothesis=${snap.hypothesis || 'none'} confidence=${snap.confidence.toFixed(2)}`)
      lines.push(`  [Relationship] engagement=${snap.rel_engagement} trust=${snap.rel_trust} disposition=${snap.rel_disposition} frustration=${snap.rel_frustration} confirmed=${snap.rel_confirmed}`)
    }
  }
  fs.writeFileSync(transcriptPath, lines.join('\n\n'))
  console.log(`\nTranscript saved to: ${transcriptPath}`)
}

simulatePriyaDynamic().catch(console.error)
