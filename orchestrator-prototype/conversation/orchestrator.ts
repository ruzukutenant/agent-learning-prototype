// Main orchestrator - coordinates the entire conversation flow

import Anthropic from '@anthropic-ai/sdk'
import type {
  Message,
  ConversationState,
  OrchestratorResponse,
  OrchestratorDecision
} from '../core/types.js'

import { detectSignals } from '../core/signal-detector.js'
import { inferStateFromConversation } from '../core/state-inference.js'
import { makeDecision, shouldTransitionPhase, getNextPhase } from '../core/decision-engine.js'
import { buildSystemPrompt, loadPromptOverlays } from '../core/prompt-builder.js'
import { computeReadiness } from '../logic/readiness-scoring.js'
import { calculateEmotionalCharge } from '../logic/containment.js'
import { generateClosingMessage, generateContainmentMessage } from '../logic/closing-message.js'
import { BASE_IDENTITY } from '../prompts/base-identity.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CONVERSATION_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 1024

/**
 * Main orchestration function
 * This is the entry point for each conversation turn
 */
export async function processConversationTurn(
  userMessage: string,
  history: Message[],
  currentState: ConversationState
): Promise<OrchestratorResponse> {

  console.log('[Orchestrator] Starting turn', currentState.turns_total + 1)

  // Step 1: Detect signals from user message
  console.log('[Orchestrator] Detecting signals...')
  const signals = await detectSignals(userMessage, history)
  console.log('[Orchestrator] Signals:', {
    clarity: signals.clarity_level,
    confidence: signals.confidence_level,
    overwhelm: signals.overwhelm_detected,
    emotional_markers: signals.emotional_markers.length
  })

  // Step 2: Infer state from conversation
  console.log('[Orchestrator] Inferring state...')
  const inference = await inferStateFromConversation(history, currentState)
  console.log('[Orchestrator] Inference:', {
    hypothesis: inference.constraint_hypothesis.category,
    confidence: inference.constraint_hypothesis.confidence,
    ready: inference.diagnosis_ready.ready,
    validated: inference.hypothesis_validated
  })

  // Step 3: Update conversation state
  const updatedState = updateState(currentState, signals, inference)
  console.log('[Orchestrator] Updated state:', {
    phase: updatedState.phase,
    readiness: updatedState.readiness,
    emotional_charge: updatedState.emotional_charge
  })

  // Step 4: Make decision about next action
  console.log('[Orchestrator] Making decision...')
  const decision = makeDecision(updatedState, signals, inference)
  console.log('[Orchestrator] Decision:', {
    action: decision.action,
    confidence: decision.confidence,
    reasoning: decision.reasoning
  })

  // Step 5: Check if we should auto-diagnose
  if (decision.action === 'diagnose') {
    console.log('[Orchestrator] AUTO-DIAGNOSIS TRIGGERED')

    const constraint = inference.constraint_hypothesis.category!
    const summary = updatedState.constraint_summary ||
                   inference.constraint_hypothesis.evidence.join('; ')

    // Generate closing message (programmatically, not via LLM)
    const closingMessage = generateClosingMessage(
      constraint,
      summary,
      updatedState.user_name
    )

    // Update state to complete
    updatedState.phase = 'complete'
    updatedState.constraint_summary = summary
    updatedState.constraint_hypothesis = constraint

    return {
      advisorResponse: closingMessage,
      state: updatedState,
      decision,
      inference,
      complete: true
    }
  }

  // Step 5b: Check if we should use programmatic containment
  if (decision.action === 'contain') {
    console.log('[Orchestrator] CONTAINMENT TRIGGERED - generating adaptive message')

    // Generate adaptive containment message (programmatically)
    const containmentMessage = generateContainmentMessage(
      signals.emotional_markers,
      signals.capacity_signals,
      inference.constraint_hypothesis.category,
      inference.constraint_hypothesis.confidence
    )

    console.log('[Orchestrator] Containment level:', {
      emotionalMarkers: signals.emotional_markers.length,
      capacitySignals: signals.capacity_signals.length,
      hypothesis: inference.constraint_hypothesis.category
    })

    // Reset containment cooldown
    updatedState.turns_since_containment = 0
    updatedState.last_action = 'contain'

    return {
      advisorResponse: containmentMessage,
      state: updatedState,
      decision,
      inference
    }
  }

  // Step 6: Build dynamic system prompt
  const overlays = loadPromptOverlays()
  const systemPrompt = buildSystemPrompt(updatedState, decision, BASE_IDENTITY, overlays)

  // Step 7: Call LLM for conversational response (NO TOOLS)
  console.log('[Orchestrator] Calling LLM...')

  // Add user message to history
  const conversationHistory = [
    ...history,
    { role: 'user' as const, content: userMessage, turn: updatedState.turns_total, timestamp: new Date() }
  ]

  const response = await anthropic.messages.create({
    model: CONVERSATION_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: conversationHistory.map(m => ({
      role: m.role,
      content: m.content
    })),
    // NO TOOLS - this is the key difference
  })

  // Extract response text
  const advisorText = response.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n')

  console.log('[Orchestrator] LLM response:', advisorText.substring(0, 100) + '...')

  // Step 8: Check if phase should transition
  if (shouldTransitionPhase(updatedState.phase, updatedState, decision)) {
    const nextPhase = getNextPhase(updatedState.phase)
    console.log(`[Orchestrator] Phase transition: ${updatedState.phase} → ${nextPhase}`)
    updatedState.phase = nextPhase as any
    updatedState.turns_in_phase = 0
  }

  return {
    advisorResponse: advisorText,
    state: updatedState,
    decision,
    inference
  }
}

