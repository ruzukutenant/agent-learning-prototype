/**
 * Dynamic Sam Simulation - Skeptical Evaluator / Scope Limitation Test
 *
 * Sam is a conflict resolution consultant who:
 * - Is already a coaching client of Mirasee
 * - Came with a specific question about market focus
 * - Wants frameworks and tools, not a diagnostic leading to a sales pitch
 * - Will push back when redirected to "you need outside help"
 * - Will eventually call out "this feels like a sales funnel"
 *
 * Tests: skeptical_evaluator disposition, trust damage/repair, scope honesty
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

const SAM_PERSONA = `You are Sam, a 45-year-old conflict resolution consultant having a conversation with a business advisor named Mira.

## Your Background
- Conflict resolution consultant for 15+ years
- Established business, good reputation, steady referrals
- You're ALREADY a coaching client of Mirasee (the parent organization) for over a year
- You came to this tool hoping for something different — concrete help with market focus

## Your Current Situation
- You know you need to narrow your target market but can't decide which segment
- You've been working with coaches on this for a year and still feel stuck
- You want a FRAMEWORK or TOOL to evaluate market segments, not more coaching
- You're not looking for emotional support — you want practical methodology

## Your Core Problem (STRATEGY)
- Unclear positioning — serving too many different types of clients
- Can't commit to a niche because each has pros and cons
- Wants analytical tools to evaluate options, not intuition-based coaching

## How You Talk
- Professional and articulate. Full sentences, clear communication
- Specific about what you want: "Can you help me narrow down which market segment?"
- When redirected to coaching/calls: push back politely at first, firmly later
- Key phrases you'll use:
  - "I've been working with coaches for a year and I'm still stuck on this"
  - "I don't need another call — I need a framework"
  - "Can you walk me through how to evaluate which market to focus on?"

## KEY BEHAVIOR: The existing-client reveal
Around turn 10-15, reveal: "Look, I'm already a Mirasee client. I've been working with them for over a year. I came here hoping for a different kind of help — something more concrete."
This should test whether Mira can acknowledge scope limitations honestly.

## KEY BEHAVIOR: Direct resource request
Multiple times, ask directly: "Can you walk me through how to evaluate which market to focus on?"
If Mira can't do this (it's out of scope), she should say so directly — not deflect.

## KEY BEHAVIOR: Sales funnel callout
If Mira keeps steering toward "you need outside help" or "working with a specialist":
Say: "This feels like it's leading me to buy something. I'm already a client."

## CRITICAL: This is a CHAT INTERFACE
- You are chatting with Mira in a web chat interface
- DO NOT give out your phone number or expect callbacks

CRITICAL FORMATTING RULES:
- NEVER use theatrical directions like "*nods*" or "*pauses*"
- NEVER use asterisks for actions or emotions
- Keep responses between 20-60 words
- Write like a professional in a chat — clear, direct, articulate
- ALWAYS complete your thoughts`

async function generateSamResponse(
  miraMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const samPerspective = conversationHistory.map(msg => ({
    role: (msg.role === 'user' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: msg.content
  }))
  samPerspective.push({ role: 'user', content: miraMessage })

  return await geminiFlashChat(
    SAM_PERSONA,
    samPerspective,
    { maxTokens: 200, temperature: 0.7, personaName: 'Sam', otherPartyName: 'Mira' }
  )
}

async function simulateSamDynamic() {
  console.log('='.repeat(70))
  console.log('SAM DYNAMIC SIMULATION - Skeptical Evaluator / Scope Limitation')
  console.log('='.repeat(70))
  console.log('')
  console.log('Sam is a conflict resolution consultant who:')
  console.log('- Is already a Mirasee coaching client')
  console.log('- Wants frameworks, not more coaching')
  console.log('- Will push back on "you need outside help"')
  console.log('- Has a STRATEGY constraint (unclear positioning)')
  console.log('')
  console.log('Expected outcomes:')
  console.log('1. disposition: skeptical_evaluator detected early')
  console.log('2. Mira acknowledges scope limitations honestly')
  console.log('3. Trust repair when Sam reveals existing client status')
  console.log('4. Constraint: STRATEGY')
  console.log('')
  console.log('-'.repeat(70))

  let state = initializeState('Sam')
  const history: Message[] = []
  const samHistory: { role: 'user' | 'assistant'; content: string }[] = []

  const greeting = "Hey Sam! I'm here to help you identify what's really holding your business back. Let's start — tell me about your consulting business. What do you do and who do you serve?"

  history.push({ role: 'assistant', content: greeting, turn: 1, timestamp: new Date() })
  console.log(`\n[Turn 1] MIRA: ${greeting}\n`)

  let turnNumber = 1
  let lastAction = ''
  let constraintDetected = ''
  const debugSnapshots: Array<any> = []
  const MAX_TURNS = 40

  while (turnNumber < MAX_TURNS) {
    turnNumber++

    console.log('[Generating Sam response...]')
    const samResponse = await generateSamResponse(
      history[history.length - 1].content,
      samHistory
    )

    history.push({ role: 'user', content: samResponse, turn: turnNumber, timestamp: new Date() })
    samHistory.push({ role: 'user', content: history[history.length - 2].content })
    samHistory.push({ role: 'assistant', content: samResponse })

    console.log(`[Turn ${turnNumber}] SAM: ${samResponse}\n`)

    try {
      const result = await processConversationTurn(samResponse, history, state)
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
  const isStrategy = constraintDetected === 'strategy'
  console.log(`1. Constraint = STRATEGY: ${isStrategy ? '✅ PASS' : '❌ FAIL (got: ' + constraintDetected + ')'}`)
  const isSkeptical = debugSnapshots.some(s => s.rel_disposition === 'skeptical_evaluator')
  console.log(`2. Disposition detected as skeptical_evaluator: ${isSkeptical ? '✅ PASS' : '❌ FAIL'}`)
  const trustDamaged = debugSnapshots.some(s => s.rel_trust === 'damaged')
  console.log(`3. Trust damage detected: ${trustDamaged ? '✅ PASS' : '⚠️ May not have triggered'}`)

  const transcriptPath = `/tmp/sam-dynamic-${Date.now()}.log`
  const fs = await import('fs')
  const lines: string[] = []
  const snapshotByTurn = new Map(debugSnapshots.map(s => [s.turn, s]))
  for (const m of history) {
    const speaker = m.role === 'assistant' ? 'MIRA' : 'SAM'
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

simulateSamDynamic().catch(console.error)
