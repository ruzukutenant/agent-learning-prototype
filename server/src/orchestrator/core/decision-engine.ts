// Decision engine - determine next action based on state
// UPDATED: Now uses UnifiedAnalysis and EffectiveState for explicit override handling
// UPDATED: Now includes multi-turn closing sequence (Danny's enrollment-professional model)
// SIMPLIFIED: Logic inlined to avoid dependency chain updates

import type {
  ConversationState,
  UnifiedAnalysis,
  EffectiveState,
  OrchestratorDecision,
  ConstraintCategory,
  ClosingPhase
} from './types.js'

import { detectUpstreamConstraint, shouldAttemptCrossMapping } from '../logic/cross-mapping.js'
import { shouldSkipReflection } from './response-variety.js'

// =============================================================================
// CLOSING SEQUENCE LOGIC (Danny's enrollment-professional model)
// =============================================================================
// Key principle: "The close is not a moment. It is the final phase of the same inquiry."

/**
 * Determine if we should enter or continue the closing sequence
 * Entry condition: diagnosis delivered + blockers checked + not already in closing
 */
function shouldEnterClosingSequence(state: ConversationState): boolean {
  return (
    state.diagnosis_delivered &&
    state.readiness_check.blockers_checked &&
    state.closing_sequence.phase === 'not_started'
  )
}

/**
 * Check if alignment was detected in user's response
 * Used after Turn D to determine if we can proceed to Turn E
 */
function detectAlignmentFromAnalysis(analysis: UnifiedAnalysis): boolean {
  // Strong alignment signals
  if (analysis.explicit.stated_ready) return true
  if (analysis.explicit.asked_for_next_steps) return true

  // Ownership language + high confidence suggests agreement
  if (analysis.insights.ownership_language && analysis.signals.confidence === 'high') return true

  // Check for explicit confirmation patterns
  const message = analysis.reasoning.toLowerCase()
  const alignmentPhrases = [
    'yes', 'yeah', 'that makes sense', 'makes sense', 'i agree',
    'that\'s right', 'exactly', 'absolutely', "let's do", 'sounds right',
    'i think so', 'that lands', 'that resonates'
  ]

  return alignmentPhrases.some(phrase => message.includes(phrase))
}

/**
 * STRICT: Check if user explicitly agreed to our offering (the free call)
 * Used ONLY for Turn D2 → E transition (offer_solution → facilitate)
 *
 * This is stricter than general alignment detection because:
 * - User expressing confidence about their own approach ≠ agreeing to our call
 * - We need explicit acceptance of the offer, not just positive sentiment
 *
 * FIX: This prevents the Annie bug where "I don't feel wobbly anymore"
 * (confidence in her own approach) was misread as agreement to our offering.
 *
 * Now uses LLM-detected signal from unified analysis for more robust detection.
 */
function detectOfferingAgreement(analysis: UnifiedAnalysis): boolean {
  // Primary: Use LLM-detected explicit agreement to offering
  // This is the most reliable signal - the LLM understands context
  if (analysis.explicit.agreed_to_offering) {
    console.log('[OfferingAgreement] LLM detected explicit agreement to offering')
    return true
  }

  // Secondary: Explicit request for next steps/booking is a strong signal
  if (analysis.explicit.asked_for_next_steps) {
    console.log('[OfferingAgreement] User explicitly asked for next steps')
    return true
  }

  // Tertiary: Explicit request for booking
  if (analysis.explicit.explicit_request === 'booking') {
    console.log('[OfferingAgreement] User explicitly requested booking')
    return true
  }

  // No explicit offering agreement detected
  return false
}

/**
 * Check if user expressed hesitation or pushback
 * Used to potentially pause closing sequence
 *
 * IMPORTANT: Explicit readiness signals override hesitation detection.
 * If user says "I'm ready" while also mentioning their situation/problems,
 * we should NOT flag hesitation - those mentions are context, not blockers.
 */
function detectHesitationFromAnalysis(analysis: UnifiedAnalysis): boolean {
  // OVERRIDE: If user explicitly stated ready or no blockers, they're not hesitating
  // This prevents false positives when user mentions their problems while being ready
  if (analysis.explicit.stated_ready || analysis.explicit.stated_no_blockers) {
    return false
  }

  // OVERRIDE: If user explicitly asked for next steps, they're not hesitating
  if (analysis.explicit.asked_for_next_steps) {
    return false
  }

  // Explicit hesitation expressed
  if (analysis.explicit.hesitation_expressed) return true

  // Resistance to what was presented
  if (analysis.tensions.resistance_to_hypothesis) return true

  // Low confidence suggests hesitation (but only if no explicit readiness signals)
  if (analysis.signals.confidence === 'low') return true

  return false
}

/**
 * Get the next phase in the closing sequence
 * Danny's v2 model: D = agreement in principle, D2 = agreement to offering, E = facilitate
 */
function getNextClosingPhase(currentPhase: ClosingPhase, alignmentDetected: boolean): ClosingPhase {
  switch (currentPhase) {
    case 'not_started':
      return 'reflect_implication'
    case 'reflect_implication':
      return 'reflect_stakes'
    case 'reflect_stakes':
      return 'name_capability_gap'
    case 'name_capability_gap':
      return 'assert_and_align'
    case 'assert_and_align':
      // Turn D → D2: Only advance to offer_solution if alignment was detected
      return alignmentDetected ? 'offer_solution' : 'assert_and_align'
    case 'offer_solution':
      // Turn D2 → E: NEVER auto-advance here - require explicit offering agreement
      // This is handled by PATH 3 with detectOfferingAgreement(), not general alignment
      return 'offer_solution'
    case 'facilitate':
      return 'facilitate' // Stay here - this is the final phase
    default:
      return currentPhase
  }
}

/**
 * Get the orchestrator action for a closing phase
 */
function getClosingAction(phase: ClosingPhase): OrchestratorDecision['action'] {
  switch (phase) {
    case 'reflect_implication':
      return 'closing_reflect_implication'
    case 'reflect_stakes':
      return 'closing_reflect_stakes'
    case 'name_capability_gap':
      return 'closing_name_capability_gap'
    case 'assert_and_align':
      return 'closing_assert_and_align'
    case 'offer_solution':
      return 'closing_offer_solution'
    case 'facilitate':
      return 'closing_facilitate'
    case 'self_directed_reflect':
      return 'closing_self_directed_reflect'
    case 'self_directed_action':
      return 'closing_self_directed_action'
    default:
      return 'closing_reflect_implication'
  }
}

/**
 * Get the overlay for a closing phase
 */