/**
 * Update conversation state based on signals and inference
 */
function updateState(
  currentState: ConversationState,
  signals: any,
  inference: any
): ConversationState {

  // Compute readiness
  const readiness = computeReadiness(signals, inference, currentState)

  // Calculate emotional charge
  const emotionalCharge = calculateEmotionalCharge(signals, currentState.emotional_charge)

  // Update contradiction count
  const contradictionCount = signals.contradiction_detected
    ? currentState.contradiction_count + 1
    : currentState.contradiction_count

  return {
    ...currentState,

    // Update hypothesis tracking
    constraint_hypothesis: inference.constraint_hypothesis.category || currentState.constraint_hypothesis,
    sub_dimension: inference.sub_dimension.dimension || currentState.sub_dimension,
    hypothesis_validated: inference.hypothesis_validated,

    // Update readiness
    readiness,

    // Update emotional state
    emotional_charge: emotionalCharge,
    overwhelm_detected: signals.overwhelm_detected,
    contradiction_count: contradictionCount,

    // Update turn tracking
    turns_total: currentState.turns_total + 1,
    turns_in_phase: currentState.turns_in_phase + 1,
    turns_since_validation: inference.hypothesis_validated
      ? 0
      : currentState.turns_since_validation + 1,
    turns_since_containment: currentState.turns_since_containment + 1,

    // Update complexity (simple heuristic)
    complexity_level: determineComplexity(signals, inference, currentState),

    // Track last action (will be updated if containment/diagnosis triggered)
    last_action: currentState.last_action
  }
}

/**
 * Determine complexity level
 */
function determineComplexity(signals: any, inference: any, state: any): any {
  // Complex if:
  // - Multiple contradictions
  // - Low clarity despite many turns
  // - Multiple emotional markers + capacity issues

  if (state.contradiction_count >= 2) {
    return 'complex'
  }

  if (state.turns_in_phase >= 6 && signals.clarity_level === 'low') {
    return 'complex'
  }

  if (signals.emotional_markers.length >= 2 && signals.capacity_signals.length >= 2) {
    return 'complex'
  }

  if (state.turns_in_phase >= 4) {
    return 'moderate'
  }

  return 'simple'
}

/**
 * Initialize a new conversation state
 */
export function initializeState(userName?: string): ConversationState {
  return {
    phase: 'context',
    constraint_hypothesis: null,
    sub_dimension: null,
    constraint_summary: null,
    hypothesis_validated: false,

    readiness: {
      clarity: 'low',
      confidence: 'low',
      capacity: 'medium'
    },

    emotional_charge: 'neutral',
    overwhelm_detected: false,
    contradiction_count: 0,

    turns_total: 0,
    turns_in_phase: 0,
    turns_since_validation: 0,
    turns_since_containment: 999, // High number = no recent containment

    complexity_level: 'simple',
    cross_map_applied: false,
    last_action: undefined,

    user_name: userName
  }
}
