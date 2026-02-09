/**
 * Dynamic Gloria Simulation - LLM-generated responses
 *
 * Tests how Mira handles a depleted, exhausted user with real caregiving
 * constraints and limited financial resources. Gloria is based on patterns
 * seen in real user sessions (like Mary's).
 *
 * Key things to evaluate:
 * 1. Does Mira validate Gloria's progress instead of questioning it?
 * 2. Does Mira avoid looping on "you need help you can't afford"?
 * 3. Does Mira help Gloria find small, concrete next steps?
 * 4. Does Gloria leave feeling BETTER, not worse?
 * 5. Is the constraint detected as EXECUTION (not psychology)?
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { processConversationTurn, initializeState } from '../orchestrator/conversation/orchestrator.js'
import type { Message } from '../orchestrator/core/types.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const GLORIA_PERSONA = `You are Gloria, a 56-year-old wellness coach having a conversation with a business advisor named Mira.

## Your Background
- Former occupational therapist for 20 years in the NHS (UK healthcare system)
- Started your own wellness coaching practice 2 years ago
- You specialize in helping women over 50 with burnout recovery and energy management
- You're warm, thoughtful, and genuinely good at what you do
- You have a coaching certification and ongoing professional development

## Your Current Business Situation
- You have 3-4 active one-on-one clients at any time
- Revenue: roughly £1,500-2,000/month — enough to cover some costs but not a living wage
- Clients come from word of mouth and a small Facebook group you run (200 members)
- You charge £150/month per client for weekly sessions
- You've designed a 6-week group programme but haven't launched it yet
- You have a basic website and post on social media when you can

## Your Life Situation (reveal gradually)
- You work part-time (3 days/week) as an occupational therapist — it's stable income but mentally draining
- Your husband had a stroke 18 months ago. He's recovered well but still needs daily support — you help with physio exercises, appointments, meal prep. It's not crisis-level anymore but it's constant and tiring.
- Your mum is 82 and starting to need more help — she lives 45 minutes away and you visit twice a week
- You're genuinely exhausted most of the time. Not depressed — just physically and mentally depleted from juggling everything.
- You don't have spare money to invest in your business. Your OT salary covers the household; coaching income is modest.

## Your Core Situation
- You KNOW what to do — launch the group programme, grow your Facebook group, maybe start a newsletter
- You've been making slow but steady progress — the programme is designed, you've been posting more regularly lately
- The issue is CAPACITY — you're doing everything yourself on very limited energy
- You don't need strategy help. You don't have imposter syndrome. You're just really, really tired.
- You're not looking for a big transformation — you just want to keep moving forward without burning out

## How You Talk
- Warm, reflective, honest. British sensibility — understated, not dramatic
- Self-aware but not self-critical. You know your situation is hard and you're doing your best
- Practical — you think in terms of what's realistic, not what's ideal
- You'll push back gently if someone suggests something unrealistic
- You appreciate being heard more than being advised

## Your Emotional State
- Tired but not hopeless. You believe in your business, you just wish you had more energy for it
- A bit frustrated that progress is so slow, but you understand why
- You get defensive if someone implies you're not trying hard enough or are "avoiding" something
- You feel WORSE if someone keeps pointing out problems you can't solve (like "you need to hire help" when you can't afford it)
- You feel BETTER when someone acknowledges what you're already doing and helps you see a manageable next step

## Important: How to Respond
- Answer naturally to what Mira actually asks — don't info-dump
- Reveal the caregiving and energy constraints gradually, not all at once
- If Mira asks what's holding you back, lead with capacity/energy, not fear or strategy
- If Mira suggests investing in help, be honest: "I don't have the money for that right now"
- If Mira keeps pushing on something you've already said you can't do, show mild frustration
- If Mira validates your progress, respond warmly — that's what you need to hear
- If Mira helps you see a small concrete step, engage enthusiastically
- Keep responses conversational (2-4 sentences typically)

## CRITICAL: This is a CHAT INTERFACE
- You are chatting with Mira in a web chat interface
- When Mira offers help or next steps, respond appropriately for a chat
- DO NOT give out your phone number or email
- DO NOT say "text me" or "call me" or "email me"

## CRITICAL: Response Format
- You are typing in a chat interface, NOT acting in a play
- NEVER use theatrical stage directions like *nods*, *sighs*, *leans forward*, *pauses*, etc.
- NEVER describe your physical actions or expressions
- Just write what you would actually type in a chat message
- Be natural and conversational, but text-only

You are having a real conversation. Respond to what Mira actually says, not what you assume she'll say.`

/**
 * Generate Gloria's response using Claude
 */