function getClosingOverlay(phase: ClosingPhase): string {
  switch (phase) {
    case 'reflect_implication':
      return 'closing_reflect_implication'
    case 'reflect_stakes':
      return 'closing_reflect_stakes'
    case 'name_capability_gap':
      return 'closing_name_capability_gap'
    case 'assert_and_align':
      return 'closing_assert_and_align'
    case 'offer_solution':
      return 'closing_offer_solution'
    case 'facilitate':
      return 'closing_facilitate'
    case 'self_directed_reflect':
      return 'closing_self_directed_reflect'
    case 'self_directed_action':
      return 'closing_self_directed_action'
    default:
      return 'closing_reflect_implication'
  }
}

/**
 * Determine if the self-directed close branch should be used
 * Activates for financially constrained or highly depleted users
 * Instead of the 5-turn sales-oriented close, gives a 2-turn empowerment close
 */
function shouldUseSelfDirectedClose(state: ConversationState, analysis: UnifiedAnalysis): boolean {
  return analysis.explicit.financial_constraint
}

/**
 * Detect if user is aligned and ready for fast close
 * Fast-close = user is engaged and accepting, no need for extended closing turns
 *
 * TUNING: This should be triggered fairly easily to avoid dragging out the close.
 * The closing sequence turns A/B/C are somewhat repetitive - fast-close skips to D.
 */
function detectStrongAlignment(analysis: UnifiedAnalysis, effective: EffectiveState): boolean {
  // Fast-close indicators (any of these trigger skip to Turn D):
  // 1. Explicitly stated ready
  // 2. Asked for next steps
  // 3. No explicit blockers + accepting tone (medium/high confidence)
  return (
    (effective.ready_to_close || analysis.explicit.asked_for_next_steps) ||
    (
      !effective.has_blockers &&
      (analysis.signals.confidence === 'high' || analysis.signals.confidence === 'medium') &&
      !analysis.explicit.hesitation_expressed
    )
  )
}

/**
 * Make a closing sequence decision
 * Handles the multi-turn closing flow
 *
 * Danny's v2 model flow:
 *   Turn A: Reflect implication
 *   Turn B: Reflect stakes
 *   Turn C: Name capability gap
 *   Turn D: Assert and align (GATE 1: Agreement in principle)
 *   Turn D2: Offer solution (GATE 2: Agreement to our offering)
 *   Turn E: Facilitate (show booking)
 *
 * FAST CLOSE: Can skip A, B, C for strongly aligned users
 * BUT NEVER skip D → D2 → E - these are the key agreement gates
 *
 * Decision flow:
 * 1. Check for strong alignment (fast close path)
 * 2. Handle Turn D (agreement in principle gate)
 * 3. Handle Turn D2 (agreement to offering gate)
 * 4. Handle Turn E completion (transition to handoff)
 * 5. Default: Advance through A, B, C
 */
function makeClosingDecision(
  state: ConversationState,
  analysis: UnifiedAnalysis,
  effective: EffectiveState
): OrchestratorDecision {
  const closingState = state.closing_sequence
  const currentPhase = closingState.phase

  // === Signal Detection ===
  const alignmentDetected = detectAlignmentFromAnalysis(analysis)
  const hesitationDetected = detectHesitationFromAnalysis(analysis)
  const strongAlignment = detectStrongAlignment(analysis, effective)

  console.log('[ClosingSequence] Current phase:', currentPhase)
  console.log('[ClosingSequence] Alignment detected:', alignmentDetected)
  console.log('[ClosingSequence] Strong alignment:', strongAlignment)
  console.log('[ClosingSequence] Hesitation detected:', hesitationDetected)

  // === PATH 0: Self-Directed Close (for financially constrained / depleted users) ===
  // Instead of the 5-turn "you need external help → here's our free call" sequence,
  // this branch summarizes their insight (1 turn) then helps them commit to a next step (1 turn)
  if (shouldUseSelfDirectedClose(state, analysis)) {
    if (currentPhase === 'not_started') {
      console.log('[ClosingSequence] SELF-DIRECTED CLOSE - entering reflect phase (financial/depletion constraint)')
      return {
        action: 'closing_self_directed_reflect',
        reasoning: 'Self-directed close: User has financial constraints or is depleted - summarizing insight instead of sales funnel',
        prompt_overlays: ['closing_self_directed_reflect'],
        available_tools: [],
        confidence: 0.92
      }
    }
    if (currentPhase === 'self_directed_reflect') {
      console.log('[ClosingSequence] SELF-DIRECTED CLOSE - advancing to action phase')
      return {
        action: 'closing_self_directed_action',
        reasoning: 'Self-directed close: Moving to concrete next step commitment',
        prompt_overlays: ['closing_self_directed_action'],
        available_tools: [],
        confidence: 0.92
      }
    }
    if (currentPhase === 'self_directed_action') {
      console.log('[ClosingSequence] SELF-DIRECTED CLOSE - complete')
      // Mark arc complete and transition to handoff
      return {
        action: 'complete_with_handoff',
        reasoning: 'Self-directed close complete - user has committed to a next step',
        prompt_overlays: ['closing_handoff'],
        available_tools: [],
        confidence: 0.95
      }
    }
  }

  // === PATH 1: Fast Close (skip A, B, C) ===
  // For strongly aligned users, skip directly to Turn D
  // NEVER skip D → D2 → E - these are the key agreement gates
  if (strongAlignment && (currentPhase === 'not_started' || currentPhase === 'reflect_implication')) {
    console.log('[ClosingSequence] FAST CLOSE - skipping to assert_and_align (Turn D)')
    return {
      action: 'closing_assert_and_align',
      reasoning: 'Fast close: User strongly aligned - skipping to Turn D (agreement in principle)',
      prompt_overlays: ['closing_assert_and_align'],
      available_tools: [],
      confidence: 0.92
    }
  }

  // === PATH 2: Turn D - Agreement in Principle Gate ===
  // User must agree they need external help before we offer our solution
  if (currentPhase === 'assert_and_align') {
    if (alignmentDetected) {
      // They agreed they need help → advance to Turn D2 (offer our solution)
      console.log('[ClosingSequence] Turn D alignment detected - advancing to Turn D2 (offer_solution)')
      return {
        action: 'closing_offer_solution',
        reasoning: 'User agreed in principle to needing help - now offering our specific solution',
        prompt_overlays: ['closing_offer_solution'],
        available_tools: [],
        confidence: 0.9
      }
    } else if (hesitationDetected) {
      // They hesitated - explore rather than push
      console.log('[ClosingSequence] Turn D hesitation - exploring')
      return {
        action: 'closing_assert_and_align',
        reasoning: 'User expressing hesitation about needing help - exploring rather than pushing',
        prompt_overlays: ['closing_assert_and_align'],
        available_tools: [],
        confidence: 0.85
      }
    }
  }

  // === PATH 3: Turn D2 - Agreement to Offering Gate ===
  // User must EXPLICITLY agree to our specific offering (free call) before facilitation
  // Use stricter detection here - general confidence ≠ agreement to our call
  if (currentPhase === 'offer_solution') {
    const offeringAgreed = detectOfferingAgreement(analysis)
    console.log('[ClosingSequence] Offering agreement detected:', offeringAgreed)

    if (offeringAgreed) {
      // They explicitly agreed to our offering → advance to Turn E (facilitate)
      console.log('[ClosingSequence] Turn D2 explicit agreement - advancing to Turn E (facilitate)')
      return {
        action: 'closing_facilitate',
        reasoning: 'User explicitly agreed to our offering - showing booking/summary',
        prompt_overlays: ['closing_facilitate'],
        available_tools: [],
        confidence: 0.92
      }
    } else if (analysis.explicit.declined_offering) {
      // They explicitly declined our offering → graceful close
      // Advance to facilitate so closing_arc_complete = true (set in orchestrator)
      // but alignment_detected will remain false → triggers save_progress component
      console.log('[ClosingSequence] Turn D2 DECLINE detected - graceful close')
      return {
        action: 'closing_facilitate',
        reasoning: 'User explicitly declined offering - closing gracefully without pressure',
        prompt_overlays: ['closing_facilitate'],
        available_tools: [],
        confidence: 0.9
      }
    } else if (hesitationDetected) {
      // They hesitated about our offering - could be objection
      // For now, stay in D2 to explore, but could trigger graceful_close if it's a clear objection
      console.log('[ClosingSequence] Turn D2 hesitation - exploring or graceful close')
      return {
        action: 'closing_offer_solution',
        reasoning: 'User hesitant about our offering - exploring their concerns',
        prompt_overlays: ['closing_offer_solution'],
        available_tools: [],
        confidence: 0.8
      }
    }
  }

  // === PATH 4: Turn E Completion ===
  // After Turn E has been delivered, transition to handoff
  if (currentPhase === 'facilitate' && closingState.facilitation_offered) {
    console.log('[ClosingSequence] Facilitation complete - transitioning to handoff')
    return {
      action: 'complete_with_handoff',
      reasoning: 'Closing sequence complete - user has received facilitation',
      prompt_overlays: ['closing_handoff'],
      available_tools: [],
      confidence: 0.95
    }
  }

  // === PATH 5: Default Progression (A → B → C) ===
  // Standard path through early closing turns
  const nextPhase = getNextClosingPhase(currentPhase, alignmentDetected)
  const action = getClosingAction(nextPhase)
  const overlay = getClosingOverlay(nextPhase)

  console.log('[ClosingSequence] Advancing to phase:', nextPhase)

  return {
    action,
    reasoning: `Closing sequence: ${currentPhase} → ${nextPhase}`,
    prompt_overlays: [overlay],
    available_tools: [],
    confidence: 0.9
  }
}

