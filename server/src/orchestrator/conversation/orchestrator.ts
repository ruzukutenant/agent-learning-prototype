// Main orchestrator - coordinates the entire conversation flow
// ARCHITECTURE: Uses unified analysis for consolidated LLM-based signal detection

import Anthropic from '@anthropic-ai/sdk'
import type {
  Message,
  MessageAttachment,
  ConversationState,
  OrchestratorResponse,
  OrchestratorDecision,
  UnifiedAnalysis,
  EffectiveState
} from '../core/types.js'

import { runUnifiedAnalysis, resolveEffectiveState, updateStickyHypothesis } from '../core/unified-analysis.js'
import { makeDecision, shouldTransitionPhase, getNextPhase } from '../core/decision-engine.js'
import { buildSystemPrompt, loadPromptOverlays } from '../core/prompt-builder.js'
import { buildClosingSynthesis, formatSynthesisForPrompt } from '../core/closing-synthesis.js'
import type { ClosingPhase } from '../core/types.js'
import { BASE_IDENTITY } from '../prompts/base-identity.js'
import { calculateExpertiseLevel } from '../logic/recursive-prompting.js'
import { generateConstraintSummary, getDefaultSummary } from '../core/constraint-summarizer.js'
import { initializeVarietyTracker, recordReflection, recordUsedPatterns } from '../core/response-variety.js'
import { initializeConversationMemory, updateConversationMemory } from '../core/conversation-memory.js'
import { validateResponse } from '../core/response-validator.js'
import { getClosingFallback, CRITICAL_CLOSING_ACTIONS } from '../core/closing-fallbacks.js'
import { assembleResponse, assembleSimpleResponse } from '../components/index.js'
import type { AssembledResponse, ComponentTrigger } from '../components/types.js'
import { formatInsight } from '../../services/transcription-cleanup.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CONVERSATION_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 1024

/**
 * Check if a phrase is a quality insight vs just a short acknowledgment or contextless fragment
 *
 * Quality insights should:
 * 1. Be long enough to contain substance (≥5 words, ≥30 chars)
 * 2. Make sense when read standalone on the summary page
 * 3. Not be generic acknowledgments or filler
 * 4. Not reference external context without containing the actual insight
 */
