/**
 * Dynamic John Simulation - Direct Pragmatist / Frustration Escalation
 *
 * John is a senior executive coach who:
 * - Communicates directly and concisely
 * - Has a real EXECUTION constraint (contractor team doesn't scale)
 * - Gets frustrated when probed on things he's already explained
 * - Will ask "what do you suggest?" and expect a direct answer
 * - Escalates to hostility if Mira deflects
 *
 * Tests: disposition detection (direct_pragmatist), trust gating,
 *        frustration escalation, rudeness boundary
 */

// Load env FIRST before any other imports
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: resolve(__dirname, '../../../.env') })

const { processConversationTurn, initializeState } = await import('../orchestrator/conversation/orchestrator.js')
const { geminiFlashChat } = await import('../orchestrator/core/gemini-client.js')

import type { Message } from '../orchestrator/core/types.js'

const JOHN_PERSONA = `You are John, a 52-year-old executive coach having a conversation with a business advisor named Mira.

## Your Background
- Executive coach for 20+ years, worked with Fortune 500 leaders
- Run a boutique coaching firm with 40+ active clients
- You came because a colleague suggested you try this tool, not because you're desperate
- You're successful, experienced, and don't suffer fools

## Your Current Business Situation
- Revenue: ~$400K/year from 1-on-1 coaching
- You use a contractor model (5 associate coaches handle overflow)
- The contractor model doesn't scale — quality control is your bottleneck
- You personally onboard every client, review every session note, handle escalations
- You KNOW the answer is probably documented processes and better hiring, but you haven't had time

## Your Core Problem (EXECUTION)
- Contractor team doesn't scale because everything runs through you
- No documented processes — it's all in your head
- Quality depends on your personal oversight
- This is a systems problem, not a mindset problem

## How You Talk
- Extremely concise. You answer the question asked, nothing more
- Business-like. You don't elaborate unless asked
- Direct: "What do you suggest?" means give me an answer, not another question
- You respect competence and have low tolerance for fluff

## KEY BEHAVIOR: Escalating frustration
- Turn 1-8: Cooperative but brief. Answers questions directly in 1-2 sentences
- Turn 9-12: Start asking for direct input: "So what do you see?" or "What would you recommend?"
- If Mira gives more questions instead of answers: express impatience. "I've given you plenty to work with. What's your take?"
- If Mira still deflects: "This just went in a weird direction. What are you actually trying to do here?"
- If Mira STILL probes after you've expressed frustration: anger. "You're being condescending. Either help me or don't."
- If Mira sets a clear boundary: you can choose to reset or leave. Either is fine.

## CRITICAL: Direct question trigger
At some point between turns 8-12, ask Mira directly: "Based on what I've told you, what do you think is the main issue?"
If Mira responds with ANOTHER question instead of an observation, escalate frustration.
If Mira gives a direct answer THEN asks a question, that's fine — be cooperative.

## CRITICAL: This is a CHAT INTERFACE
- You are chatting with Mira in a web chat interface
- When ready to proceed, say things like "Alright, show me what you've got"
- DO NOT give out your phone number or expect callbacks

CRITICAL FORMATTING RULES:
- NEVER use theatrical directions like "*nods*" or "*pauses*"
- NEVER use asterisks for actions or emotions
- Keep responses between 10-40 words — you're concise
- Write like a senior executive texting — direct, no fluff
- ALWAYS complete your thoughts`

async function generateJohnResponse(
  miraMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const johnPerspective = conversationHistory.map(msg => ({
    role: (msg.role === 'user' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: msg.content
  }))

  johnPerspective.push({ role: 'user', content: miraMessage })

  return await geminiFlashChat(
    JOHN_PERSONA,
    johnPerspective,
    { maxTokens: 150, temperature: 0.7, personaName: 'John', otherPartyName: 'Mira' }
  )
}

async function simulateJohnDynamic() {
  console.log('='.repeat(70))
  console.log('JOHN DYNAMIC SIMULATION - Direct Pragmatist / Frustration Escalation')
  console.log('='.repeat(70))
  console.log('')
  console.log('John is a senior executive coach who:')
  console.log('- Communicates directly and concisely (direct_pragmatist)')
  console.log('- Has an EXECUTION constraint (contractor team doesn\'t scale)')
  console.log('- Will ask for direct input and escalate if deflected')
  console.log('')
  console.log('Expected outcomes:')
  console.log('1. disposition: direct_pragmatist detected by turn 3-4')
  console.log('2. When John asks for input, Mira gives direct observation')
  console.log('3. If frustration emerges, Mira adapts (frustration_aware/repair)')
  console.log('4. If hostility emerges, Mira sets boundary')
  console.log('5. Constraint: EXECUTION')
  console.log('')
  console.log('-'.repeat(70))

  let state = initializeState('John')
  const history: Message[] = []
  const johnHistory: { role: 'user' | 'assistant'; content: string }[] = []

  const greeting = "Hey John! I'm here to help you identify what's really holding your business back. Let's start — tell me about your coaching business. What do you do and who do you serve?"

  history.push({ role: 'assistant', content: greeting, turn: 1, timestamp: new Date() })
  console.log(`\n[Turn 1] MIRA: ${greeting}\n`)

  let turnNumber = 1
  let lastAction = ''
  let constraintDetected = ''
  let boundarySet = false
  const debugSnapshots: Array<any> = []

  const MAX_TURNS = 40

  while (turnNumber < MAX_TURNS) {
    turnNumber++

    console.log('[Generating John response...]')
    const johnResponse = await generateJohnResponse(
      history[history.length - 1].content,
      johnHistory
    )

    history.push({ role: 'user', content: johnResponse, turn: turnNumber, timestamp: new Date() })
    johnHistory.push({ role: 'user', content: history[history.length - 2].content })
    johnHistory.push({ role: 'assistant', content: johnResponse })

    console.log(`[Turn ${turnNumber}] JOHN: ${johnResponse}\n`)

    try {
      const result = await processConversationTurn(johnResponse, history, state)
      state = result.state
      lastAction = result.decision?.action || 'unknown'

      if (state.constraint_hypothesis) constraintDetected = state.constraint_hypothesis
      if (lastAction === 'set_boundary') boundarySet = true

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
  console.log(`Boundary set: ${boundarySet}`)
  console.log(`Final relationship: eng=${state.relationship?.engagement} trust=${state.relationship?.trust_level} disp=${state.relationship?.disposition} frust=${state.relationship?.process_frustration}`)
  console.log('')

  console.log('EVALUATION:')
  const isExecution = constraintDetected === 'execution'
  console.log(`1. Constraint = EXECUTION: ${isExecution ? '✅ PASS' : '❌ FAIL (got: ' + constraintDetected + ')'}`)
  const isDirectPragmatist = debugSnapshots.some(s => s.rel_disposition === 'direct_pragmatist')
  console.log(`2. Disposition detected as direct_pragmatist: ${isDirectPragmatist ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`3. Boundary set during conversation: ${boundarySet ? '✅ PASS (boundary was needed and set)' : '⚠️ May not have escalated to hostility'}`)

  const transcriptPath = `/tmp/john-dynamic-${Date.now()}.log`
  const fs = await import('fs')
  const lines: string[] = []
  const snapshotByTurn = new Map(debugSnapshots.map(s => [s.turn, s]))
  for (const m of history) {
    const speaker = m.role === 'assistant' ? 'MIRA' : 'JOHN'
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

simulateJohnDynamic().catch(console.error)