// =============================================================================
// END CLOSING SEQUENCE LOGIC
// =============================================================================

// Inlined helper functions that use UnifiedAnalysis

function shouldReflectInsightFromAnalysis(analysis: UnifiedAnalysis, state: ConversationState): boolean {
  // Don't reflect too early
  if (state.turns_total < 3) return false
  // Don't reflect during context phase
  if (state.phase === 'context') return false
  // Don't reflect during containment cooldown
  if (state.turns_since_containment < 2) return false
  // Stop reflecting after enough milestones
  if (state.learner_state.learning_milestones >= 3) return false
  // Require breakthrough + ownership
  return analysis.insights.breakthrough_detected && analysis.insights.ownership_language
}

function detectContradictionFromAnalysis(analysis: UnifiedAnalysis, state: ConversationState): { shouldSurface: boolean; type: string } {
  if (!analysis.tensions.contradiction_detected) {
    return { shouldSurface: false, type: '' }
  }
  // Don't surface if already surfaced recently
  if (state.learner_state.contradictions_surfaced >= 2) {
    return { shouldSurface: false, type: '' }
  }
  return { shouldSurface: true, type: 'internal_contradiction' }
}

function shouldBuildCriteriaFromAnalysis(state: ConversationState, analysis: UnifiedAnalysis): boolean {
  // Only build criteria if we have a strong hypothesis and haven't done it yet
  if (state.recursive_state.shared_criteria_established) return false
  if (!state.constraint_hypothesis) return false
  if (state.hypothesis_confidence < 0.7) return false
  if (state.turns_total < 5) return false
  return true
}

function detectDiagnosisReadinessFromAnalysis(analysis: UnifiedAnalysis, state: ConversationState): { ready: boolean; action: string; confidence: number; constraint: ConstraintCategory | null } {
  // Check if we're ready for diagnosis
  const hasHypothesis = state.constraint_hypothesis !== null
  const highConfidence = state.hypothesis_confidence >= 0.8
  const validated = state.hypothesis_validated

  if (!hasHypothesis) {
    return { ready: false, action: 'continue_exploration', confidence: 0, constraint: null }
  }

  if (validated && highConfidence) {
    return { ready: true, action: 'transition_to_diagnosis', confidence: state.hypothesis_confidence, constraint: state.constraint_hypothesis }
  }

  if (highConfidence && !validated) {
    return { ready: false, action: 'request_validation', confidence: state.hypothesis_confidence, constraint: state.constraint_hypothesis }
  }

  return { ready: false, action: 'continue_exploration', confidence: state.hypothesis_confidence, constraint: state.constraint_hypothesis }
}

function needsValidationFromAnalysis(analysis: UnifiedAnalysis, state: ConversationState): boolean {
  // Need validation if we have hypothesis but not validated
  if (!state.constraint_hypothesis) return false
  if (state.hypothesis_validated) return false
  if (state.hypothesis_confidence < 0.6) return false
  return true
}

function shouldDeepenFromAnalysis(state: ConversationState, analysis: UnifiedAnalysis): boolean {
  // Need to deepen if clarity is low despite having hypothesis
  if (!state.constraint_hypothesis) return false
  if (analysis.signals.clarity === 'high') return false
  if (state.turns_in_phase < 3) return false
  return analysis.signals.clarity === 'low' || analysis.signals.clarity === 'medium'
}

function shouldAccelerateFromAnalysis(state: ConversationState, analysis: UnifiedAnalysis): { accelerate: boolean; reason: string } {
  // Accelerate if stuck in exploration too long
  if (state.turns_total >= 15 && state.phase === 'exploration') {
    return { accelerate: true, reason: 'Long exploration phase' }
  }
  // Accelerate if high ground coverage
  if (state.conversation_memory.ground_covered_score >= 0.7) {
    return { accelerate: true, reason: 'High ground coverage' }
  }
  return { accelerate: false, reason: '' }
}

