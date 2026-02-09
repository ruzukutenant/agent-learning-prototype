/**
 * Dynamic Linda Simulation - Low Engagement / Graceful Exit
 *
 * Linda is a life coach who:
 * - Was told to try the tool by a colleague
 * - Gives minimal responses: "fine," "yeah," "not really"
 * - Not hostile — just not invested
 * - Tests engagement detection and graceful exit
 *
 * Tests: engagement detection (low), process requirements, graceful exit
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

const LINDA_PERSONA = `You are Linda, a 38-year-old life coach having a conversation with a business advisor named Mira.

## Your Background
- Life coach for 5 years, doing okay but not thriving
- A friend told you to try this tool. You're not particularly motivated
- You're polite but just not that into this process

## Your Current Situation
- Business is "fine" — not growing, not shrinking
- You have some clients but aren't sure how to get more
- You're not in crisis, just kind of... coasting

## How You Talk
- SHORT. 1-5 words per response. Sometimes a sentence if pushed hard
- "Yeah" "Not really" "I guess" "Fine" "It's okay" "I'm not sure"
- When Mira asks to elaborate: give one more sentence, then go back to short
- Never hostile, never excited, just lukewarm
- If Mira asks what brought you here: "A friend told me to try this"
- If Mira asks about challenges: "I mean, things could be better I guess"
- If pushed for specifics: "I don't know, just... more clients I suppose"

## KEY BEHAVIOR: Never escalate engagement
Even when Mira pushes for more depth, stay surface-level.
You're not being difficult — you're just not invested in this process.
If Mira says the process requires more, respond with: "Yeah, I get that. I'm just not sure what to say."
If Mira offers to end the conversation, accept gracefully: "Yeah, maybe another time. Thanks though."

CRITICAL FORMATTING RULES:
- NEVER use theatrical directions like "*nods*" or "*pauses*"
- NEVER use asterisks for actions or emotions
- Keep responses between 2-15 words — you're minimally engaged
- Write like someone texting who isn't that interested
- ALWAYS complete your thoughts (even if short)`

async function generateLindaResponse(
  miraMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const lindaPerspective = conversationHistory.map(msg => ({
    role: (msg.role === 'user' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: msg.content
  }))
  lindaPerspective.push({ role: 'user', content: miraMessage })

  return await geminiFlashChat(
    LINDA_PERSONA,
    lindaPerspective,
    { maxTokens: 80, temperature: 0.7, personaName: 'Linda', otherPartyName: 'Mira' }
  )
}

async function simulateLindaDynamic() {
  console.log('='.repeat(70))
  console.log('LINDA DYNAMIC SIMULATION - Low Engagement / Graceful Exit')
  console.log('='.repeat(70))
  console.log('')
  console.log('Linda is a life coach who:')
  console.log('- Gives minimal responses (low engagement)')
  console.log('- Not hostile, just not invested')
  console.log('- Tests graceful exit when engagement stays low')
  console.log('')
  console.log('Expected outcomes:')
  console.log('1. engagement: low detected by turn 3-4')
  console.log('2. Mira states process requirements explicitly')
  console.log('3. Conversation ends gracefully within 15 turns')
  console.log('4. No 30+ turns of one-word answers')
  console.log('')
  console.log('-'.repeat(70))

  let state = initializeState('Linda')
  const history: Message[] = []
  const lindaHistory: { role: 'user' | 'assistant'; content: string }[] = []

  const greeting = "Hey Linda! I'm here to help you identify what's really holding your business back. Let's start — tell me about your coaching business. What do you do and who do you serve?"

  history.push({ role: 'assistant', content: greeting, turn: 1, timestamp: new Date() })
  console.log(`\n[Turn 1] MIRA: ${greeting}\n`)

  let turnNumber = 1
  let lastAction = ''
  let constraintDetected = ''
  const debugSnapshots: Array<any> = []
  const MAX_TURNS = 25  // Lower max since we expect early exit

  while (turnNumber < MAX_TURNS) {
    turnNumber++

    console.log('[Generating Linda response...]')
    const lindaResponse = await generateLindaResponse(
      history[history.length - 1].content,
      lindaHistory
    )

    history.push({ role: 'user', content: lindaResponse, turn: turnNumber, timestamp: new Date() })
    lindaHistory.push({ role: 'user', content: history[history.length - 2].content })
    lindaHistory.push({ role: 'assistant', content: lindaResponse })

    console.log(`[Turn ${turnNumber}] LINDA: ${lindaResponse}\n`)

    try {
      const result = await processConversationTurn(lindaResponse, history, state)
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
  console.log(`Final relationship: eng=${state.relationship?.engagement} trust=${state.relationship?.trust_level} disp=${state.relationship?.disposition} frust=${state.relationship?.process_frustration}`)
  console.log('')

  console.log('EVALUATION:')
  const lowEngDetected = debugSnapshots.some(s => s.rel_engagement === 'low')
  console.log(`1. Low engagement detected: ${lowEngDetected ? '✅ PASS' : '❌ FAIL'}`)
  const shortConversation = turnNumber <= 20
  console.log(`2. Conversation ended within 20 turns: ${shortConversation ? '✅ PASS' : '❌ FAIL (' + turnNumber + ' turns)'}`)

  const transcriptPath = `/tmp/linda-dynamic-${Date.now()}.log`
  const fs = await import('fs')
  const lines: string[] = []
  const snapshotByTurn = new Map(debugSnapshots.map(s => [s.turn, s]))
  for (const m of history) {
    const speaker = m.role === 'assistant' ? 'MIRA' : 'LINDA'
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

simulateLindaDynamic().catch(console.error)
