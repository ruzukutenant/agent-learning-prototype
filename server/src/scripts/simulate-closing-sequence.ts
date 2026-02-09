/**
 * Closing Sequence Simulation - Testing Multi-Turn Close
 *
 * Tests Danny's 5-turn closing model:
 * - Turn A: Reflect diagnosis with implication
 * - Turn B: Reflect stakes as lived reality
 * - Turn C: Name capability gap (mechanical, not motivational)
 * - Turn D: Assert helpfulness + check alignment
 * - Turn E: Facilitate as continuation
 *
 * Quality Bar Tests:
 * 1. If booking link removed, would conversation still point toward human help?
 * 2. If user says "not right now," does it feel like deferral, not rejection?
 * 3. Does user feel mid-arc (not finished)?
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { processConversationTurn, initializeState } from '../orchestrator/conversation/orchestrator.js'
import type { Message, ClosingPhase } from '../orchestrator/core/types.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Sarah - a strategy constraint persona who will cooperate through to closing
const SARAH_PERSONA = `You are Sarah, a 38-year-old marketing consultant having a conversation with a business advisor named Mira.

## Your Background
- 10 years at big agencies, went solo 3 years ago
- You're good at your craft - clients get results
- Making decent money ($12k/month) but feel stuck

## Your Core Problem (STRATEGY - positioning/clarity)
- You take on "anyone who will pay" - no real niche
- Your services are all over: social media, content, email, branding
- You can't articulate what makes you different
- Every proposal is custom, you're constantly reinventing
- You look at competitors and can't explain why clients should choose you

## How You Talk
- Thoughtful and reflective - you process out loud
- Willing to go deep when asked
- You're introspective but not overly emotional
- You appreciate insight and will acknowledge when something lands
- You're cooperative - you want to figure this out

## During the Closing Sequence (when Mira starts summarizing/recommending)
- You're receptive but want to understand the path forward
- You agree that you need help with positioning
- When Mira asserts what would be helpful, you should AGREE (to test alignment detection)
- You're ready to take action - "that makes sense" / "I see what you mean"
- Express genuine interest in working with someone on this

Keep responses conversational (2-4 sentences). Be cooperative and ready to move forward.`

// Alternative: Sarah who expresses hesitation
const SARAH_HESITANT_PERSONA = `You are Sarah, a 38-year-old marketing consultant having a conversation with a business advisor named Mira.

## Your Background
- 10 years at big agencies, went solo 3 years ago
- You're good at your craft - clients get results
- Making decent money ($12k/month) but feel stuck

## Your Core Problem (STRATEGY - positioning/clarity)
- You take on "anyone who will pay" - no real niche
- Your services are all over: social media, content, email, branding
- You can't articulate what makes you different
- Every proposal is custom, you're constantly reinventing

## How You Talk
- Thoughtful and reflective
- Cooperative during discovery
- But hesitant about next steps

## During the Closing Sequence
- When Mira reflects your stakes, agree but show uncertainty
- When Mira names what's missing, say something like "I get that, but..."
- When Mira asserts what would be helpful, express hesitation:
  - "That makes sense but I'm not sure I'm ready"
  - "I need to think about it"
  - "What would that even look like?"
- This tests how the system handles non-alignment

Keep responses conversational (2-4 sentences). Be cooperative in discovery, hesitant in closing.`

async function generateSarahResponse(
  miraMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  persona: string
): Promise<string> {
  const sarahPerspective = conversationHistory.map(msg => ({
    role: (msg.role === 'user' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: msg.content
  }))

  sarahPerspective.push({
    role: 'user',
    content: miraMessage
  })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 300,
    system: persona,
    messages: sarahPerspective
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return text.trim()
}

interface ClosingMetrics {
  entered_closing: boolean
  phases_hit: ClosingPhase[]
  alignment_detected_at_phase: ClosingPhase | null
  hesitation_detected_at_phase: ClosingPhase | null
  completed_full_sequence: boolean
  turns_in_closing: number
  synthesis_built: boolean
}

async function simulateClosingSequence(variant: 'cooperative' | 'hesitant' = 'cooperative') {
  const persona = variant === 'cooperative' ? SARAH_PERSONA : SARAH_HESITANT_PERSONA

  console.log('='.repeat(70))
  console.log(`CLOSING SEQUENCE SIMULATION - ${variant.toUpperCase()} VARIANT`)
  console.log('='.repeat(70))
  console.log('')
  console.log('Testing Danny\'s 5-turn closing model:')
  console.log('  Turn A: closing_reflect_implication')
  console.log('  Turn B: closing_reflect_stakes')
  console.log('  Turn C: closing_name_capability_gap')
  console.log('  Turn D: closing_assert_and_align')
  console.log('  Turn E: closing_facilitate')
  console.log('')
  console.log('Quality Bar Tests:')
  console.log('  1. Points toward human help (not just booking)?')
  console.log('  2. Handles hesitation gracefully?')
  console.log('  3. User feels mid-arc (not finished)?')
  console.log('')
  console.log('-'.repeat(70))

  let state = initializeState('Sarah')
  const history: Message[] = []
  const sarahHistory: { role: 'user' | 'assistant'; content: string }[] = []

  const metrics: ClosingMetrics = {
    entered_closing: false,
    phases_hit: [],
    alignment_detected_at_phase: null,
    hesitation_detected_at_phase: null,
    completed_full_sequence: false,
    turns_in_closing: 0,
    synthesis_built: false
  }

  // Start conversation
  const greeting = "Hey Sarah! I'm here to help you identify what's really holding your business back. Tell me about your consulting business - what do you do and who do you help?"

  history.push({
    role: 'assistant',
    content: greeting,
    turn: 1,
    timestamp: new Date()
  })

  console.log(`\n[Turn 1] MIRA: ${greeting}\n`)

  let turnNumber = 1
  const MAX_TURNS = 50

  while (turnNumber < MAX_TURNS) {
    turnNumber++

    // Generate Sarah's response
    console.log('[Generating Sarah response...]')
    const sarahResponse = await generateSarahResponse(
      history[history.length - 1].content,
      sarahHistory,
      persona
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
      const action = result.decision?.action || 'unknown'

      turnNumber++

      // Track closing sequence metrics
      const closingPhase = state.closing_sequence?.phase
      if (closingPhase && closingPhase !== 'not_started') {
        if (!metrics.entered_closing) {
          metrics.entered_closing = true
          console.log('\n🚀 ENTERED CLOSING SEQUENCE\n')
        }

        if (!metrics.phases_hit.includes(closingPhase)) {
          metrics.phases_hit.push(closingPhase)
          console.log(`📍 New closing phase: ${closingPhase}`)
        }

        metrics.turns_in_closing = state.closing_sequence?.turns_in_closing || 0
        metrics.synthesis_built = !!state.closing_sequence?.synthesis

        if (state.closing_sequence?.alignment_detected && !metrics.alignment_detected_at_phase) {
          metrics.alignment_detected_at_phase = closingPhase
          console.log(`✅ Alignment detected at phase: ${closingPhase}`)
        }

        if (state.closing_sequence?.user_hesitation_expressed && !metrics.hesitation_detected_at_phase) {
          metrics.hesitation_detected_at_phase = closingPhase
          console.log(`⚠️ Hesitation detected at phase: ${closingPhase}`)
        }
      }

      history.push({
        role: 'assistant',
        content: result.advisorResponse,
        turn: turnNumber,
        timestamp: new Date()
      })

      // Log with closing-specific info
      console.log(`[Turn ${turnNumber}] MIRA (${action}): ${result.advisorResponse}\n`)
      console.log(`  → Phase: ${state.phase} | Constraint: ${state.constraint_hypothesis || 'none'}`)
      console.log(`  → Closing: ${closingPhase || 'not_started'} | Turns in closing: ${state.closing_sequence?.turns_in_closing || 0}`)
      console.log(`  → Alignment: ${state.closing_sequence?.alignment_detected || false} | Hesitation: ${state.closing_sequence?.user_hesitation_expressed || false}`)
      console.log('')

      if (result.complete) {
        if (closingPhase === 'facilitate') {
          metrics.completed_full_sequence = true
        }
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

  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('CLOSING SEQUENCE METRICS')
  console.log('='.repeat(70))
  console.log(`Entered closing sequence: ${metrics.entered_closing ? '✅' : '❌'}`)
  console.log(`Phases hit: ${metrics.phases_hit.length > 0 ? metrics.phases_hit.join(' → ') : 'none'}`)
  console.log(`Synthesis built: ${metrics.synthesis_built ? '✅' : '❌'}`)
  console.log(`Turns in closing: ${metrics.turns_in_closing}`)
  console.log(`Alignment detected: ${metrics.alignment_detected_at_phase ? `✅ at ${metrics.alignment_detected_at_phase}` : '❌'}`)
  console.log(`Hesitation detected: ${metrics.hesitation_detected_at_phase ? `⚠️ at ${metrics.hesitation_detected_at_phase}` : 'none'}`)
  console.log(`Completed full sequence: ${metrics.completed_full_sequence ? '✅' : '❌'}`)

  // Quality bar evaluation
  console.log('\n' + '='.repeat(70))
  console.log('QUALITY BAR EVALUATION')
  console.log('='.repeat(70))

  // Analyze the closing turns for quality
  const closingTurns = history
    .filter(m => m.role === 'assistant' && m.turn && m.turn > history.length - 12)
    .map(m => m.content)

  const closingText = closingTurns.join(' ')

  // Test 1: Points toward human help?
  const mentionsHumanHelp = /specialist|expert|support|someone who|work with|help from/i.test(closingText)
  const notJustBooking = !/click here|book now|sign up/i.test(closingText) || mentionsHumanHelp
  console.log(`1. Points toward human help (not just booking): ${mentionsHumanHelp && notJustBooking ? '✅ PASS' : '⚠️ CHECK'}`)

  // Test 2: Handles hesitation gracefully (if applicable)
  if (variant === 'hesitant') {
    const gracefulHesitation = metrics.hesitation_detected_at_phase !== null
    console.log(`2. Detected and handled hesitation: ${gracefulHesitation ? '✅ PASS' : '❌ FAIL'}`)
  } else {
    console.log(`2. Detected alignment: ${metrics.alignment_detected_at_phase ? '✅ PASS' : '⚠️ CHECK'}`)
  }

  // Test 3: User feels mid-arc?
  const mentionsContinuation = /continuation|next step|move forward|path forward/i.test(closingText)
  const notFinished = !/all done|complete|finished|that's it/i.test(closingText)
  console.log(`3. Conversation feels like continuation: ${mentionsContinuation && notFinished ? '✅ PASS' : '⚠️ CHECK'}`)

  // Test 4: 5-turn sequence executed?
  const expectedPhases: ClosingPhase[] = ['reflect_implication', 'reflect_stakes', 'name_capability_gap', 'assert_and_align', 'facilitate']
  const phasesComplete = expectedPhases.every(p => metrics.phases_hit.includes(p))
  console.log(`4. All 5 closing phases executed: ${phasesComplete ? '✅ PASS' : `❌ FAIL (got: ${metrics.phases_hit.join(', ')})`}`)

  // Test 5: Capability gap framed mechanically?
  const mechanicalLanguage = /structure|system|lens|framework|perspective|process/i.test(closingText)
  const notMotivational = !/motivation|discipline|harder|try more|willpower/i.test(closingText)
  console.log(`5. Capability gap framed mechanically: ${mechanicalLanguage && notMotivational ? '✅ PASS' : '⚠️ CHECK'}`)

  // Save transcript
  const transcriptPath = `/tmp/closing-${variant}-${Date.now()}.log`
  const fs = await import('fs')

  let transcript = `CLOSING SEQUENCE SIMULATION - ${variant.toUpperCase()}\n`
  transcript += `Generated: ${new Date().toISOString()}\n`
  transcript += '='.repeat(70) + '\n\n'

  transcript += 'METRICS:\n'
  transcript += `- Phases hit: ${metrics.phases_hit.join(' → ')}\n`
  transcript += `- Alignment detected: ${metrics.alignment_detected_at_phase || 'no'}\n`
  transcript += `- Hesitation detected: ${metrics.hesitation_detected_at_phase || 'no'}\n`
  transcript += `- Full sequence: ${metrics.completed_full_sequence}\n\n`

  transcript += '='.repeat(70) + '\n'
  transcript += 'TRANSCRIPT:\n'
  transcript += '='.repeat(70) + '\n\n'

  transcript += history.map(m =>
    `[Turn ${m.turn}] ${m.role === 'assistant' ? 'MIRA' : 'SARAH'}: ${m.content}`
  ).join('\n\n')

  fs.writeFileSync(transcriptPath, transcript)
  console.log(`\nTranscript saved to: ${transcriptPath}`)

  return { metrics, history }
}

// Run the simulation
const variant = process.argv[2] as 'cooperative' | 'hesitant' | undefined
simulateClosingSequence(variant || 'cooperative').catch(console.error)