/**
 * Core decision engine
 * Determines what the orchestrator should do next
 *
 * KEY CHANGE: Now uses EffectiveState which has explicit overrides applied
 * - effective.ready_to_close = user explicitly ready, bypasses explore_readiness
 * - effective.capacity = explicit statements override inferred capacity
 *
 * Decision priority (sequential numbering):
 * 0. Turn limit (50 turns max)
 * 1. Containment (if overwhelm detected)
 * 2. Continue closing sequence (if already in one)
 * 3. Reflect Insight (if breakthrough moment detected)
 * 4. Surface Contradiction (if tensions present)
 * 5. Build Criteria (establish shared success definition)
 * 6. Stress Test (reality-check hypothesis before diagnosis)
 * 7. Pre-Commitment Check (final readiness gate)
 * 8. Pre-diagnosis readiness exploration
 * 9. Request Diagnosis Consent
 * 10. Diagnosis (if criteria met + consent confirmed)
 * 11. Check Blockers (after diagnosis)
 * 12. Explore Readiness (if NOT explicitly ready)
 * 13. Enter Closing Sequence (first entry)
 * 14. Legacy fallback handoff
 * 15. Safety net (30+ turns)
 * 16-20. Validation, Cross-mapping, Deepen, Ground coverage, Acceleration
 * 21. Explore (default)
 */
// Maximum conversation turns before forcing graceful close
const MAX_CONVERSATION_TURNS = 50

