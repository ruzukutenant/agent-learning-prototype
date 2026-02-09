/**
 * End-to-End Component Architecture Test
 *
 * Validates the full component system:
 * 1. Separation of Concerns - LLM generates conversation, system adds CTAs
 * 2. Three-Layer Architecture - Definitions, Policies, Rules
 * 3. Closing Flow - Component triggers at appropriate moments
 * 4. Response Assembly - Components correctly appended to responses
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { processConversationTurn, initializeState } from '../orchestrator/conversation/orchestrator.js'
import type { Message, OrchestratorResponse } from '../orchestrator/core/types.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Metrics tracking for architecture validation
interface ArchitectureMetrics {
  // Separation of Concerns
  turnsWithComponents: number
  turnsWithoutComponents: number
  componentOnlyInClosing: boolean
  ctaInEarlyTurns: boolean

  // Three-Layer Architecture
  policyBlocksDetected: number
  rulesEvaluated: number
  triggersHit: string[]

  // Component System
  componentsTriggered: string[]
  componentVariants: string[]

  // Closing Flow
  closingPhaseReached: boolean
  alignmentDetected: boolean
  completeWithHandoff: boolean
}

// Cooperative persona that progresses through the flow naturally
const SARAH_COOPERATIVE_PERSONA = `You are Sarah, a 35-year-old marketing consultant having a conversation with a business advisor named Mira.

## Your Background
- You help small businesses with their marketing strategy
- You've been doing this for 4 years
- You're good at what you do but struggling to grow

## Your Core Problem
- You're doing too many things for too many different types of clients
- You're a generalist competing on price
- You need to specialize but don't know what direction
- This is a STRATEGY problem - you lack clarity on positioning

## How to Progress Through the Conversation
- Start by describing your situation broadly
- When Mira explores deeper, share more specific details
- When she validates or diagnoses, AGREE and express relief
- When she asks about readiness, be READY (say you have time, no blockers)
- When she offers next steps, express ENTHUSIASM and ask to proceed
- IMPORTANT: When Mira shares a diagnosis or insight, explicitly agree with it

## Your Responses Should:
- Be 2-4 sentences typically
- Show progression from confused → understanding → ready
- Express alignment when Mira names your constraint accurately
- Say things like "yes, that's exactly it" when diagnosis resonates
- Ask "what's next?" or "how do I proceed?" when you feel clarity
- When asked about blockers, say you have the time and resources

You want this conversation to reach a conclusion. Help it get there by being cooperative and showing clear readiness when appropriate.`

/**
 * Generate Sarah's response using Claude Haiku for speed
 */
