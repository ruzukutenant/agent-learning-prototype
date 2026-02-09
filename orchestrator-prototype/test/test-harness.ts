// Test harness - simulate full conversation with persona

import type { Message, ConversationState, OrchestratorResponse } from '../core/types.js'
import { processConversationTurn, initializeState } from '../conversation/orchestrator.js'
import { ALEX_PERSONA, ALEX_NAME, EXPECTED_DIAGNOSIS as ALEX_EXPECTED } from './personas/systemic-coach.js'

interface PersonaConfig {
  name: string
  persona: any[]
  expected: any
}

interface TestResult {
  success: boolean
  turns: TurnResult[]
  finalState: ConversationState
  diagnosis: {
    matched: boolean
    expected: string
    actual: string | null
  }
  endpoint: {
    matched: boolean
    expected: string
    actual: string
  }
}

interface TurnResult {
  turn: number
  userMessage: string
  advisorResponse: string
  decision: string
  signals: any
  inference: any
  state: ConversationState
  notes: string
}

/**
 * Run full conversation simulation with specified persona
 */
export async function runPersonaTest(config?: PersonaConfig): Promise<TestResult> {
  // Default to Alex if no config provided
  const persona = config?.persona || ALEX_PERSONA
  const name = config?.name || ALEX_NAME
  const expected = config?.expected || ALEX_EXPECTED

  console.log('='.repeat(80))
  console.log('ORCHESTRATION PROTOTYPE TEST')
  console.log(`Persona: ${name}`)
  console.log('='.repeat(80))
  console.log()

  // Initialize state
  let state = initializeState(name)
  const history: Message[] = []
  const turnResults: TurnResult[] = []

  // Opening greeting
  console.log(`[Turn 0] ADVISOR: "Hey ${name}! I'm here to help you identify what's really holding your business back. Let's start: Tell me about your coaching or consulting business—what do you do and who do you serve?"`)
  console.log()

  // Simulate each turn
  for (const personaTurn of persona) {
    console.log('-'.repeat(80))
    console.log(`[Turn ${personaTurn.turn}] USER: "${personaTurn.userResponse}"`)
    console.log()

    try {
      // Process turn through orchestrator
      const result = await processConversationTurn(
        personaTurn.userResponse,
        history,
        state
      )

      // Log orchestrator decision
      console.log(`[Orchestrator] Decision: ${result.decision.action.toUpperCase()}`)
      console.log(`[Orchestrator] Reasoning: ${result.decision.reasoning}`)
      console.log()

      // Log advisor response
      console.log(`[Turn ${personaTurn.turn}] ADVISOR: "${result.advisorResponse}"`)
      console.log()

      // Log diagnostics
      if (result.inference) {
        console.log(`[Diagnostics]`)
        console.log(`  Hypothesis: ${result.inference.constraint_hypothesis.category || 'none'} (confidence: ${result.inference.constraint_hypothesis.confidence})`)
        console.log(`  Readiness: clarity=${result.state.readiness.clarity}, confidence=${result.state.readiness.confidence}, capacity=${result.state.readiness.capacity}`)
        console.log(`  Emotional Charge: ${result.state.emotional_charge}`)
        console.log(`  Phase: ${result.state.phase}`)
        console.log()
      }

      // Update history
      history.push({
        role: 'user',
        content: personaTurn.userResponse,
        turn: personaTurn.turn,
        timestamp: new Date()
      })

      history.push({
        role: 'assistant',
        content: result.advisorResponse,
        turn: personaTurn.turn,
        timestamp: new Date()
      })

      // Store result
      turnResults.push({
        turn: personaTurn.turn,
        userMessage: personaTurn.userResponse,
        advisorResponse: result.advisorResponse,
        decision: result.decision.action,
        signals: result.inference ? {
          clarity: result.state.readiness.clarity,
          confidence: result.state.readiness.confidence,
          overwhelm: result.state.overwhelm_detected
        } : null,
        inference: result.inference,
        state: result.state,
        notes: personaTurn.notes
      })

      // Update state
      state = result.state

      // Check if complete
      if (result.complete) {
        console.log('='.repeat(80))
        console.log('CONVERSATION COMPLETE')
        console.log('='.repeat(80))
        break
      }

    } catch (error) {
      console.error(`[ERROR] Turn ${personaTurn.turn} failed:`, error)
      throw error
    }
  }

  // Validate results
  const diagnosisMatched = state.constraint_hypothesis === expected.constraint
  const endpointMatched = determineEndpoint(state) === expected.recommended_endpoint

  console.log()
  console.log('='.repeat(80))
  console.log('TEST RESULTS')
  console.log('='.repeat(80))
  console.log()
  console.log(`Diagnosis:`)
  console.log(`  Expected: ${expected.constraint}`)
  console.log(`  Actual: ${state.constraint_hypothesis}`)
  console.log(`  Match: ${diagnosisMatched ? '✅ YES' : '❌ NO'}`)
  console.log()
  console.log(`Endpoint Recommendation:`)
  console.log(`  Expected: ${expected.recommended_endpoint}`)
  console.log(`  Actual: ${determineEndpoint(state)}`)
  console.log(`  Match: ${endpointMatched ? '✅ YES' : '❌ NO'}`)
  console.log()
  console.log(`Final Readiness:`)
  console.log(`  Clarity: ${state.readiness.clarity} (expected: ${expected.readiness.clarity})`)
  console.log(`  Confidence: ${state.readiness.confidence} (expected: ${expected.readiness.confidence})`)
  console.log(`  Capacity: ${state.readiness.capacity} (expected: ${expected.readiness.capacity})`)
  console.log()

  return {
    success: diagnosisMatched && endpointMatched,
    turns: turnResults,
    finalState: state,
    diagnosis: {
      matched: diagnosisMatched,
      expected: expected.constraint,
      actual: state.constraint_hypothesis
    },
    endpoint: {
      matched: endpointMatched,
      expected: expected.recommended_endpoint,
      actual: determineEndpoint(state)
    }
  }
}

/**
 * Determine endpoint from readiness scores
 */
function determineEndpoint(state: ConversationState): string {
  const { clarity, confidence, capacity } = state.readiness

  // EC: High clarity + High confidence + Medium/High capacity
  if (clarity === 'high' && confidence === 'high' && capacity !== 'low') {
    return 'EC'
  }

  // MIST: High clarity + Low capacity
  if (clarity === 'high' && capacity === 'low') {
    return 'MIST'
  }

  // NURTURE: Low clarity or confidence
  return 'NURTURE'
}