function isQualityInsight(phrase: string): boolean {
  const cleaned = phrase.trim().toLowerCase()
  const wordCount = cleaned.split(/\s+/).length

  // 1. Length requirements - must have substance
  if (wordCount < 5 || phrase.length < 30) {
    return false
  }

  // 2. Exclude common acknowledgment patterns
  const acknowledgmentPatterns = [
    /^(yes|yeah|yep|right|okay|ok|sure|got it|i see|i understand|makes sense|that makes sense|exactly|definitely|absolutely|totally|true|correct)\.?$/i,
    /^(yes|yeah|yep|right|okay|ok),?\s+(it does|that's right|exactly|i see)\.?$/i,
    /^(i|it)\s+(is|does|do|did|was|can|could|would|will)\.?$/i,
  ]

  for (const pattern of acknowledgmentPatterns) {
    if (pattern.test(cleaned)) {
      return false
    }
  }

  // 3. Exclude phrases that START with context-dependent references
  // These reference something external and don't make sense standalone
  const contextDependentStarters = [
    /^(that|it|this)\s+(is|was|does|did|would|could|might|seems?|sounds?|makes?)/i,
    /^(that's|it's|this is)\s+(a good|true|right|interesting|helpful)/i,
    /^i (guess|suppose|think)\s+(it|that|so|maybe)/i,
    /^(it|that)\s+(didn't|doesn't|hadn't|hasn't|won't|wouldn't)/i,
    /^i\s+(haven't|hadn't|didn't|don't)\s+(thought|considered|realized)/i,
    /^(maybe|perhaps|probably)\s+(i|it|that)/i,
  ]

  for (const pattern of contextDependentStarters) {
    if (pattern.test(cleaned)) {
      return false
    }
  }

  // 4. Exclude filler phrases that lack substance even when long
  const fillerPatterns = [
    /^i (mean|guess),?\s/i,
    /^(kind of|sort of|you know)/i,
    /^(well|so|um|uh),?\s/i,
    /^(yeah|yes),?\s+(no|i know|exactly|totally)/i,
  ]

  for (const pattern of fillerPatterns) {
    if (pattern.test(cleaned)) {
      return false
    }
  }

  // 5. Require actual substance - must contain a verb that indicates self-discovery
  // or a clear statement (not just "I've been doing X" without the insight)
  const hasInsightIndicator = /\b(realize|realized|noticed|see now|understand now|the (real|actual|main) (issue|problem|constraint|challenge)|i('ve| have) been\s+\w+ing.*(but|and|which|that|because)|my (real|actual|main)|what's (actually|really) (holding|stopping|blocking))/i.test(cleaned)

  // If the phrase has clear insight indicators, it's likely quality
  if (hasInsightIndicator) {
    return true
  }

  // 6. For phrases without explicit indicators, check they're self-contained
  // Reject if they start with pronouns referring to external context
  if (/^(it|that|this)\s/i.test(cleaned)) {
    return false
  }

  // Accept if it starts with "I" followed by a meaningful statement
  // (not just "I" + short phrase)
  if (/^i('m| am| have| need| want| think| believe| feel| know| realize| see| understand|'ve)/i.test(cleaned) && wordCount >= 6) {
    return true
  }

  // Default: require more words for generic statements to ensure substance
  return wordCount >= 8
}

/**
 * Helper function to generate LLM response
 * Extracted for reuse in regeneration flow
 *
 * Temperature guide:
 * - 0.75: Default for conversational responses (balanced creativity/consistency)
 * - 0.5: For regeneration attempts (more deterministic for corrections)
 */
async function generateLLMResponse(
  systemPrompt: string,
  conversationHistory: Message[],
  options: { temperature?: number; attachments?: MessageAttachment[] } = {}
): Promise<string> {
  const { temperature = 0.75, attachments } = options  // Default 0.75 instead of SDK default 1.0

  // Build messages, handling attachments for the last user message
  const messages = conversationHistory.map((m, index) => {
    const isLastUserMessage = m.role === 'user' && index === conversationHistory.length - 1

    // If this is the last user message and we have attachments, use content array format
    if (isLastUserMessage && attachments && attachments.length > 0) {
      const content: Anthropic.MessageParam['content'] = []

      // Add image attachments first
      for (const att of attachments) {
        if (att.type === 'image') {
          content.push({
            type: 'image',
            source: {
              type: 'url',
              url: att.url
            }
          })
          console.log(`[Orchestrator] Including image attachment: ${att.name}`)
        } else if (att.type === 'pdf') {
          // For PDFs, add a note about the attachment in the text
          // Full PDF processing would require fetching and converting
          content.push({
            type: 'text',
            text: `[User attached PDF: ${att.name}]`
          })
          console.log(`[Orchestrator] PDF attachment noted: ${att.name} (full processing not yet implemented)`)
        }
      }

      // Add the user's text message
      content.push({
        type: 'text',
        text: m.content
      })

      return { role: m.role, content }
    }

    // Regular message without attachments
    return {
      role: m.role,
      content: m.content
    }
  })

  const response = await anthropic.messages.create({
    model: CONVERSATION_MODEL,
    max_tokens: MAX_TOKENS,
    temperature,
    system: systemPrompt,
    messages: messages as Anthropic.MessageParam[],
  })

  // Extract response text
  const text = response.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n')

  console.log('[Orchestrator] LLM response:', text.substring(0, 100) + '...')
  return text
}

/**
 * Main orchestration function
 * This is the entry point for each conversation turn
 */
export async function processConversationTurn(
  userMessage: string,
  history: Message[],
  currentState: ConversationState,
  attachments?: MessageAttachment[]
): Promise<OrchestratorResponse> {

  console.log('[Orchestrator] Starting turn', currentState.turns_total + 1)
  if (attachments && attachments.length > 0) {
    console.log(`[Orchestrator] Turn includes ${attachments.length} attachment(s):`, attachments.map(a => `${a.type}: ${a.name}`))
  }

  // Early return for post-completion messages
  if (currentState.phase === 'complete') {
    console.log('[Orchestrator] Post-completion message received - generating brief response')

    const postCompletionOverlay = loadPromptOverlays().get('post_completion') || ''
    const systemPrompt = `${BASE_IDENTITY}\n\n---\n\n${postCompletionOverlay}`

    const conversationHistory: Message[] = [
      ...history,
      { role: 'user' as const, content: userMessage, turn: currentState.turns_total, timestamp: new Date() }
    ]

    const advisorText = await generateLLMResponse(systemPrompt, conversationHistory)

    // Re-show the summary card so it's obvious
    const assembled = assembleResponse(
      advisorText,
      [{ type: 'view_summary', config: { variant: 'aligned' } }],
      currentState,
      currentState.closing_sequence.synthesis
    )

    return {
      advisorResponse: assembled.fullText,
      state: currentState,
      decision: {
        action: 'post_completion' as any,
        confidence: 1,
        reasoning: 'Conversation already complete - handling follow-up message',
        prompt_overlays: ['post_completion'],
        available_tools: [],
      },
      inference: null,
      complete: true,
      components: assembled.payload,
    }
  }

  // Step 1: Run UNIFIED ANALYSIS (single LLM call replaces signals + inference + consent)
  // Key innovation: Separates EXPLICIT statements from INFERRED signals
  console.log('[Orchestrator] Running unified analysis...')
  const startTime = Date.now()

  const analysis = await runUnifiedAnalysis(userMessage, history, currentState)
  // Pass current constraint for constraint-aware overwhelm detection
  const effective = resolveEffectiveState(analysis, currentState.constraint_hypothesis)

  console.log(`[Orchestrator] Unified analysis complete in ${Date.now() - startTime}ms`)
  console.log('[Orchestrator] Signals:', {
    clarity: analysis.signals.clarity,
    confidence: analysis.signals.confidence,
    capacity: analysis.signals.capacity,
    overwhelm: analysis.signals.overwhelm
  })
  console.log('[Orchestrator] Explicit:', {
    stated_ready: analysis.explicit.stated_ready,
    stated_no_blockers: analysis.explicit.stated_no_blockers,
    asked_for_next_steps: analysis.explicit.asked_for_next_steps,
    gave_consent: analysis.explicit.gave_consent
  })
  console.log('[Orchestrator] Effective:', {
    capacity: effective.capacity,
    ready_to_close: effective.ready_to_close,
    consent_given: effective.consent_given
  })

  // Step 2: Update conversation state with unified analysis
  const updatedState = updateStateFromAnalysis(currentState, analysis, effective)
  console.log('[Orchestrator] Updated state:', {
    phase: updatedState.phase,
    readiness: updatedState.readiness,
    hypothesis: updatedState.constraint_hypothesis,
    hypothesis_confidence: updatedState.hypothesis_confidence
  })

  // Step 3: Handle consent detection (now part of unified analysis)
  if (currentState.consent_state.diagnosis_requested && !currentState.consent_state.diagnosis_confirmed) {
    if (effective.consent_given) {
      updatedState.consent_state.diagnosis_confirmed = true
      console.log('[Orchestrator] CONSENT CONFIRMED (from unified analysis)')
    }
  }

  // Step 4: Make decision about next action
  // IMPORTANT: Pass effective state so decision engine can use explicit overrides
  console.log('[Orchestrator] Making decision...')
  const decision = makeDecisionWithEffective(updatedState, analysis, effective)
  console.log('[Orchestrator] Decision:', {
    action: decision.action,
    confidence: decision.confidence,
    reasoning: decision.reasoning
  })

  // Step 5a: Handle request_diagnosis_consent (mark that we asked)
  if (decision.action === 'request_diagnosis_consent') {
    console.log('[Orchestrator] REQUESTING DIAGNOSIS CONSENT')
    updatedState.consent_state.diagnosis_requested = true
    updatedState.consent_state.last_consent_request = 'diagnosis'
    // Continue to LLM to generate the consent request
  }

  // Step 5b: Handle check_blockers (mark that we checked)
  if (decision.action === 'check_blockers') {
    console.log('[Orchestrator] BLOCKER CHECK')
    updatedState.readiness_check.blockers_checked = true
    // Continue to LLM to generate the blocker question
  }

  // Step 5b1.5: Handle redirect_from_tactical (track redirect turn)
  if (decision.action === 'redirect_from_tactical') {
    if (!updatedState.tactical_drift) {
      updatedState.tactical_drift = { consecutive_tactical_turns: 0, total_tactical_turns: 0, redirect_count: 0, last_redirect_turn: 0 }
    }
    updatedState.tactical_drift.last_redirect_turn = updatedState.turns_total
    updatedState.tactical_drift.redirect_count += 1
    console.log(`[Orchestrator] TACTICAL REDIRECT #${updatedState.tactical_drift.redirect_count} at turn ${updatedState.turns_total}`)
  }

  // Step 5b2: Handle explore_readiness (track turns spent exploring)
  if (decision.action === 'explore_readiness') {
    updatedState.readiness_check.turns_exploring_readiness++
    console.log(`[Orchestrator] EXPLORING READINESS - turn ${updatedState.readiness_check.turns_exploring_readiness}/3, focus: ${decision.focus_area}`)
    // Continue to LLM to generate the readiness exploration question
  }

  // Step 5b3: Handle CLOSING SEQUENCE (Danny's enrollment-professional model)
  // This is a multi-turn conversational close with TWO agreement gates:
  // Turn D: Agreement in principle (they need external help)
  // Turn D2: Agreement to our offering (they want our free call)
  // Turn E: Facilitate (show booking)

  const closingActions = [
    'closing_reflect_implication',
    'closing_reflect_stakes',
    'closing_name_capability_gap',
    'closing_assert_and_align',
    'closing_offer_solution',
    'closing_facilitate'
  ]

  if (closingActions.includes(decision.action)) {
    const closingPhaseMap: Record<string, ClosingPhase> = {
      'closing_reflect_implication': 'reflect_implication',
      'closing_reflect_stakes': 'reflect_stakes',
      'closing_name_capability_gap': 'name_capability_gap',
      'closing_assert_and_align': 'assert_and_align',
      'closing_offer_solution': 'offer_solution',
      'closing_facilitate': 'facilitate'
    }

    const newPhase = closingPhaseMap[decision.action]
    const previousPhase = updatedState.closing_sequence.phase
    const isEnteringClosing = previousPhase === 'not_started'

    console.log(`[Orchestrator] CLOSING SEQUENCE - ${isEnteringClosing ? 'entering' : 'continuing'} phase: ${newPhase}`)

    // Build synthesis when first entering closing sequence
    if (isEnteringClosing) {
      console.log('[Orchestrator] Building closing synthesis...')
      try {
        const synthesis = await buildClosingSynthesis(history, updatedState)
        updatedState.closing_sequence.synthesis = synthesis
        console.log('[Orchestrator] Closing synthesis built:', {
          constraint: synthesis.confirmed_constraint,
          emotional_tone: synthesis.emotional_tone,
          capability_gap: synthesis.capability_gap?.substring(0, 50) + '...'
        })
      } catch (error) {
        console.error('[Orchestrator] Failed to build closing synthesis:', error)
        // Continue without synthesis - overlays will still work
      }
    }

    // Update closing sequence state
    updatedState.closing_sequence.phase = newPhase
    updatedState.closing_sequence.turns_in_closing++

    // Track alignment at Turn D → D2 transition (agreed they need help)
    if (previousPhase === 'assert_and_align' && newPhase === 'offer_solution') {
      // TRACKING: agreed_needs_help is for logging/analytics only, not used in decisions
      updatedState.closing_sequence.agreed_needs_help = true
      // DECISION: alignment_detected is used for component visibility and phase advancement
      updatedState.closing_sequence.alignment_detected = true
      console.log('[Orchestrator] Turn D agreement: User agreed they need external help')
    }

    // Track alignment at Turn D2 → E transition (agreed to our offering)
    // BUT NOT if user declined - decline also advances to facilitate for graceful close
    if (previousPhase === 'offer_solution' && newPhase === 'facilitate') {
      if (analysis.explicit.declined_offering) {
        // User declined - mark hesitation so save_progress component triggers instead of view_summary
        // Must clear alignment_detected (set at Turn D) so Rule 1 (view_summary) doesn't fire
        updatedState.closing_sequence.alignment_detected = false
        updatedState.closing_sequence.user_hesitation_expressed = true
        console.log('[Orchestrator] Turn D2 DECLINE: User declined offering - graceful close path')
      } else {
        // TRACKING: agreed_to_offering is for logging/analytics only
        updatedState.closing_sequence.agreed_to_offering = true
        // DECISION: alignment_detected is used for component visibility
        // If we reach Turn E, user has shown alignment through the whole arc
        updatedState.closing_sequence.alignment_detected = true
        console.log('[Orchestrator] Turn D2 agreement: User agreed to our offering, alignment confirmed')
      }
    }

    // Legacy alignment tracking (for backward compatibility)
    if (newPhase === 'assert_and_align' || newPhase === 'offer_solution') {
      if (effective.ready_to_close || analysis.explicit.stated_ready) {
        updatedState.closing_sequence.alignment_detected = true
        console.log('[Orchestrator] Alignment detected in closing sequence')
      }
    }

    // Track facilitation offered and mark arc complete - this is Turn E, the final turn
    // The component check runs AFTER the LLM generates the response, so the "View Summary"
    // card will appear alongside Turn E's message (not before it)
    if (newPhase === 'facilitate') {
      updatedState.closing_sequence.facilitation_offered = true
      updatedState.closing_sequence.closing_arc_complete = true
      console.log('[Orchestrator] Turn E initiated - closing arc complete, showing summary component')
    }

    // Track hesitation
    if (analysis.tensions.resistance_to_hypothesis || effective.has_blockers) {
      updatedState.closing_sequence.user_hesitation_expressed = true
      console.log('[Orchestrator] User hesitation detected in closing sequence')
    }
  }

  // Step 5c: Handle complete_with_handoff (clean closing)
  if (decision.action === 'complete_with_handoff') {
    console.log('[Orchestrator] COMPLETE WITH HANDOFF')

    // Defensive null check - should have constraint by this point, but fallback if not
    if (!updatedState.constraint_hypothesis) {
      console.error('[Orchestrator] complete_with_handoff without constraint - falling back to strategy')
      updatedState.constraint_hypothesis = 'strategy'
    }
    const constraint = updatedState.constraint_hypothesis

    // Generate clean summary using LLM with accumulated insights for specificity
    const summary = await generateConstraintSummary(
      constraint,
      analysis.constraint.evidence ? [analysis.constraint.evidence] : [],
      updatedState.user_name,
      history,
      {
        // Pass accumulated insights for richer, more specific summary
        insights: updatedState.learner_state.insights_articulated,
      }
    )

    // Update state to complete
    updatedState.phase = 'complete'
    updatedState.constraint_summary = summary
    updatedState.constraint_hypothesis = constraint

    // Continue to LLM to generate closing message with overlay
    // Don't return early - let LLM handle the handoff message
  }

  // Step 5d: Handle diagnose - LLM delivers diagnosis with overlay
  // (No longer auto-generates closing message - let LLM handle it)

  // Step 5b: Containment handled by LLM via overlay (not programmatically)
  // The containment overlay guides Claude to respond naturally to overwhelm
  // This prevents scripted, repetitive messages
  if (decision.action === 'contain') {
    console.log('[Orchestrator] CONTAINMENT TRIGGERED - LLM will handle via overlay')

    console.log('[Orchestrator] Containment level:', {
      emotionalIntensity: analysis.signals.emotional_intensity,
      capacity: analysis.signals.capacity,
      hypothesis: updatedState.constraint_hypothesis
    })

    // Reset containment cooldown
    updatedState.turns_since_containment = 0
    updatedState.last_action = 'contain'

    // Don't return early - let LLM handle it with containment overlay
  }

  // Step 5c: Update learner state based on decision and analysis
  // Note: This is synchronous now - async parts (insight filtering) run in background
  updateLearnerState(updatedState, decision, analysis, userMessage, history)

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

  let advisorText = await generateLLMResponse(systemPrompt, conversationHistory, { attachments })

  // Step 7a.1: Validate response matches intended action
  let validationResult = validateResponse(advisorText, decision)

  // If validation fails, retry once with stronger constraints
  if (!validationResult.valid) {
    console.warn(`[Orchestrator] RESPONSE VALIDATION FAILED for action "${decision.action}" - regenerating...`)

    // Build correction prompt - be extremely forceful
    const correctionPrompt = `${systemPrompt}

## ABSOLUTE PROHIBITION - READ THIS FIRST

Your previous response was REJECTED because it contained forbidden language.

FORBIDDEN PHRASES (do NOT use under any circumstances):
- "click below"
- "book a call"
- "see your summary"
- "schedule a call"
- "the next step is to"

YOU ARE IN ${decision.action.toUpperCase()} MODE. This is NOT a closing moment.

Your response MUST:
1. Continue the conversation naturally
2. Ask a question OR invite them to share more
3. NOT mention anything about booking, summaries, buttons, or next steps
4. Be at least 2-3 sentences long (not a brief closing statement)

The conversation is NOT over. You need to explore further before closing.

${validationResult.violations.map(v => `VIOLATION DETECTED: ${v}`).join('\n')}

Generate a thoughtful response that continues the exploration.`

    // Retry with correction prompt (lower temperature for more deterministic output)
    advisorText = await generateLLMResponse(correctionPrompt, conversationHistory, { temperature: 0.5 })

    // Validate again
    validationResult = validateResponse(advisorText, decision)
    if (!validationResult.valid) {
      // For critical closing actions, use fallback template instead of invalid response
      if (CRITICAL_CLOSING_ACTIONS.includes(decision.action)) {
        const fallback = getClosingFallback(decision.action, updatedState.constraint_hypothesis)
        if (fallback) {
          console.warn(`[Orchestrator] USING FALLBACK TEMPLATE for critical action "${decision.action}"`)
          advisorText = fallback
        } else {
          console.error(`[Orchestrator] REGENERATION STILL FAILED for action "${decision.action}" - using anyway (no fallback available)`)
        }
      } else {
        console.error(`[Orchestrator] REGENERATION STILL FAILED for action "${decision.action}" - using anyway`)
      }
    } else {
      console.log(`[Orchestrator] Regeneration successful - response now valid`)
    }
  }

  // Step 7a: Update conversation memory (track topics to prevent circular exploration)
  // OPTIMIZATION: Fire-and-forget - don't block response on memory update
  // Also skip for very short messages (< 20 words) to reduce LLM calls
  const wordCount = userMessage.split(/\s+/).length
  if (updatedState.conversation_memory && wordCount >= 20) {
    // Fire-and-forget: Update memory in background, don't await
    updateConversationMemory(
      updatedState.conversation_memory,
      userMessage,
      advisorText,
      analysis.signals.clarity
    ).then(memoryUpdate => {
      // Update state in place (will be persisted on next turn)
      updatedState.conversation_memory = memoryUpdate.memory
      if (memoryUpdate.isRepeat) {
        console.log('[Orchestrator] Topic repetition detected - ground covered:', memoryUpdate.memory.ground_covered_score)
      }
    }).catch(error => {
      console.error('[Orchestrator] Memory update failed:', error)
    })
  } else if (updatedState.conversation_memory) {
    // For short messages, just update clarity history without LLM call
    updatedState.conversation_memory.clarity_history = [
      ...updatedState.conversation_memory.clarity_history,
      analysis.signals.clarity
    ].slice(-6)
  }

  // Step 7b: Track variety if this was a reflection
  if (decision.action === 'reflect_insight' && updatedState.variety_tracker) {
    recordReflection(updatedState.variety_tracker, updatedState.turns_total)
    console.log('[Orchestrator] Reflection recorded:', updatedState.variety_tracker.total_reflections)
  }

  // Step 7c: Track action and set diagnosis_delivered flag (monotonic - never reset)
  updatedState.last_action = decision.action
  if (decision.action === 'diagnose') {
    updatedState.diagnosis_delivered = true
    console.log('[Orchestrator] DIAGNOSIS DELIVERED - setting flag for post-diagnosis flow')
  }
  // Track boundary set for relationship modeling
  if (decision.action === 'set_boundary') {
    updatedState.relationship = {
      ...updatedState.relationship,
      boundary_set: true,
    }
  }

  // Track frustration acknowledgment count
  if (decision.action === 'acknowledge_frustration') {
    updatedState.relationship = {
      ...updatedState.relationship,
      frustration_acknowledged_count: (updatedState.relationship.frustration_acknowledged_count ?? 0) + 1,
    }
    console.log(`[Orchestrator] FRUSTRATION ACKNOWLEDGED #${updatedState.relationship.frustration_acknowledged_count}`)
  }

  if (decision.action === 'push_back_on_low_effort') {
    updatedState.low_effort_tracking.has_pushed_back = true
    updatedState.low_effort_tracking.pushback_count = (updatedState.low_effort_tracking.pushback_count ?? 0) + 1
    updatedState.low_effort_tracking.consecutive_low_effort_turns = 0  // Reset so next turn gets a fresh chance
    console.log(`[Orchestrator] LOW-EFFORT PUSHBACK #${updatedState.low_effort_tracking.pushback_count} delivered`)
  }

  // Step 8: Check if phase should transition
  if (shouldTransitionPhase(updatedState.phase, updatedState, decision)) {
    const nextPhase = getNextPhase(updatedState.phase)
    console.log(`[Orchestrator] Phase transition: ${updatedState.phase} → ${nextPhase}`)
    updatedState.phase = nextPhase as any
    updatedState.turns_in_phase = 0
  }

  // Step 8.5: Record used patterns for variety tracking
  // This updates the tracker so we don't repeat the same phrases
  if (updatedState.variety_tracker) {
    recordUsedPatterns(advisorText, updatedState.variety_tracker)
  }

  // Check if conversation is complete
  // Complete when:
  // 1. Legacy path: complete_with_handoff action
  // 2. Danny-style path: closing_facilitate with closing_arc_complete
  // 3. Phase already set to 'complete'
  const closingArcComplete = updatedState.closing_sequence.closing_arc_complete
  const isComplete = decision.action === 'complete_with_handoff' ||
                     (decision.action === 'closing_facilitate' && closingArcComplete) ||
                     updatedState.phase === 'complete'

  // Set phase to 'complete' for Danny-style closing as well
  if (isComplete && updatedState.phase !== 'complete') {
    updatedState.phase = 'complete'
    console.log('[Orchestrator] Setting phase to complete (closing arc finished)')

    // Generate constraint summary if not already set (closing sequence path doesn't generate one)
    if (!updatedState.constraint_summary && updatedState.constraint_hypothesis) {
      try {
        const summary = await generateConstraintSummary(
          updatedState.constraint_hypothesis,
          analysis.constraint.evidence ? [analysis.constraint.evidence] : [],
          updatedState.user_name,
          history,
          { insights: updatedState.learner_state.insights_articulated }
        )
        updatedState.constraint_summary = summary
        console.log('[Orchestrator] Generated constraint summary for closing sequence path')
      } catch (error) {
        console.error('[Orchestrator] Constraint summary generation failed, using fallback:', error)
        updatedState.constraint_summary = getDefaultSummary(updatedState.constraint_hypothesis)
      }
    }
  }

  // Step 9: DETERMINISTIC component injection based on state
  // Components are shown when specific state conditions are met, not based on LLM output
  //
  // CRITICAL (Danny's feedback): Components should ONLY appear AFTER the closing arc is complete.
  // The closing arc is: Turn A → B → C → D → E (Danny's enrollment-professional model)
  // Components appearing mid-arc (like save_progress at Turn 31) create premature closure feeling.
  let assembled: AssembledResponse
  const componentsToShow: ComponentTrigger[] = []

  // GATE: Components can ONLY appear after closing_arc_complete is true
  // This ensures we've completed Turn A-E before showing any CTAs
  // (closingArcComplete already declared above when checking isComplete)

  // DETERMINISTIC RULE 1: Show summary when closing arc is complete with alignment
  // This is AFTER Danny's Turn E - the user has confirmed alignment
  const shouldShowSummary = (
    // Closing arc must be complete (Turn E done)
    closingArcComplete &&
    // Alignment was detected (user said yes during the arc)
    updatedState.closing_sequence.alignment_detected &&
    // Haven't already shown summary
    !updatedState.summary_already_shown
  )

  // DETERMINISTIC RULE 2: Show summary for complete_with_handoff (fallback path)
  // This handles cases where we reach handoff through safety net or other paths
  const shouldShowSummaryFallback = (
    decision.action === 'complete_with_handoff' &&
    !updatedState.summary_already_shown &&
    updatedState.diagnosis_delivered
  )

  if (shouldShowSummary || shouldShowSummaryFallback) {
    const variant = updatedState.closing_sequence.alignment_detected ? 'aligned' : 'soft'
    componentsToShow.push({
      type: 'view_summary',
      config: { variant }
    })
    updatedState.summary_already_shown = true
    console.log(`[Orchestrator] DETERMINISTIC: Showing summary component (variant: ${variant})`)
    console.log(`[Orchestrator]   - closing_arc_complete: ${closingArcComplete}`)
    console.log(`[Orchestrator]   - alignment_detected: ${updatedState.closing_sequence.alignment_detected}`)
    console.log(`[Orchestrator]   - phase: ${updatedState.closing_sequence.phase}`)
  }

  // DETERMINISTIC RULE 3: Show save_progress for hesitant users ONLY after closing arc complete
  // This is a recovery option when user expressed hesitation during the closing arc
  // NOT a mid-conversation off-ramp
  const shouldShowSaveProgress = (
    // Closing arc must be complete (Turn E done)
    closingArcComplete &&
    // User expressed hesitation during the arc
    updatedState.closing_sequence.user_hesitation_expressed &&
    // No alignment was achieved
    !updatedState.closing_sequence.alignment_detected &&
    // Haven't already shown a component
    !updatedState.summary_already_shown
  )

  if (shouldShowSaveProgress && componentsToShow.length === 0) {
    componentsToShow.push({
      type: 'save_progress',
      config: { variant: 'gentle' }
    })
    // Prevent duplicate triggering
    updatedState.summary_already_shown = true
    console.log('[Orchestrator] DETERMINISTIC: Showing save_progress for hesitant user (arc complete)')
  }

  // DETERMINISTIC RULE 5: Show email capture card mid-conversation
  // Collects email early when engagement is good, before closing sequence
  const shouldShowEmailCapture = (
    updatedState.turns_total >= 10 &&
    !updatedState.email_capture_shown &&
    updatedState.closing_sequence.phase === 'not_started' &&
    (updatedState.learner_state.insights_articulated.length >= 1 ||
     updatedState.hypothesis_confidence >= 0.6)
  )

  if (shouldShowEmailCapture && componentsToShow.length === 0) {
    componentsToShow.push({
      type: 'collect_email',
      config: {}
    })
    updatedState.email_capture_shown = true
    console.log('[Orchestrator] DETERMINISTIC: Showing mid-conversation email capture card')
  }

  // DETERMINISTIC RULE 4: Show save_progress for turn limit (email capture for incomplete convos)
  // When we hit the turn limit, offer to email them a summary of what we learned
  // This captures their email and provides value even for incomplete conversations
  const isTurnLimitClose = decision.prompt_overlays.includes('turn_limit_close')
  const shouldShowTurnLimitSaveProgress = (
    isTurnLimitClose &&
    !updatedState.summary_already_shown &&
    componentsToShow.length === 0
  )

  if (shouldShowTurnLimitSaveProgress) {
    componentsToShow.push({
      type: 'save_progress',
      config: { variant: 'turn_limit' }
    })
    updatedState.summary_already_shown = true
    console.log('[Orchestrator] DETERMINISTIC: Showing save_progress for turn limit (email capture)')
  }

  // NOTE: This also fires for self-directed close (financial constraint path) since
  // diagnosis_delivered is false on that path. This is intentional — those users
  // should still get an email capture opportunity.
  // DETERMINISTIC RULE 6: Email capture for early exits (no diagnosis delivered)
  // When conversation ends before diagnosis (exit intent, frustration close, low engagement),
  // offer email capture so we can nurture for future re-engagement.
  const isEarlyExitWithoutDiagnosis = (
    isComplete &&
    !updatedState.diagnosis_delivered &&
    !updatedState.summary_already_shown &&
    componentsToShow.length === 0
  )

  if (isEarlyExitWithoutDiagnosis) {
    componentsToShow.push({
      type: 'collect_email',
      config: { variant: 'early_exit' }
    })
    updatedState.summary_already_shown = true
    console.log('[Orchestrator] DETERMINISTIC: Showing early-exit email capture (no diagnosis delivered)')
  }

  // Assemble response with any triggered components
  if (componentsToShow.length > 0) {
    assembled = assembleResponse(
      advisorText,
      componentsToShow,
      updatedState,
      updatedState.closing_sequence.synthesis
    )
  } else {
    assembled = assembleSimpleResponse(advisorText)
  }

  return {
    advisorResponse: assembled.fullText,
    state: updatedState,
    decision,
    inference: null,  // Deprecated: unified analysis replaces separate inference
    complete: isComplete,
    // Include component payload for frontend
    components: assembled.payload
  }
}

/**
 * Update relationship state based on unified analysis
 * Combines LLM assessment with deterministic heuristics (confirmed reflections)
 */
function updateRelationshipState(
  currentState: ConversationState,
  analysis: UnifiedAnalysis
): ConversationState['relationship'] {
  const rel = analysis.relationship
  const current = currentState.relationship

  // Track confirmed reflections (deterministic heuristic layer on top of LLM assessment)
  let confirmedReflections = current.confirmed_reflections
  if (analysis.explicit.alignment_expressed) {
    confirmedReflections += 1
  }

  // Behavioral trust signal: user builds on Mira's observations without resistance
  // For direct pragmatists who don't use explicit confirmatory language
  if (
    !analysis.explicit.alignment_expressed &&
    !analysis.tensions.resistance_to_hypothesis &&
    currentState.constraint_hypothesis &&
    currentState.hypothesis_confidence >= 0.7 &&
    rel.engagement === 'high'
  ) {
    // Count high-engagement non-resistant responses as half-confirmations
    // (every 2 such turns = 1 confirmed reflection)
    if (confirmedReflections === 0 && currentState.turns_total >= 6) {
      confirmedReflections = 1  // Floor: treat sustained engagement as minimal trust earned
    }
  }

  // Trust level: combine LLM assessment with heuristic
  // LLM detects "damaged" directly (overrides heuristic)
  // Heuristic provides floor based on confirmed reflections
  let trustLevel = rel.trust_level
  if (trustLevel !== 'damaged') {
    // Heuristic floor: can't be "established" without enough confirmed reflections
    if (confirmedReflections === 0) {
      // Direct pragmatists may not use confirmatory language — trust LLM assessment more
      if ((current.disposition === 'direct_pragmatist' || current.disposition === 'skeptical_evaluator') && trustLevel === 'building') {
        // Allow LLM assessment to stand
      } else {
        trustLevel = 'establishing'
      }
    } else if (confirmedReflections <= 2 && trustLevel === 'established') {
      trustLevel = 'building'  // LLM said established but not enough confirmed reflections
    }
  }

  // Trust smoothing: once damaged, require explicit alignment to recover (not just LLM reassessment)
  // Prevents trust flickering from "damaged" back to "building" on a single calm response
  if (current.trust_level === 'damaged' && trustLevel !== 'damaged') {
    // Only allow recovery if user explicitly expressed alignment this turn
    if (!analysis.explicit.alignment_expressed) {
      trustLevel = 'damaged'  // Hold damaged until explicit recovery signal
    }
  }

  // Frustration smoothing: significant frustration doesn't drop to "none" in one turn
  // Requires at least stepping down through "mild" first
  let processFrustration = rel.process_frustration
  const frustrationOrder = ['none', 'mild', 'significant', 'hostile'] as const
  const currentFrustIdx = frustrationOrder.indexOf(current.process_frustration)
  const newFrustIdx = frustrationOrder.indexOf(processFrustration)
  if (currentFrustIdx >= 0 && newFrustIdx >= 0 && currentFrustIdx - newFrustIdx > 1) {
    // Can only drop one level per turn
    processFrustration = frustrationOrder[currentFrustIdx - 1]
  }

  return {
    engagement: rel.engagement,
    trust_level: trustLevel,
    disposition: rel.disposition,
    process_frustration: processFrustration,
    frustration_target: rel.frustration_target,
    confirmed_reflections: confirmedReflections,
    boundary_set: current.boundary_set,  // only set when boundary action fires
    frustration_acknowledged_count: current.frustration_acknowledged_count,
  }
}

/**
 * Update conversation state based on unified analysis and effective state
 * Uses sticky hypothesis logic and explicit statement overrides
 */
function updateStateFromAnalysis(
  currentState: ConversationState,
  analysis: UnifiedAnalysis,
  effective: EffectiveState
): ConversationState {

  // Apply sticky hypothesis logic - requires strong evidence to change once established
  const { hypothesis, confidence } = updateStickyHypothesis(
    currentState.constraint_hypothesis,
    currentState.hypothesis_confidence,
    analysis
  )

  // Calculate emotional charge from analysis
  const emotionalCharge = analysis.signals.emotional_intensity > 3 ? 'high' as const :
                          analysis.signals.emotional_intensity > 1 ? 'moderate' as const : 'neutral' as const

  // Update contradiction count
  const contradictionCount = analysis.tensions.contradiction_detected
    ? currentState.contradiction_count + 1
    : currentState.contradiction_count

  // Track hypothesis resistance count
  let hypothesisResistanceCount = currentState.hypothesis_resistance_count
  if (analysis.tensions.resistance_to_hypothesis) {
    hypothesisResistanceCount += 1
    console.log(`[StateUpdate] Hypothesis resistance count: ${hypothesisResistanceCount}`)
  } else if (hypothesis !== currentState.constraint_hypothesis && hypothesis !== null) {
    // Reset on hypothesis change
    hypothesisResistanceCount = 0
    console.log(`[StateUpdate] Hypothesis changed - resetting resistance count`)
  }

  // Check for validation (stress test passed = validated)
  const nowValidated = currentState.hypothesis_validated || analysis.tensions.stress_test_passed

  // Track tactical drift (defensive: handle missing tactical_drift for older sessions)
  const isTactical = analysis.tactical?.is_tactical_request || false
  const td = currentState.tactical_drift || { consecutive_tactical_turns: 0, total_tactical_turns: 0, redirect_count: 0, last_redirect_turn: 0 }
  const tacticalDrift = {
    consecutive_tactical_turns: isTactical
      ? td.consecutive_tactical_turns + 1
      : 0,
    total_tactical_turns: isTactical
      ? td.total_tactical_turns + 1
      : td.total_tactical_turns,
    redirect_count: td.redirect_count,
    last_redirect_turn: td.last_redirect_turn
  }

  return {
    ...currentState,

    // Update hypothesis resistance tracking
    hypothesis_resistance_count: hypothesisResistanceCount,

    // Update tactical drift tracking
    tactical_drift: tacticalDrift,

    // Update hypothesis tracking with sticky logic
    constraint_hypothesis: hypothesis as any,
    hypothesis_confidence: confidence,
    // MONOTONIC: Once hypothesis is validated, it stays validated
    hypothesis_validated: nowValidated,

    // Update readiness from effective state (explicit overrides inferred)
    readiness: {
      clarity: effective.clarity,
      confidence: effective.confidence,
      capacity: effective.capacity
    },

    // Update emotional state
    emotional_charge: emotionalCharge,
    overwhelm_detected: effective.overwhelm,
    contradiction_count: contradictionCount,

    // Update turn tracking
    turns_total: currentState.turns_total + 1,
    turns_in_phase: currentState.turns_in_phase + 1,
    turns_since_validation: (!currentState.hypothesis_validated && nowValidated)
      ? 0
      : currentState.turns_since_validation + 1,
    turns_since_containment: currentState.turns_since_containment + 1,

    // Update complexity
    complexity_level: determineComplexityFromAnalysis(analysis, currentState),

    // Track last action
    last_action: currentState.last_action,

    // Track low-effort responses (hybrid: deterministic pre-check + LLM confirmation)
    low_effort_tracking: updateLowEffortTracking(currentState, analysis),

    // Update relationship modeling state
    relationship: updateRelationshipState(currentState, analysis)
  }
}

/**
 * Wrapper for makeDecision that uses effective state for explicit override handling
 * This ensures explicit user statements bypass inferred state logic
 */
function makeDecisionWithEffective(
  state: ConversationState,
  analysis: UnifiedAnalysis,
  effective: EffectiveState
): OrchestratorDecision {
  // Import and call the decision engine with effective state
  // The decision engine will check effective.ready_to_close to bypass explore_readiness loops
  return makeDecision(state, analysis, effective)
}

/**
 * Determine complexity level from unified analysis
 */
function determineComplexityFromAnalysis(analysis: UnifiedAnalysis, state: ConversationState): 'simple' | 'moderate' | 'complex' {
  // Complex if:
  // - Multiple contradictions
  // - Low clarity despite many turns
  // - High emotional intensity + low capacity

  if (state.contradiction_count >= 2) {
    return 'complex'
  }

  if (state.turns_in_phase >= 6 && analysis.signals.clarity === 'low') {
    return 'complex'
  }

  if (analysis.signals.emotional_intensity >= 3 && analysis.signals.capacity === 'low') {
    return 'complex'
  }

  if (state.turns_in_phase >= 4) {
    return 'moderate'
  }

  return 'simple'
}

/**
 * Track low-effort responses using hybrid detection:
 * 1. Deterministic pre-check: word count < 5 AND no emotional keywords
 * 2. LLM confirmation via engagement field in unified analysis
 * Both must agree for a turn to count as low-effort.
 */
function updateLowEffortTracking(
  currentState: ConversationState,
  analysis: UnifiedAnalysis
): ConversationState['low_effort_tracking'] {
  const isLowEffort = analysis.engagement?.low_effort === true &&
    !analysis.engagement?.meaningful_despite_short

  if (isLowEffort) {
    return {
      consecutive_low_effort_turns: currentState.low_effort_tracking.consecutive_low_effort_turns + 1,
      total_low_effort_turns: currentState.low_effort_tracking.total_low_effort_turns + 1,
      has_pushed_back: currentState.low_effort_tracking.has_pushed_back,
      pushback_count: currentState.low_effort_tracking.pushback_count ?? 0
    }
  }

  return {
    ...currentState.low_effort_tracking,
    pushback_count: currentState.low_effort_tracking.pushback_count ?? 0,
    consecutive_low_effort_turns: 0  // Reset consecutive count on substantive response
  }
}

/**
 * Update learner state based on decision and unified analysis
 * This tracks the user's learning journey through the conversation
 */
function updateLearnerState(
  state: ConversationState,
  decision: OrchestratorDecision,
  analysis: UnifiedAnalysis,
  userMessage: string,
  history: Message[]
): void {
  // Capture insights when detected (formatted for professional display)
  if (analysis.insights.breakthrough_detected && analysis.insights.insight_phrases.length > 0) {
    for (const phrase of analysis.insights.insight_phrases) {
      // Skip short acknowledgments that aren't real insights
      if (!isQualityInsight(phrase)) {
        console.log('[Learner State] Skipping low-quality phrase:', phrase)
        continue
      }

      const formattedInsight = formatInsight(phrase)
      // Check if this insight (or its unformatted version) already exists
      const alreadyExists = state.learner_state.insights_articulated.some(
        existing => existing.toLowerCase() === formattedInsight.toLowerCase() ||
                    existing.toLowerCase() === phrase.toLowerCase()
      )
      if (!alreadyExists) {
        state.learner_state.insights_articulated.push(formattedInsight)
        console.log('[Learner State] Insight captured:', formattedInsight)
      }
    }

    // Update last insight
    state.recursive_state.last_insight = analysis.insights.insight_phrases[0]

    // Increment milestones when reflect_insight action fires
    if (decision.action === 'reflect_insight') {
      state.learner_state.learning_milestones++
      console.log('[Learner State] Milestone:', state.learner_state.learning_milestones)
    }
  }

  // 2. Track contradictions when surfacing
  if (decision.action === 'surface_contradiction') {
    state.learner_state.contradictions_surfaced++
    state.recursive_state.pending_contradiction = 'Tension being explored'
    console.log('[Learner State] Contradiction surfaced')
  }

  // 3. Track stress testing
  if (decision.action === 'stress_test') {
    state.readiness_check.stress_test_completed = true
    console.log('[Learner State] Stress test initiated')
  }

  // 4. Check if stress test passed (from unified analysis)
  if (
    state.readiness_check.stress_test_completed &&
    analysis.tensions.stress_test_passed &&
    !state.learner_state.stress_test_passed
  ) {
    state.learner_state.stress_test_passed = true
    console.log('[Learner State] Stress test PASSED')
  }

  // 5. Track criteria building
  if (decision.action === 'build_criteria') {
    state.recursive_state.shared_criteria_established = true
    console.log('[Learner State] Shared criteria established (advisor-led)')
  } else if (
    !state.recursive_state.shared_criteria_established &&
    analysis.signals.clarity === 'high' &&
    /success would (mean|look like|be)|what (good|better) looks like|my criteria|what I need/i.test(userMessage)
  ) {
    state.recursive_state.shared_criteria_established = true
    console.log('[Learner State] Shared criteria established (user-initiated)')
  }

  // 6. Pre-commitment check
  if (decision.action === 'pre_commitment_check') {
    state.recursive_state.pre_commitment_checked = true

    // Determine commitment level from explicit statements
    if (analysis.explicit.stated_ready || analysis.explicit.stated_no_blockers) {
      state.readiness_check.commitment_level = 'high'
    } else if (analysis.explicit.stated_blockers && analysis.explicit.stated_blockers.length > 0) {
      state.readiness_check.commitment_level = 'low'
      state.readiness_check.identified_blockers = analysis.explicit.stated_blockers
    }

    state.readiness_check.ready_for_booking = state.readiness_check.commitment_level === 'high'

    console.log('[Learner State] Commitment check:', {
      level: state.readiness_check.commitment_level,
      blockers: state.readiness_check.identified_blockers.length,
      ready: state.readiness_check.ready_for_booking
    })
  }

  // Update commitment level from explicit statements (continuous tracking)
  if (analysis.explicit.stated_ready) {
    state.readiness_check.commitment_level = 'high'
    console.log('[Learner State] Commitment level upgraded to high (explicit statement)')
  } else if (analysis.insights.ownership_language && analysis.signals.confidence === 'high') {
    if (state.readiness_check.commitment_level === 'low') {
      state.readiness_check.commitment_level = 'medium'
      console.log('[Learner State] Commitment level upgraded to medium (ownership detected)')
    }
  }

  // Capture blockers from explicit statements
  if (analysis.explicit.stated_blockers && analysis.explicit.stated_blockers.length > 0) {
    for (const blocker of analysis.explicit.stated_blockers) {
      if (!state.readiness_check.identified_blockers.includes(blocker)) {
        state.readiness_check.identified_blockers.push(blocker)
        console.log('[Learner State] Blocker identified:', blocker)
      }
    }
  }

  // Update booking readiness
  state.readiness_check.ready_for_booking = (
    state.readiness_check.commitment_level === 'high' &&
    state.hypothesis_validated
  )

  // 7. Track hypothesis co-creation
  if (
    !state.learner_state.hypothesis_co_created &&
    state.hypothesis_validated &&
    analysis.insights.ownership_language
  ) {
    state.learner_state.hypothesis_co_created = true
    console.log('[Learner State] Hypothesis co-created with user')
  }

  // 8. Update expertise level
  if (analysis.insights.meta_cognition && state.learner_state.expertise_level === 'novice') {
    state.learner_state.expertise_level = 'developing'
    console.log('[Learner State] Expertise → developing (meta-cognition detected)')
  }

  const newExpertiseLevel = calculateExpertiseLevel(state)
  if (newExpertiseLevel !== state.learner_state.expertise_level) {
    const levelOrder = { 'novice': 0, 'developing': 1, 'expert': 2 }
    if (levelOrder[newExpertiseLevel] > levelOrder[state.learner_state.expertise_level]) {
      state.learner_state.expertise_level = newExpertiseLevel
      console.log('[Learner State] Expertise level:', newExpertiseLevel)
    }
  }

  // 9. Build cumulative understanding
  if (analysis.insights.breakthrough_detected || analysis.insights.ownership_language) {
    const understanding = `Turn ${state.turns_total}: ${analysis.signals.clarity} clarity`
    state.recursive_state.cumulative_understanding.push(understanding)
  }

  // 10. Track confirmation of understanding (prevents redundant summarization)
  // Uses unified analysis signals instead of regex patterns
  state.learner_state.last_turn_confirmed_understanding =
    (analysis.explicit.alignment_expressed && analysis.insights.ownership_language) ||
    analysis.tensions.stress_test_passed

  if (state.learner_state.last_turn_confirmed_understanding) {
    console.log('[Learner State] User confirmed understanding - skip summarization next turn')
  }

  // 11. Track self-awareness level (affects diagnosis approach)
  // Uses unified analysis signals instead of regex patterns
  const awarenessScore =
    (analysis.insights.ownership_language ? 1 : 0) +
    (analysis.insights.meta_cognition ? 1 : 0) +
    (analysis.insights.breakthrough_detected ? 1 : 0)

  if (awarenessScore >= 2 && state.learner_state.self_awareness_level !== 'high') {
    state.learner_state.self_awareness_level = 'high'
    console.log('[Learner State] Self-awareness → high (user self-diagnosing)')
  } else if (awarenessScore === 1 && state.learner_state.self_awareness_level === 'low') {
    state.learner_state.self_awareness_level = 'medium'
    console.log('[Learner State] Self-awareness → medium')
  }
}

/**
 * Initialize a new conversation state
 */
export function initializeState(userName?: string): ConversationState {
  return {
    phase: 'context',
    constraint_hypothesis: null,
    hypothesis_confidence: 0,  // Used for sticky hypothesis logic
    sub_dimension: null,
    constraint_summary: null,
    hypothesis_validated: false,
    diagnosis_delivered: false,  // Set once when diagnose fires, never reset
    summary_already_shown: false,  // Set when view_summary component triggers, prevents duplicate

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

    user_name: userName,

    // Learner journey tracking (recursive prompting)
    learner_state: {
      insights_articulated: [],
      contradictions_surfaced: 0,
      learning_milestones: 0,
      hypothesis_co_created: false,
      stress_test_passed: false,
      expertise_level: 'novice',
      last_turn_confirmed_understanding: false,
      self_awareness_level: 'low'
    },

    // Recursive prompting state
    recursive_state: {
      last_insight: null,
      pending_contradiction: null,
      shared_criteria_established: false,
      cumulative_understanding: [],
      pre_commitment_checked: false // FIX: Bug #1 - Initialize flag
    },

    // Pre-commitment tracking
    readiness_check: {
      stress_test_completed: false,
      identified_blockers: [],
      commitment_level: 'low',
      ready_for_booking: false,
      blockers_checked: false,
      turns_exploring_readiness: 0
    },

    // Consent gates
    consent_state: {
      diagnosis_requested: false,
      diagnosis_confirmed: false,
      last_consent_request: null
    },

    // Hypothesis resistance tracking
    hypothesis_resistance_count: 0,

    // Tactical drift tracking (prevents sustained tactical coaching)
    tactical_drift: {
      consecutive_tactical_turns: 0,
      total_tactical_turns: 0,
      redirect_count: 0,
      last_redirect_turn: 0
    },

    // Multi-turn closing sequence state (Danny's enrollment-professional model)
    closing_sequence: {
      phase: 'not_started',
      turns_in_closing: 0,
      synthesis: null,
      alignment_detected: false,
      user_hesitation_expressed: false,
      facilitation_offered: false,
      closing_arc_complete: false,  // CRITICAL: Gates component visibility - only true after Turn E completes
      agreed_needs_help: false,     // Turn D agreement gate
      agreed_to_offering: false     // Turn D2 agreement gate
    },

    // Response variety tracking (prevents formulaic language)
    variety_tracker: initializeVarietyTracker(),

    // Conversation memory (prevents circular exploration)
    conversation_memory: initializeConversationMemory(),

    // Mid-conversation email capture
    email_capture_shown: false,
    email_capture_dismissed: false,

    // Relationship modeling (working alliance tracking)
    relationship: {
      engagement: 'medium',
      trust_level: 'establishing',
      disposition: 'collaborative_explorer',
      process_frustration: 'none',
      frustration_target: null,
      confirmed_reflections: 0,
      boundary_set: false,
      frustration_acknowledged_count: 0,
    },

    // Low-effort response tracking
    low_effort_tracking: {
      consecutive_low_effort_turns: 0,
      total_low_effort_turns: 0,
      has_pushed_back: false,
      pushback_count: 0
    }
  }
}