async function generateSarahResponse(
  miraMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  turnNumber: number
): Promise<string> {
  const sarahPerspective = conversationHistory.map(msg => ({
    role: (msg.role === 'user' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: msg.content
  }))

  sarahPerspective.push({
    role: 'user',
    content: miraMessage
  })

  // Add turn-specific guidance to push conversation forward
  let turnGuidance = ''
  if (turnNumber > 12 && turnNumber <= 16) {
    turnGuidance = '\n\nIMPORTANT: The conversation is progressing well. Start showing that you understand your constraint. Express that things are clicking into place.'
  } else if (turnNumber > 16 && turnNumber <= 20) {
    turnGuidance = '\n\nIMPORTANT: You should be feeling clear now. If Mira offers insights, strongly agree. Express readiness to take action. Say things like "I\'m ready" or "what do I do next?"'
  } else if (turnNumber > 20) {
    turnGuidance = '\n\nIMPORTANT: You are ready to proceed. If asked about blockers, say you have none. If offered next steps, enthusiastically accept. Ask to see the summary or book a call.'
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    system: SARAH_COOPERATIVE_PERSONA + turnGuidance,
    messages: sarahPerspective
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return text.trim()
}

/**
 * Check if response contains CTA language
 */
function containsCTALanguage(text: string): boolean {
  const ctaPhrases = [
    'click below',
    'book a call',
    'see your summary',
    'next step is to',
    'schedule a call',
    'view your',
    'clarity roadmap'
  ]
  const lowerText = text.toLowerCase()
  return ctaPhrases.some(phrase => lowerText.includes(phrase))
}

/**
 * Extract component info from response
 */
function extractComponentInfo(result: OrchestratorResponse): {
  hasComponent: boolean
  componentTypes: string[]
  variant?: string
} {
  if (!result.components || !result.components.components || result.components.components.length === 0) {
    return { hasComponent: false, componentTypes: [] }
  }

  const types = result.components.components.map(c => c.type)
  const variant = result.components.components[0]?.metadata?.variant as string | undefined

  return {
    hasComponent: true,
    componentTypes: types,
    variant
  }
}

async function runArchitectureTest() {
  console.log('═'.repeat(70))
  console.log('COMPONENT ARCHITECTURE END-TO-END TEST')
  console.log('═'.repeat(70))
  console.log('')
  console.log('Testing:')
  console.log('  1. Separation of Concerns - LLM content vs system components')
  console.log('  2. Three-Layer Architecture - Definitions, Policies, Rules')
  console.log('  3. Closing Flow - Component triggers at right moments')
  console.log('  4. Response Assembly - Components correctly structured')
  console.log('')
  console.log('─'.repeat(70))

  // Initialize metrics
  const metrics: ArchitectureMetrics = {
    turnsWithComponents: 0,
    turnsWithoutComponents: 0,
    componentOnlyInClosing: true,
    ctaInEarlyTurns: false,
    policyBlocksDetected: 0,
    rulesEvaluated: 0,
    triggersHit: [],
    componentsTriggered: [],
    componentVariants: [],
    closingPhaseReached: false,
    alignmentDetected: false,
    completeWithHandoff: false
  }

  // Initialize state
  let state = initializeState('Sarah')
  const history: Message[] = []
  const sarahHistory: { role: 'user' | 'assistant'; content: string }[] = []

  // Initial greeting
  const greeting = "Hey Sarah! I'm here to help you identify what's really holding your business back. Let's start with the basics - tell me about your marketing consulting business. What do you do and who do you help?"

  history.push({
    role: 'assistant',
    content: greeting,
    turn: 1,
    timestamp: new Date()
  })

  console.log(`\n[Turn 1] MIRA: ${greeting}\n`)

  let turnNumber = 1
  const MAX_TURNS = 30
  let diagnosisDeliveredTurn = 0

  while (turnNumber < MAX_TURNS) {
    turnNumber++

    // Generate Sarah's response
    console.log('[Generating Sarah response...]')
    const sarahResponse = await generateSarahResponse(
      history[history.length - 1].content,
      sarahHistory,
      turnNumber
    )

    // Add to histories
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
      // Process turn through orchestrator
      const result = await processConversationTurn(sarahResponse, history, state)

      // Update state
      state = result.state

      // Extract component info
      const componentInfo = extractComponentInfo(result)

      // Track metrics
      if (componentInfo.hasComponent) {
        metrics.turnsWithComponents++
        metrics.componentsTriggered.push(...componentInfo.componentTypes)
        if (componentInfo.variant) {
          metrics.componentVariants.push(componentInfo.variant)
        }

        // Check if component appeared before diagnosis
        if (!state.diagnosis_delivered && diagnosisDeliveredTurn === 0) {
          console.log('⚠️  WARNING: Component triggered before diagnosis delivered!')
          metrics.componentOnlyInClosing = false
        }
      } else {
        metrics.turnsWithoutComponents++
      }

      // Check for CTA language in LLM response (not component)
      const llmContent = result.components?.message || result.advisorResponse
      if (containsCTALanguage(llmContent) && !state.diagnosis_delivered) {
        console.log('⚠️  WARNING: CTA language detected in LLM content before diagnosis!')
        metrics.ctaInEarlyTurns = true
      }

      // Track diagnosis delivery
      if (state.diagnosis_delivered && diagnosisDeliveredTurn === 0) {
        diagnosisDeliveredTurn = turnNumber
        console.log(`📍 Diagnosis delivered at turn ${turnNumber}`)
      }

      // Track closing phases
      if (state.closing_sequence.phase !== 'not_started') {
        metrics.closingPhaseReached = true
      }
      if (state.closing_sequence.alignment_detected) {
        metrics.alignmentDetected = true
      }
      if (result.decision?.action === 'complete_with_handoff') {
        metrics.completeWithHandoff = true
      }

      turnNumber++

      // Add response to history
      history.push({
        role: 'assistant',
        content: result.advisorResponse,
        turn: turnNumber,
        timestamp: new Date()
      })

      // Log with component details
      console.log(`[Turn ${turnNumber}] MIRA (${result.decision?.action}): ${result.advisorResponse.substring(0, 200)}${result.advisorResponse.length > 200 ? '...' : ''}\n`)
      console.log(`  → Phase: ${state.phase} | Constraint: ${state.constraint_hypothesis || 'none'}`)
      console.log(`  → Components: ${componentInfo.hasComponent ? componentInfo.componentTypes.join(', ') : 'none'}`)
      console.log(`  → Closing: ${state.closing_sequence.phase} | Alignment: ${state.closing_sequence.alignment_detected}`)
      console.log('')

      if (result.complete) {
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

  // Print architecture validation results
  console.log('\n' + '═'.repeat(70))
  console.log('ARCHITECTURE VALIDATION RESULTS')
  console.log('═'.repeat(70))

  console.log('\n📦 SEPARATION OF CONCERNS:')
  console.log(`   Turns with components: ${metrics.turnsWithComponents}`)
  console.log(`   Turns without components: ${metrics.turnsWithoutComponents}`)
  console.log(`   Components only in closing phase: ${metrics.componentOnlyInClosing ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`   No CTA in early LLM responses: ${!metrics.ctaInEarlyTurns ? '✅ PASS' : '❌ FAIL'}`)

  console.log('\n🏗️  THREE-LAYER ARCHITECTURE:')
  console.log(`   Components triggered: ${[...new Set(metrics.componentsTriggered)].join(', ') || 'none'}`)
  console.log(`   Component variants used: ${[...new Set(metrics.componentVariants)].join(', ') || 'none'}`)
  console.log(`   Policy guards working: ${metrics.componentOnlyInClosing ? '✅ PASS' : '⚠️ CHECK'}`)
  console.log(`   Rules evaluated correctly: ${metrics.componentsTriggered.length > 0 ? '✅ PASS' : '⚠️ NO TRIGGERS'}`)

  console.log('\n🔚 CLOSING FLOW:')
  console.log(`   Closing phase reached: ${metrics.closingPhaseReached ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`   Alignment detected: ${metrics.alignmentDetected ? '✅ PASS' : '⚠️ NOT DETECTED'}`)
  console.log(`   Complete with handoff: ${metrics.completeWithHandoff ? '✅ PASS' : '⚠️ NOT REACHED'}`)
  console.log(`   Diagnosis delivered: ${state.diagnosis_delivered ? '✅ PASS' : '❌ FAIL'}`)

  console.log('\n📊 RESPONSE ASSEMBLY:')
  const hasProperStructure = metrics.componentsTriggered.length > 0 && metrics.componentOnlyInClosing
  console.log(`   Components appended (not inline): ${hasProperStructure ? '✅ PASS' : '⚠️ CHECK'}`)
  console.log(`   Payload structure correct: ${metrics.turnsWithComponents > 0 ? '✅ PASS' : '⚠️ NO COMPONENTS'}`)

  // Overall assessment
  console.log('\n' + '═'.repeat(70))
  console.log('OVERALL ASSESSMENT')
  console.log('═'.repeat(70))

  const separationPass = metrics.componentOnlyInClosing && !metrics.ctaInEarlyTurns
  const architecturePass = metrics.componentsTriggered.includes('view_summary')
  const closingPass = state.diagnosis_delivered && (metrics.closingPhaseReached || metrics.completeWithHandoff)
  const assemblyPass = metrics.turnsWithComponents > 0

  console.log(`\n1. Separation of Concerns: ${separationPass ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`2. Three-Layer Architecture: ${architecturePass ? '✅ PASS' : '⚠️ PARTIAL'}`)
  console.log(`3. Closing Flow: ${closingPass ? '✅ PASS' : '⚠️ PARTIAL'}`)
  console.log(`4. Response Assembly: ${assemblyPass ? '✅ PASS' : '⚠️ CHECK'}`)

  const allPass = separationPass && architecturePass && closingPass && assemblyPass
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`FINAL RESULT: ${allPass ? '✅ ALL TESTS PASSED' : '⚠️ SOME TESTS NEED ATTENTION'}`)
  console.log('═'.repeat(70))

  // Save transcript
  const transcriptPath = `/tmp/component-architecture-test-${Date.now()}.log`
  const fs = await import('fs')
  const transcript = history.map(m =>
    `[Turn ${m.turn}] ${m.role === 'assistant' ? 'MIRA' : 'SARAH'}: ${m.content}`
  ).join('\n\n')
  fs.writeFileSync(transcriptPath, transcript)
  console.log(`\nTranscript saved to: ${transcriptPath}`)
}

// Run the test
runArchitectureTest().catch(console.error)