export function makeDecision(
  state: ConversationState,
  analysis: UnifiedAnalysis,
  effective: EffectiveState
): OrchestratorDecision {

  // Priority 0: Turn limit reached - gracefully close the conversation
  // This protects against runaway conversations and excessive API costs
  if (state.turns_total >= MAX_CONVERSATION_TURNS) {
    console.log(`[DecisionEngine] TURN LIMIT REACHED (${state.turns_total}/${MAX_CONVERSATION_TURNS}) - forcing graceful close`)
    return {
      action: 'complete_with_handoff',
      reasoning: `Conversation reached ${MAX_CONVERSATION_TURNS} turns - gracefully concluding to respect time`,
      prompt_overlays: ['closing_handoff', 'turn_limit_close'],
      available_tools: [],
      confidence: 1.0
    }
  }

  // Priority 0.5: Exit intent — user is trying to leave the conversation
  // This fires regardless of frustration level. When someone says "goodbye" or "we're done", respect it.
  if (analysis.exit_intent) {
    const overlay = state.relationship.process_frustration === 'hostile' ||
                    state.relationship.process_frustration === 'significant'
      ? 'frustration_close'
      : 'graceful_exit'
    console.log(`[DecisionEngine] EXIT INTENT detected — closing conversation gracefully (overlay: ${overlay})`)
    return {
      action: 'complete_with_handoff',
      reasoning: 'User is ending the conversation — respecting their exit intent',
      prompt_overlays: [overlay],
      available_tools: [],
      confidence: 0.95,
    }
  }

  // Priority 1: Containment (if effective overwhelm detected)
  // This is BEFORE closing sequence check so containment can interrupt closing if user is overwhelmed
  if (effective.overwhelm) {
    return {
      action: 'contain',
      reasoning: 'Emotional overwhelm detected - pause exploration and validate feelings',
      prompt_overlays: ['containment'],
      available_tools: [],
      confidence: 0.9
    }
  }

  // Priority 1.2: Rudeness boundary (hostile process frustration)
  if (state.relationship.process_frustration === 'hostile' && !state.relationship.boundary_set) {
    return {
      action: 'set_boundary',
      reasoning: 'User is hostile toward the process/advisor — setting firm boundary',
      prompt_overlays: ['rudeness_boundary'],
      available_tools: [],
      confidence: 0.95,
    }
  }

  // Priority 1.2b: Post-boundary hostility — close conversation
  if (state.relationship.process_frustration === 'hostile' && state.relationship.boundary_set) {
    return {
      action: 'complete_with_handoff',
      reasoning: 'User remains hostile after boundary was set — closing conversation gracefully',
      prompt_overlays: ['boundary_close'],
      available_tools: [],
      confidence: 0.95,
    }
  }

  // Priority 1.3: Process frustration (significant — repair attempt)
  // After 2 acknowledgments without improvement, escalate to graceful close instead of looping
  if (state.relationship.process_frustration === 'significant') {
    const frustAckCount = state.relationship.frustration_acknowledged_count ?? 0
    if (frustAckCount >= 3) {
      console.log(`[DecisionEngine] Frustration acknowledged ${frustAckCount} times without improvement — graceful close`)
      return {
        action: 'complete_with_handoff',
        reasoning: 'Sustained significant frustration after multiple repair attempts — closing gracefully',
        prompt_overlays: ['frustration_close'],
        available_tools: [],
        confidence: 0.9,
      }
    }
    return {
      action: 'acknowledge_frustration',
      reasoning: 'User is significantly frustrated with the process — acknowledging and adapting',
      prompt_overlays: ['frustration_repair'],
      available_tools: [],
      confidence: 0.9,
    }
  }

  // Priority 1.4: Sustained low engagement exit
  // After 5+ consecutive low-effort turns with no trust building, offer graceful exit
  if (
    state.low_effort_tracking.consecutive_low_effort_turns >= 5 &&
    state.relationship.trust_level === 'establishing' &&
    state.relationship.engagement !== 'high'
  ) {
    console.log(`[DecisionEngine] SUSTAINED LOW ENGAGEMENT: ${state.low_effort_tracking.consecutive_low_effort_turns} low-effort turns — graceful exit`)
    return {
      action: 'complete_with_handoff',
      reasoning: 'Sustained low engagement with no trust building — offering graceful exit',
      prompt_overlays: ['low_engagement_exit'],
      available_tools: [],
      confidence: 0.9,
    }
  }

  // Priority 1.5: Tactical Drift Redirect
  // Catches sustained tactical coaching (3+ consecutive turns of logistics)
  if (state.closing_sequence.phase === 'not_started') {  // Don't interrupt closing
    const td = state.tactical_drift || { consecutive_tactical_turns: 0, total_tactical_turns: 0, redirect_count: 0, last_redirect_turn: 0 }
    const turnsSinceRedirect = state.turns_total - td.last_redirect_turn
    const sustainedDrift = td.consecutive_tactical_turns >= 3 && turnsSinceRedirect >= 4
    const accumulatedDrift = td.total_tactical_turns >= 8 && turnsSinceRedirect >= 4

    if (analysis.tactical?.is_tactical_request && (sustainedDrift || accumulatedDrift)) {
      // Cap at 2 redirects per conversation — after that, let it go
      if (td.redirect_count < 2) {
        console.log(`[DecisionEngine] Tactical drift detected: ${td.consecutive_tactical_turns} consecutive, ${td.total_tactical_turns} total`)
        return {
          action: 'redirect_from_tactical',
          reasoning: `User has spent ${td.consecutive_tactical_turns} consecutive turns on tactical details - redirecting to diagnostic exploration`,
          prompt_overlays: ['tactical_redirect'],
          available_tools: [],
          confidence: 0.9
        }
      }
    }
  }

  // Priority 1.7: Hypothesis Pivot (user has resisted 2+ times)
  if (state.hypothesis_resistance_count >= 2 &&
      analysis.tensions.resistance_to_hypothesis &&
      state.closing_sequence.phase === 'not_started') {
    console.log(`[DecisionEngine] Hypothesis pivot: user resisted ${state.hypothesis_resistance_count} times`)
    return {
      action: 'explore',
      reasoning: `User has pushed back on hypothesis ${state.hypothesis_resistance_count} times - pivoting to explore alternative explanations`,
      prompt_overlays: ['hypothesis_pivot'],
      available_tools: [],
      confidence: 0.85
    }
  }

  // Priority 2: CONTINUE CLOSING SEQUENCE (if already in one)
  // This comes AFTER containment so overwhelming emotions can interrupt closing
  // Once we've entered the closing sequence, we should stay in it
  if (state.closing_sequence.phase !== 'not_started') {
    console.log('[DecisionEngine] Continuing closing sequence (phase:', state.closing_sequence.phase + ')')
    return makeClosingDecision(state, analysis, effective)
  }

  // Priority 3: Reflect Insight (if breakthrough moment detected)
  // NOTE: Priorities 0-2 handle: turn limit, containment, continue closing sequence
  const skipReflection = shouldSkipReflection(state.variety_tracker, state.turns_total)
  if (shouldReflectInsightFromAnalysis(analysis, state) && !skipReflection) {
    return {
      action: 'reflect_insight',
      reasoning: 'Breakthrough insight detected - mirror back their learning to make it visible',
      prompt_overlays: ['reflect_insight'],
      available_tools: [],
      confidence: 0.85
    }
  }

  // Priority 4: Surface Contradiction (if tensions present)
  // NOTE: If in closing sequence, we already returned at Priority 2 - no need to check here
  const contradictionCheck = detectContradictionFromAnalysis(analysis, state)
  if (contradictionCheck.shouldSurface) {
    return {
      action: 'surface_contradiction',
      reasoning: `Contradiction detected (${contradictionCheck.type}) - surface tension to deepen understanding`,
      prompt_overlays: ['surface_contradiction'],
      available_tools: [],
      confidence: 0.8
    }
  }

  // Priority 4.5: ACCELERATION for explicit next-steps requests + high ground coverage
  // When user is explicitly asking for next steps and we're covering the same ground,
  // accelerate toward diagnosis rather than continuing exploration
  const groundCoverage = state.conversation_memory.ground_covered_score
  const userWantsNextSteps = analysis.explicit.asked_for_next_steps || analysis.explicit.stated_ready
  const hypothesisIsStrong = state.constraint_hypothesis && state.hypothesis_confidence >= 0.8

  if (userWantsNextSteps && groundCoverage >= 0.5 && hypothesisIsStrong) {
    console.log(`[DecisionEngine] ACCELERATION: User wants next steps + ground coverage ${groundCoverage.toFixed(2)}`)

    // If not validated, validate now
    if (!state.hypothesis_validated) {
      return {
        action: 'validate',
        reasoning: `Accelerating: User explicitly wants next steps (ground coverage: ${(groundCoverage * 100).toFixed(0)}%)`,
        prompt_overlays: ['validation'],
        available_tools: [],
        confidence: 0.85,
        hypothesis_to_validate: state.constraint_hypothesis || undefined
      }
    }

    // If validated but no consent, request consent
    if (!state.consent_state.diagnosis_requested) {
      return {
        action: 'request_diagnosis_consent',
        reasoning: `Accelerating: User explicitly wants next steps, hypothesis validated`,
        prompt_overlays: ['diagnosis_consent'],
        available_tools: [],
        confidence: 0.9
      }
    }

    // If consent given but diagnosis not delivered, deliver it
    if (state.consent_state.diagnosis_confirmed && !state.diagnosis_delivered) {
      return {
        action: 'diagnose',
        reasoning: `Accelerating: User explicitly ready, consent confirmed`,
        prompt_overlays: ['diagnosis_delivery'],
        available_tools: [],
        confidence: state.hypothesis_confidence
      }
    }
  }

  // Priority 5: Build Criteria (establish shared success definition)
  if (shouldBuildCriteriaFromAnalysis(state, analysis)) {
    return {
      action: 'build_criteria',
      reasoning: 'Strong hypothesis forming - establish shared criteria for what "success" looks like',
      prompt_overlays: ['build_criteria'],
      available_tools: [],
      confidence: 0.75
    }
  }

  // Priority 6: Stress Test (reality-check hypothesis before diagnosis)
  if (
    state.constraint_hypothesis &&
    state.hypothesis_validated &&
    !state.learner_state.stress_test_passed &&
    state.turns_since_validation >= 1
  ) {
    return {
      action: 'stress_test',
      reasoning: 'Hypothesis validated - now stress test against reality before finalizing',
      prompt_overlays: ['stress_test'],
      available_tools: [],
      confidence: 0.8
    }
  }

  // Priority 7: Pre-Commitment Check (final readiness gate before diagnosis)
  const shouldRunPreCommitment = state.learner_state.stress_test_passed && !state.recursive_state.pre_commitment_checked
  if (shouldRunPreCommitment) {
    return {
      action: 'pre_commitment_check',
      reasoning: 'Stress test passed - check readiness and surface any blockers before diagnosis',
      prompt_overlays: ['pre_commitment'],
      available_tools: [],
      confidence: 0.85
    }
  }

  // Priority 8: PRE-DIAGNOSIS READINESS EXPLORATION
  // Explore readiness BEFORE requesting diagnosis consent when:
  // - We have a validated hypothesis
  // - Stress test passed
  // - Pre-commitment checked
  // - Readiness has low dimensions
  // - User hasn't explicitly stated they're ready
  // This ensures we don't rush to diagnosis with a hesitant user
  const { clarity: clarityCheck, confidence: confidenceCheck, capacity: capacityCheck } = state.readiness
  const hasLowReadinessForPreDiagnosis =
    (clarityCheck === 'low' || confidenceCheck === 'low' || capacityCheck === 'low')
  const preDiagnosisReadinessExploration =
    state.hypothesis_validated &&
    state.learner_state.stress_test_passed &&
    state.recursive_state.pre_commitment_checked &&
    !state.diagnosis_delivered &&
    !state.consent_state.diagnosis_requested &&
    hasLowReadinessForPreDiagnosis &&
    !effective.ready_to_close &&
    state.readiness_check.turns_exploring_readiness < 2  // Allow 1-2 turns of exploration

  if (preDiagnosisReadinessExploration) {
    const lowestDim =
      clarityCheck === 'low' ? 'clarity' :
      confidenceCheck === 'low' ? 'confidence' : 'capacity'

    console.log(`[DecisionEngine] PRE-DIAGNOSIS READINESS: Exploring ${lowestDim} before diagnosis consent`)
    return {
      action: 'explore_readiness',
      reasoning: `Pre-diagnosis readiness check: ${lowestDim} is low - exploring before requesting diagnosis consent`,
      prompt_overlays: ['explore_readiness'],
      available_tools: [],
      confidence: 0.82,
      focus_area: lowestDim
    }
  }

  // Priority 9: Request Diagnosis Consent (ask permission before sharing diagnosis)
  const diagnosisDecision = detectDiagnosisReadinessFromAnalysis(analysis, state)

  // Check if we're ready to diagnose but haven't asked consent yet
  const diagnosisCriteriaMetForConsent =
    diagnosisDecision.ready &&
    diagnosisDecision.action === 'transition_to_diagnosis' &&
    (state.learner_state.stress_test_passed || state.turns_total >= 15) &&
    (state.recursive_state.pre_commitment_checked || state.turns_total >= 15)

  if (diagnosisCriteriaMetForConsent && !state.consent_state.diagnosis_requested) {
    return {
      action: 'request_diagnosis_consent',
      reasoning: 'Diagnosis criteria met - requesting explicit consent before sharing diagnosis',
      prompt_overlays: ['diagnosis_consent'],
      available_tools: [],
      confidence: 0.9
    }
  }

  // Priority 10: Diagnosis ready (criteria met + consent confirmed + NOT already delivered)
  // Must check !diagnosis_delivered to prevent looping - diagnose should only fire once
  const diagnosisReady =
    diagnosisCriteriaMetForConsent &&
    state.consent_state.diagnosis_confirmed &&
    !state.diagnosis_delivered

  if (diagnosisReady) {
    return {
      action: 'diagnose',
      reasoning: `Diagnosis criteria met + consent confirmed (${diagnosisDecision.confidence.toFixed(2)} confidence) - sharing constraint diagnosis: ${diagnosisDecision.constraint}`,
      prompt_overlays: ['diagnosis_delivery'],
      available_tools: [],
      confidence: diagnosisDecision.confidence
    }
  }

  // Priority 11: Check Blockers (after diagnosis delivered, before closing)
  // Uses diagnosis_delivered flag (monotonic) instead of hypothesis_validated (can reset)
  // This ensures we progress to check_blockers after diagnose, not loop back
  // OPTIMIZATION: Skip blocker check if user has explicitly stated no blockers
  const userExplicitlyNoBlockers = !effective.has_blockers && analysis.explicit.stated_no_blockers
  if (
    state.diagnosis_delivered &&
    state.consent_state.diagnosis_confirmed &&
    !state.readiness_check.blockers_checked &&
    !userExplicitlyNoBlockers  // Skip if user already said no blockers
  ) {
    return {
      action: 'check_blockers',
      reasoning: 'Diagnosis delivered - checking for blockers before handoff to summary',
      prompt_overlays: ['blocker_check'],
      available_tools: [],
      confidence: 0.95  // High confidence - this MUST run after diagnosis
    }
  }

  // If user explicitly stated no blockers, mark as checked and continue
  if (userExplicitlyNoBlockers && !state.readiness_check.blockers_checked) {
    state.readiness_check.blockers_checked = true
    console.log('[DecisionEngine] Skipping blocker check - user explicitly stated no blockers')
  }

  // Priority 12: Explore Medium Readiness (before closing, try to deepen readiness)
  // KEY CHANGE: Only trigger if user has NOT explicitly stated they're ready
  // The effective.ready_to_close check above (Priority 2) handles explicit readiness
  const { clarity, confidence, capacity } = state.readiness
  const hasMediumReadiness =
    clarity === 'medium' || confidence === 'medium' || capacity === 'medium'
  const hasLowReadiness =
    clarity === 'low' || confidence === 'low' || capacity === 'low'
  const hasHighReadinessOverall =
    clarity === 'high' && confidence === 'high' && capacity !== 'low'
  // TUNING: Reduced from 3 to 1 - readiness exploration was dragging out the transition
  const maxReadinessExplorationTurns = 1

  // Trigger readiness exploration when:
  // - Diagnosis has been delivered
  // - Readiness is mixed (medium) or has low dimensions
  // - User has NOT explicitly stated they're ready (key change!)
  // - We haven't exhausted exploration turns
  // - Blockers have been checked
  const shouldExploreReadiness =
    state.diagnosis_delivered &&
    (hasMediumReadiness || hasLowReadiness) &&
    !hasHighReadinessOverall &&
    !effective.ready_to_close &&  // KEY: Don't explore if user explicitly ready
    state.readiness_check.turns_exploring_readiness < maxReadinessExplorationTurns &&
    state.readiness_check.blockers_checked

  if (shouldExploreReadiness) {
    const lowestDimension =
      clarity === 'low' ? 'clarity' :
      confidence === 'low' ? 'confidence' :
      capacity === 'low' ? 'capacity' :
      clarity === 'medium' ? 'clarity' :
      confidence === 'medium' ? 'confidence' : 'capacity'

    return {
      action: 'explore_readiness',
      reasoning: `Mixed readiness detected (${lowestDimension} is ${state.readiness[lowestDimension]}) - exploring before routing (turn ${state.readiness_check.turns_exploring_readiness + 1}/${maxReadinessExplorationTurns})`,
      prompt_overlays: ['explore_readiness'],
      available_tools: [],
      confidence: 0.85,
      focus_area: lowestDimension
    }
  }

  // Priority 13: ENTER CLOSING SEQUENCE (Danny's enrollment-professional model)
  // Instead of jumping to complete_with_handoff, we enter a 5-turn conversational close
  // Key principle: "The close is not a moment. It is the final phase of the same inquiry."
  // NOTE: If already in closing sequence, we returned at Priority 2 - this is for first entry only
  if (shouldEnterClosingSequence(state)) {
    console.log('[DecisionEngine] Entering closing sequence - starting Turn A')
    return makeClosingDecision(state, analysis, effective)
  }

  // Priority 14: Legacy fallback - Complete with Handoff (if closing sequence somehow bypassed)
  // At this point, phase MUST be 'not_started' (we returned at Priority 2 if in sequence)
  if (
    state.diagnosis_delivered &&
    state.readiness_check.blockers_checked
  ) {
    // This should rarely hit - closing sequence should handle it
    console.log('[DecisionEngine] Legacy complete_with_handoff (closing sequence bypassed)')
    return {
      action: 'complete_with_handoff',
      reasoning: 'Diagnosis delivered and blockers checked - legacy handoff',
      prompt_overlays: ['closing_handoff'],
      available_tools: [],
      confidence: 0.95
    }
  }

  // Priority 15: SAFETY NET - Force completion after 30+ turns with diagnosis delivered
  // Prevents conversations from getting stuck in infinite exploration
  if (
    state.turns_total >= 30 &&
    (state.diagnosis_delivered || state.hypothesis_validated) &&
    (state.phase === 'diagnosis' || state.phase === 'exploration')
  ) {
    console.log(`[DecisionEngine] SAFETY NET: ${state.turns_total} turns with validated hypothesis - forcing completion path`)

    // If blockers not checked, do that first
    if (!state.readiness_check.blockers_checked) {
      return {
        action: 'check_blockers',
        reasoning: `Safety net: ${state.turns_total} turns reached - checking blockers before forced handoff`,
        prompt_overlays: ['blocker_check'],
        available_tools: [],
        confidence: 0.9
      }
    }

    // Otherwise force handoff
    return {
      action: 'complete_with_handoff',
      reasoning: `Safety net: ${state.turns_total} turns reached with validated hypothesis - completing conversation`,
      prompt_overlays: ['closing_handoff'],
      available_tools: [],
      confidence: 0.85
    }
  }

  // Priority 16: Validation needed (hypothesis exists but not confirmed)
  // Using state.hypothesis_confidence instead of inference
  const hasStrongHypothesis = state.hypothesis_confidence >= 0.75
  const hasEvidence = analysis.constraint.evidence !== ''
  const turnsInExploration = state.turns_in_phase || 0

  // Efficiency trigger: Strong hypothesis after 6+ turns in exploration
  if (
    hasStrongHypothesis &&
    hasEvidence &&
    turnsInExploration >= 6 &&
    state.phase === 'exploration' &&
    !state.hypothesis_validated
  ) {
    console.log(`[DecisionEngine] EFFICIENCY: Strong hypothesis (${state.hypothesis_confidence.toFixed(2)}) after ${turnsInExploration} turns - pushing to validation`)
    return {
      action: 'validate',
      reasoning: `Strong hypothesis formed with sufficient evidence - validating before further exploration`,
      prompt_overlays: ['validation'],
      available_tools: [],
      confidence: 0.85,
      hypothesis_to_validate: state.constraint_hypothesis || undefined
    }
  }

  if (needsValidationFromAnalysis(analysis, state)) {
    return {
      action: 'validate',
      reasoning: `Hypothesis formed (${state.constraint_hypothesis}) but needs user validation`,
      prompt_overlays: ['validation'],
      available_tools: [],
      confidence: 0.8,
      hypothesis_to_validate: state.constraint_hypothesis || undefined
    }
  }

  // Priority 17: Cross-mapping (check for upstream constraints)
  if (
    shouldAttemptCrossMapping(state.turns_in_phase, state.cross_map_applied) &&
    state.constraint_hypothesis
  ) {
    // Build a minimal inference-like object for cross-mapping compatibility
    const crossMapInference = {
      constraint_hypothesis: {
        category: state.constraint_hypothesis,
        confidence: state.hypothesis_confidence,
        evidence: analysis.constraint.evidence ? [analysis.constraint.evidence] : []
      },
      sub_dimension: { dimension: null, confidence: 0 },
      diagnosis_ready: { ready: false, reasons: [], blockers: [] },
      validation_needed: false,
      hypothesis_validated: state.hypothesis_validated
    }
    const crossMapSignals = {
      clarity_level: analysis.signals.clarity,
      confidence_level: analysis.signals.confidence,
      capacity_signals: [],
      emotional_markers: [],
      response_length: 0,
      contradiction_detected: analysis.tensions.contradiction_detected,
      overwhelm_detected: analysis.signals.overwhelm,
      validation_seeking: false,
      ownership_language: analysis.insights.ownership_language,
      insight_articulated: analysis.insights.breakthrough_detected,
      breakthrough_language: analysis.insights.insight_phrases,
      contradiction_present: analysis.tensions.contradiction_detected,
      resistance_to_hypothesis: analysis.tensions.resistance_to_hypothesis,
      stress_test_passed: analysis.tensions.stress_test_passed,
      blocker_mentioned: effective.has_blockers,
      commitment_language: analysis.explicit.stated_ready,
      positive_emotion_detected: false,
      negative_overwhelm_detected: analysis.signals.overwhelm,
      meta_cognition_detected: analysis.insights.meta_cognition
    }

    const crossMapResult = detectUpstreamConstraint(
      state.constraint_hypothesis,
      crossMapInference,
      crossMapSignals,
      analysis
    )

    if (crossMapResult.should_redirect) {
      return {
        action: 'cross_map',
        reasoning: crossMapResult.reasoning,
        prompt_overlays: ['cross_map'],
        available_tools: [],
        confidence: crossMapResult.confidence,
        redirect_to: crossMapResult.upstream_category || undefined,
        focus_area: crossMapResult.upstream_category
      }
    }
  }

  // Priority 18: Deepen (need more information despite hypothesis)
  if (shouldDeepenFromAnalysis(state, analysis)) {
    return {
      action: 'deepen',
      reasoning: 'Hypothesis exists but need more depth before diagnosis',
      prompt_overlays: ['depth_inquiry'],
      available_tools: [],
      confidence: 0.7,
      focus_area: null
    }
  }

  // Priority 19: High ground coverage - force progression when covering same territory
  const groundCoveredScore = state.conversation_memory.ground_covered_score
  const highGroundCovered = groundCoveredScore >= 0.6
  const hasHypothesisNow = state.constraint_hypothesis !== null

  if (highGroundCovered && hasHypothesisNow && state.phase === 'exploration') {
    if (!state.hypothesis_validated) {
      console.log(`[DecisionEngine] HIGH GROUND COVERAGE (${groundCoveredScore.toFixed(2)}) - forcing validation`)
      return {
        action: 'validate',
        reasoning: `High topic coverage detected (${(groundCoveredScore * 100).toFixed(0)}%) - validating hypothesis to avoid circular exploration`,
        prompt_overlays: ['validation'],
        available_tools: [],
        confidence: 0.8,
        hypothesis_to_validate: state.constraint_hypothesis || undefined
      }
    }
    if (state.hypothesis_validated && !state.consent_state.diagnosis_requested) {
      console.log(`[DecisionEngine] HIGH GROUND COVERAGE (${groundCoveredScore.toFixed(2)}) + validated - pushing toward diagnosis consent`)
      return {
        action: 'request_diagnosis_consent',
        reasoning: `High topic coverage + validated hypothesis - requesting consent to avoid further circular exploration`,
        prompt_overlays: ['diagnosis_consent'],
        available_tools: [],
        confidence: 0.85
      }
    }
  }

  // Priority 20: Acceleration check (force validation when exploration is stuck)
  const accelerationResult = shouldAccelerateFromAnalysis(state, analysis)
  if (accelerationResult.accelerate && state.phase === 'exploration') {
    if (state.constraint_hypothesis && !state.hypothesis_validated) {
      console.log('[DecisionEngine] ACCELERATION:', accelerationResult.reason)
      return {
        action: 'validate',
        reasoning: `Acceleration triggered: ${accelerationResult.reason}`,
        prompt_overlays: ['validation'],
        available_tools: [],
        confidence: 0.8,
        hypothesis_to_validate: state.constraint_hypothesis
      }
    }
  }

  // Priority 20.4: Surface deflection probe (go one layer deeper)
  // When user gives a plausible but shallow explanation, probe gently instead of accepting
  // Only fires once — if we already probed, accept the surface answer and move on
  const lastAction = state.last_action
  if (
    analysis.engagement.surface_deflection &&
    !analysis.engagement.low_effort &&
    lastAction !== 'probe_deeper' &&
    state.phase !== 'closing' &&
    state.phase !== 'complete'
  ) {
    console.log('[DecisionEngine] Surface deflection detected - probing deeper')
    return {
      action: 'probe_deeper',
      reasoning: 'User gave a surface-level explanation that may mask a deeper issue - probing gently',
      prompt_overlays: ['probe_deeper'],
      available_tools: [],
      confidence: 0.75,
      focus_area: null
    }
  }

  // Priority 20.5: Low-effort pushback (gently ask for more depth)
  // Triggers after 1+ consecutive low-effort turns, up to 3 times per conversation with escalation
  const pushbackCount = state.low_effort_tracking.pushback_count ?? 0
  if (
    state.low_effort_tracking.consecutive_low_effort_turns >= 1 &&
    pushbackCount < 3 &&
    state.relationship.disposition !== 'direct_pragmatist' &&  // concise is their style
    state.phase !== 'closing' &&
    state.phase !== 'complete'
  ) {
    // Escalating overlay: 1st = gentle reframe, 2nd = offer options, 3rd = meta-acknowledgment
    const overlayKey = pushbackCount === 0 ? 'low_effort_pushback'
      : pushbackCount === 1 ? 'low_effort_pushback_2'
      : 'low_effort_pushback_3'
    console.log(`[DecisionEngine] Low-effort pushback #${pushbackCount + 1}: ${state.low_effort_tracking.consecutive_low_effort_turns} consecutive low-effort turns`)
    return {
      action: 'push_back_on_low_effort',
      reasoning: `User has given ${state.low_effort_tracking.consecutive_low_effort_turns} consecutive low-effort responses (pushback #${pushbackCount + 1})`,
      prompt_overlays: [overlayKey],
      available_tools: [],
      confidence: 0.8,
      focus_area: null
    }
  }

  // Priority 21: Explore (default - continue gathering context)
  const explorationOverlays = getExplorationOverlaysFromAnalysis(state, analysis)

  return {
    action: 'explore',
    reasoning: 'Continue exploration - gathering context and forming hypothesis',
    prompt_overlays: explorationOverlays,
    available_tools: [],
    confidence: 0.6,
    focus_area: null
  }
}