async function generateGloriaResponse(
  miraMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {

  const gloriaPerspective = conversationHistory.map(msg => ({
    role: (msg.role === 'user' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: msg.content
  }))

  gloriaPerspective.push({
    role: 'user',
    content: miraMessage
  })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 300,
    system: GLORIA_PERSONA,
    messages: gloriaPerspective
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return text.trim()
}

async function simulateGloriaDynamic() {
  console.log('='.repeat(70))
  console.log('GLORIA DYNAMIC SIMULATION - Depleted/Exhausted User')
  console.log('='.repeat(70))
  console.log('')
  console.log('Testing how Mira handles a depleted user with real constraints.')
  console.log('Gloria is played by Claude Sonnet with a rich persona.')
  console.log('')
  console.log('Expected outcomes:')
  console.log('1. Constraint should be EXECUTION (capacity, not psychology)')
  console.log('2. Mira should validate progress, not question it')
  console.log('3. Mira should NOT loop on "you need help you can\'t afford"')
  console.log('4. Mira should help find small, concrete next steps')
  console.log('5. Gloria should NOT feel worse at the end')
  console.log('')
  console.log('-'.repeat(70))

  let state = initializeState('Gloria')
  const history: Message[] = []
  const gloriaHistory: { role: 'user' | 'assistant'; content: string }[] = []

  const greeting = "Hey Gloria! I'm here to help you identify what's really holding your business back. Let's start: Tell me about your coaching or consulting business—what do you do and who do you serve?"

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

  const MAX_TURNS = 40

  while (turnNumber < MAX_TURNS) {
    turnNumber++

    console.log('[Generating Gloria response...]')
    const gloriaResponse = await generateGloriaResponse(
      history[history.length - 1].content,
      gloriaHistory
    )

    history.push({
      role: 'user',
      content: gloriaResponse,
      turn: turnNumber,
      timestamp: new Date()
    })
    gloriaHistory.push({ role: 'user', content: history[history.length - 2].content })
    gloriaHistory.push({ role: 'assistant', content: gloriaResponse })

    console.log(`[Turn ${turnNumber}] GLORIA: ${gloriaResponse}\n`)

    try {
      const result = await processConversationTurn(gloriaResponse, history, state)

      state = result.state
      lastAction = result.decision?.action || 'unknown'

      if (state.constraint_hypothesis) {
        constraintDetected = state.constraint_hypothesis
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
      console.log(`  → Readiness: clarity=${state.readiness?.clarity}, confidence=${state.readiness?.confidence}, capacity=${state.readiness?.capacity}`)
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
    console.log('\n⚠️  Max turns reached (40)')
  }

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

  console.log('EVALUATION:')

  const isExecution = constraintDetected === 'execution'
  console.log(`1. Constraint = EXECUTION: ${isExecution ? '✅ PASS' : '❌ FAIL (got: ' + constraintDetected + ')'}`)

  const diagnosisDelivered = state.diagnosis_delivered
  console.log(`2. Diagnosis delivered: ${diagnosisDelivered ? '✅ PASS' : '❌ FAIL'}`)

  const naturalFlow = turnNumber >= 15 && turnNumber <= 35
  console.log(`3. Natural conversation length (15-35 turns): ${naturalFlow ? '✅ PASS' : '⚠️ ' + turnNumber + ' turns'}`)

  const reachedCompletion = state.phase === 'complete' || state.phase === 'diagnosis'
  console.log(`4. Reached completion: ${reachedCompletion ? '✅ PASS' : '⚠️ PARTIAL (phase: ' + state.phase + ')'}`)

  // Save transcript
  const transcriptPath = `/tmp/gloria-dynamic-${Date.now()}.log`
  const fs = await import('fs')
  const transcript = history.map(m =>
    `[Turn ${m.turn}] ${m.role === 'assistant' ? 'MIRA' : 'GLORIA'}: ${m.content}`
  ).join('\n\n')
  fs.writeFileSync(transcriptPath, transcript)
  console.log(`\nTranscript saved to: ${transcriptPath}`)
}

simulateGloriaDynamic().catch(console.error)