/**
 * Determine which exploration overlays to use
 * Based on conversation state and analysis
 */
function getExplorationOverlaysFromAnalysis(
  state: ConversationState,
  analysis: UnifiedAnalysis
): string[] {

  const overlays: string[] = []

  // Context phase: use context gathering overlay (turns 1-4)
  if (state.phase === 'context') {
    overlays.push('context_gathering')
    return overlays
  }

  // Exploration phase: use exploration overlays
  overlays.push('exploration')

  // Add complexity overlay if case is complex
  if (state.complexity_level === 'complex') {
    overlays.push('depth_inquiry')
  }

  // Add hypothesis guidance if forming — trust gate: only if trust is at least "building"
  if (state.constraint_hypothesis && state.hypothesis_confidence > 0.5) {
    if (state.relationship.trust_level !== 'establishing') {
      overlays.push('hypothesis_forming')
    }
    // If trust is still establishing, stay in pure exploration — no reframing
  }

  // Disposition-adapted style
  if (state.relationship.disposition === 'direct_pragmatist') {
    overlays.push('direct_communication_style')
  }
  if (state.relationship.disposition === 'skeptical_evaluator') {
    overlays.push('skeptical_user_style')
  }
  if (state.relationship.disposition === 'emotionally_processing') {
    overlays.push('emotional_processing_style')
  }

  // Mild frustration awareness (doesn't interrupt flow, just makes Mira more careful)
  if (state.relationship.process_frustration === 'mild') {
    overlays.push('frustration_aware')
  }

  // Trust repair (if trust is damaged but not hostile)
  if (state.relationship.trust_level === 'damaged' && state.relationship.process_frustration !== 'hostile') {
    overlays.push('trust_repair')
  }

  return overlays
}

/**
 * Determine if phase should transition
 * This is for explicit phase changes (context → exploration → diagnosis)
 */
export function shouldTransitionPhase(
  currentPhase: string,
  state: ConversationState,
  decision: OrchestratorDecision
): boolean {

  switch (currentPhase) {
    case 'context':
      // Transition to exploration after 4-5 turns (gather background thoroughly)
      return state.turns_in_phase >= 4

    case 'exploration':
      // Transition to diagnosis when ready
      return decision.action === 'diagnose'

    case 'diagnosis':
      // Transition to complete when handoff fires (blocker check done)
      return decision.action === 'complete_with_handoff'

    default:
      return false
  }
}

/**
 * Get next phase
 */
export function getNextPhase(currentPhase: string): string {
  switch (currentPhase) {
    case 'context':
      return 'exploration'
    case 'exploration':
      return 'diagnosis'
    case 'diagnosis':
      return 'complete'
    default:
      return currentPhase
  }
}
