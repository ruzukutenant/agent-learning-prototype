// Core TypeScript types for orchestration prototype

// File attachment type for images/PDFs
export interface MessageAttachment {
  url: string
  type: 'image' | 'pdf'
  name: string
}

export type ConstraintCategory = 'strategy' | 'execution' | 'psychology'
export type Phase = 'context' | 'exploration' | 'diagnosis' | 'closing' | 'complete'
export type ReadinessLevel = 'low' | 'medium' | 'high'

// New closing sequence phases (multi-turn conversational close)
export type ClosingPhase =
  | 'not_started'
  | 'reflect_implication'    // Turn A: Reflect diagnosis with structural implication
  | 'reflect_stakes'         // Turn B: Mirror back consequences they already named
  | 'name_capability_gap'    // Turn C: Name what's missing (mechanical, not motivational)
  | 'assert_and_align'       // Turn D: Get agreement in principle (need external help)
  | 'offer_solution'         // Turn D2: Offer our specific solution (free call)
  | 'facilitate'             // Turn E: Lay out the path (only after agreement to offering)
  | 'self_directed_reflect'  // Self-directed close: Summarize insight + validate progress
  | 'self_directed_action'   // Self-directed close: Commit to one small next step

// Closing-specific analysis types (for intelligent progression through closing sequence)
export type ClosingAskType = 'agreement_in_principle' | 'agreement_to_offering'

export type ClosingResponseType =
  | 'clear_agreement'      // They clearly said yes
  | 'tentative_agreement'  // Agreed but with some reservation
  | 'hesitation'           // Uncertain, asking questions, hedging
  | 'objection'            // Pushed back or declined
  | 'off_topic'            // Didn't address the question

export type ObjectionType =
  | 'doesnt_need_help'     // "I can figure this out myself"
  | 'prefers_self_solve'   // "I'd rather find someone on my own"
  | 'not_our_offering'     // "I'm not sure about your service"
  | 'timing'               // "Not right now"
  | 'needs_more_info'      // "What would that involve?"

export interface ClosingAnalysisResult {
  checking_for: ClosingAskType
  response_type: ClosingResponseType
  objection_type?: ObjectionType
  confidence: number
  reasoning: string
}

export type ComplexityLevel = 'simple' | 'moderate' | 'complex'
export type EmotionalCharge = 'neutral' | 'moderate' | 'high'
export type ExpertiseLevel = 'novice' | 'developing' | 'expert'
export type CommitmentLevel = 'low' | 'medium' | 'high'
export type ClarityTrend = 'increasing' | 'stable' | 'decreasing'

// Response variety tracking to prevent formulaic language
export interface VarietyTracker {
  insight_openers_used: number[]     // Indices of used openers
  connectors_used: number[]          // Indices of used connectors
  validations_used: number[]         // Indices of used validations
  last_reflection_turn: number       // Prevent back-to-back reflections
  total_reflections: number          // Cap at 3-4 per conversation

  // Extended tracking for broader variety
  question_patterns_used: number[]    // Track question structure variety
  acknowledgment_patterns_used: number[]  // Track "I hear you" variety
  exploration_openers_used: number[]  // Track exploration opener variety

  // Structural pattern tracking
  heres_what_count: number             // "Here's what I'm seeing/noticing" usage count
  bold_sentence_count: number          // Number of bolded sentences across conversation
  reflect_then_question_count: number  // Reflect→insight→question structure count
}

// Conversation memory to prevent circular exploration
export interface ConversationMemory {
  topics_explored: string[]          // Key topics discussed (max 10)
  questions_asked: string[]          // Question themes asked (max 10)
  user_answers_summary: string[]     // Brief summary of user's key points
  ground_covered_score: number       // 0-1, how much territory covered
  clarity_history: ReadinessLevel[]  // Track clarity over time for trend detection
}

/**
 * Closing Synthesis - Internal reasoning assembled before entering closing sequence
 * This is NOT shown to user - it's the reasoning that drives dynamic closing language
 *
 * Key principle from Danny:
 * "The close shouldn't be a moment - it should be the natural continuation of a
 * conversation that's already in motion."
 */
export interface ClosingSynthesis {
  // Explicit signals (gathered during conversation)
  confirmed_constraint: ConstraintCategory | null
  user_stated_future: string[]        // Quotes of desired outcomes they mentioned
  user_stated_stakes: string[]        // Quotes of costs/frustrations they named
  attempted_solutions: string[]       // What they've already tried
  stall_reason: string                // Why self-resolution has stalled

  // Implicit extrapolations (inferred from conversation patterns)
  personality_style: {
    directness: 'direct' | 'reflective'    // How they communicate
    thinking: 'strategic' | 'tactical'      // Big picture vs step-by-step
    pace: 'fast' | 'cautious'               // Decision-making speed
    verbosity: 'concise' | 'verbose'        // Response length preference
  }
  emotional_tone: 'energized' | 'frustrated' | 'thoughtful' | 'ambivalent'

  // Derived for closing (computed from above)
  capability_gap: string              // What's missing (framed as mechanical, not motivational)
  why_self_resolution_fails: string   // The structural reason trying harder won't work
  recommended_support_category: string // Type of help that resolves this class of problem

  // Personalization hints
  stakes_to_foreground: string[]      // Which stakes to emphasize in closing
  language_compression: 'tight' | 'expansive'  // Based on personality
  pacing_approach: 'momentum' | 'stabilize' | 'reasoning' | 'inevitability'  // Based on emotional tone
}

/**
 * Closing Sequence State - Tracks progress through multi-turn closing (Danny's Turn A-E arc)
 *
 * CRITICAL: Components (view_summary, save_progress) should ONLY appear AFTER
 * closing_arc_complete = true. This prevents premature CTAs mid-conversation.
 *
 * Danny's model requires TWO agreement gates:
 * 1. Turn D: Agreement in principle (they need external help)
 * 2. Turn D2: Agreement to our offering (they want our free call)
 *
 * ## Field Categories
 *
 * **Decision-affecting flags** (used in decision engine and component visibility):
 * - phase: Current closing turn (determines which overlay to use)
 * - alignment_detected: Gates component visibility, used for phase advancement
 * - closing_arc_complete: Primary gate for component visibility (set after Turn E delivered)
 * - facilitation_offered: Used to check if Turn E has been initiated
 * - user_hesitation_expressed: Used for save_progress component visibility
 *
 * **Tracking-only flags** (for logging/analytics, not used in decision logic):
 * - turns_in_closing: Counts turns spent in closing
 * - agreed_needs_help: Logs Turn D agreement (not used in decisions)
 * - agreed_to_offering: Logs Turn D2 agreement (not used in decisions)
 */
export interface ClosingSequenceState {
  // === Decision-affecting state ===
  phase: ClosingPhase                    // DECISION: Determines which closing overlay to use
  synthesis: ClosingSynthesis | null     // DECISION: Used for prompt personalization
  alignment_detected: boolean            // DECISION: Gates component visibility, phase advancement
  closing_arc_complete: boolean          // DECISION: Primary gate for component visibility
  facilitation_offered: boolean          // DECISION: Turn E completion check
  user_hesitation_expressed: boolean     // DECISION: Triggers save_progress component

  // === Tracking-only state (for logging/analytics) ===
  turns_in_closing: number               // TRACKING: Count of turns in closing sequence
  agreed_needs_help: boolean             // TRACKING: Turn D agreement logged for analytics
  agreed_to_offering: boolean            // TRACKING: Turn D2 agreement logged for analytics
}

export interface ConversationState {
  // Diagnostic tracking
  phase: Phase
  constraint_hypothesis: ConstraintCategory | null
  hypothesis_confidence: number  // 0-1, used for sticky hypothesis logic
  sub_dimension: string | null
  constraint_summary: string | null
  hypothesis_validated: boolean
  diagnosis_delivered: boolean  // Set once when diagnose action fires, never reset
  summary_already_shown: boolean  // Set when view_summary component is triggered, prevents duplicate

  // Readiness (computed)
  readiness: {
    clarity: ReadinessLevel
    confidence: ReadinessLevel
    capacity: ReadinessLevel
  }

  // Signals
  emotional_charge: EmotionalCharge
  overwhelm_detected: boolean
  contradiction_count: number

  // Turn tracking
  turns_total: number
  turns_in_phase: number
  turns_since_validation: number
  turns_since_containment: number

  // Calibration
  complexity_level: ComplexityLevel
  cross_map_applied: boolean
  last_action?: string

  // User info
  user_name?: string

  // Learner journey tracking (recursive prompting)
  learner_state: {
    insights_articulated: string[]      // Key insights they've voiced
    contradictions_surfaced: number     // Times we've surfaced tensions
    learning_milestones: number         // Major breakthroughs
    hypothesis_co_created: boolean      // Did they help build hypothesis?
    stress_test_passed: boolean         // Did hypothesis survive reality check?
    expertise_level: ExpertiseLevel     // Their understanding depth
    last_turn_confirmed_understanding: boolean  // User said "that's exactly it" or similar
    self_awareness_level: 'low' | 'medium' | 'high'  // How well user understands their own issue
  }

  // Recursive prompting state
  recursive_state: {
    last_insight: string | null          // Most recent articulated insight
    pending_contradiction: string | null // Unresolved tension to address
    shared_criteria_established: boolean // Agreement on what "success" looks like
    cumulative_understanding: string[]   // Building narrative of their journey
    pre_commitment_checked: boolean      // FIX: Bug #1 - Has commitment check run?
  }

  // Pre-commitment tracking
  readiness_check: {
    stress_test_completed: boolean
    identified_blockers: string[]
    commitment_level: CommitmentLevel
    ready_for_booking: boolean
    blockers_checked: boolean  // Has blocker check question been asked?
    turns_exploring_readiness: number  // Turns spent in medium readiness exploration (max 3)
  }

  // Consent gates (explicit state, not implicit in prompts)
  consent_state: {
    diagnosis_requested: boolean       // Asked "Ready for me to share what I see?"
    diagnosis_confirmed: boolean       // User said yes
    last_consent_request: string | null  // What we asked for
  }

  // Hypothesis resistance tracking (prevents repeating rejected framing)
  hypothesis_resistance_count: number

  // Tactical drift tracking (prevents sustained tactical coaching)
  tactical_drift: {
    consecutive_tactical_turns: number  // Resets to 0 on non-tactical turn
    total_tactical_turns: number        // Never resets
    redirect_count: number              // How many times we've redirected
    last_redirect_turn: number          // Prevents re-redirecting too soon
  }

  // Multi-turn closing sequence state (Danny's enrollment-professional model)
  closing_sequence: ClosingSequenceState

  // Response variety tracking (prevents formulaic language)
  variety_tracker: VarietyTracker

  // Conversation memory (prevents circular exploration)
  conversation_memory: ConversationMemory

  // Mid-conversation email capture
  email_capture_shown: boolean
  email_capture_dismissed: boolean

  // Relationship modeling (working alliance tracking)
  relationship: {
    engagement: 'high' | 'medium' | 'low' | 'resistant'
    trust_level: 'establishing' | 'building' | 'established' | 'damaged'
    disposition: 'collaborative_explorer' | 'direct_pragmatist' | 'skeptical_evaluator' | 'emotionally_processing'
    process_frustration: 'none' | 'mild' | 'significant' | 'hostile'
    frustration_target: 'process' | 'mira' | 'self' | 'situation' | null
    confirmed_reflections: number  // times user confirmed Mira understood them
    boundary_set: boolean  // whether rudeness boundary has been set this session
    frustration_acknowledged_count: number  // times acknowledge_frustration has fired
  }

  // Low-effort response tracking
  low_effort_tracking: {
    consecutive_low_effort_turns: number
    total_low_effort_turns: number
    has_pushed_back: boolean  // deprecated, kept for backward compat with existing sessions
    pushback_count: number
  }
}

export interface ConversationSignals {
  response_length: number
  emotional_markers: string[]
  clarity_level: ReadinessLevel
  confidence_level: ReadinessLevel
  capacity_signals: string[]
  contradiction_detected: boolean
  overwhelm_detected: boolean
  validation_seeking: boolean
  ownership_language: boolean

  // Recursive prompting signals
  insight_articulated: boolean
  breakthrough_language: string[]  // "oh!", "I see now", "that's exactly it"
  contradiction_present: boolean
  resistance_to_hypothesis: boolean
  stress_test_passed: boolean
  blocker_mentioned: boolean
  commitment_language: boolean      // "I'm ready", "let's do this"

  // Emotion distinction (FIX: Bug #2 - Containment over-triggers)
  positive_emotion_detected: boolean    // "excited", "exactly", "I see it", "clear"
  negative_overwhelm_detected: boolean  // "drowning", "too much", "can't handle"

  // Meta-cognition (FIX: Bug #6 - Expertise upgrade)
  meta_cognition_detected: boolean      // "I've been thinking X but...", self-correction
}

export interface StateInference {
  constraint_hypothesis: {
    category: ConstraintCategory | null
    confidence: number
    evidence: string[]
  }

  sub_dimension: {
    dimension: string | null
    confidence: number
  }

  diagnosis_ready: {
    ready: boolean
    reasons: string[]
    blockers: string[]
  }

  validation_needed: boolean
  hypothesis_validated: boolean
}

export interface DiagnosisDecision {
  ready: boolean
  confidence: number
  constraint: ConstraintCategory | null
  summary: string | null
  action: 'transition_to_diagnosis' | 'request_validation' | 'continue_exploration'
}

export interface OrchestratorDecision {
  action:
    | 'explore'
    | 'contain'
    | 'validate'
    | 'diagnose'
    | 'deepen'
    | 'cross_map'
    | 'diagnosis_complete'
    | 'reflect_insight'           // Mirror back their learning
    | 'surface_contradiction'     // Challenge assumptions
    | 'stress_test'               // Reality-check hypothesis
    | 'build_criteria'            // Establish shared success definition
    | 'pre_commitment_check'      // Final readiness gate
    | 'request_diagnosis_consent' // Ask permission before diagnosis
    | 'check_blockers'            // Final question before handoff
    | 'complete_with_handoff'     // Clean closing with UI handoff
    | 'explore_readiness'         // Deepen medium readiness before routing
    // New multi-turn closing actions (Danny's enrollment-professional model)
    | 'closing_reflect_implication'  // Turn A: Reflect diagnosis with structural implication
    | 'closing_reflect_stakes'       // Turn B: Mirror back stakes as lived reality
    | 'closing_name_capability_gap'  // Turn C: Name what's missing (mechanical, not motivational)
    | 'closing_assert_and_align'     // Turn D: Get agreement in principle (need external help)
    | 'closing_offer_solution'       // Turn D2: Offer our specific solution (free call)
    | 'closing_facilitate'           // Turn E: Lay out path (only after agreement to offering)
    | 'closing_self_directed_reflect'  // Self-directed close: Summarize insight + validate
    | 'closing_self_directed_action'   // Self-directed close: Commit to next step
    | 'redirect_from_tactical'        // Redirect from sustained tactical drift
    | 'graceful_close'               // User declined - close warmly without pressure
    | 'probe_deeper'                 // Go one layer deeper when user gives surface-level explanation
    | 'push_back_on_low_effort'      // Gently push for more depth when responses are too brief
    | 'set_boundary'                 // Set firm boundary when user is hostile
    | 'acknowledge_frustration'      // Acknowledge significant process frustration
  reasoning: string
  prompt_overlays: string[]
  available_tools: string[]
  confidence: number
  hypothesis_to_validate?: ConstraintCategory
  redirect_to?: ConstraintCategory
  focus_area?: string | null
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  turn: number
  timestamp: Date
}

export interface OrchestratorResponse {
  advisorResponse: string
  state: ConversationState
  decision: OrchestratorDecision
  inference: StateInference | null
  complete?: boolean
  // Component payload for frontend (CTAs, summaries, etc.)
  components?: {
    message: string
    components: Array<{
      type: string
      text?: string
      metadata?: Record<string, unknown>
    }>
  }
}

export interface CrossMapResult {
  should_redirect: boolean
  upstream_category: ConstraintCategory | null
  reasoning: string
  confidence: number
}

/**
 * Unified analysis result from single LLM call
 * Replaces separate signals, inference, and consent detection
 * Key innovation: Separates INFERRED signals from EXPLICIT statements
 */
export interface UnifiedAnalysis {
  // Inferred signals (what we think is true based on patterns)
  signals: {
    clarity: ReadinessLevel
    confidence: ReadinessLevel
    capacity: ReadinessLevel
    overwhelm: boolean
    emotional_intensity: number  // 0-5
  }

  // Explicit statements (what they actually said - overrides inferred)
  explicit: {
    stated_ready: boolean           // "I'm ready", "Let's do this"
    stated_no_blockers: boolean     // "Nothing's stopping me", "I have the time"
    stated_blockers: string[] | null  // Named specific blockers
    asked_for_next_steps: boolean   // "What now?", "How do we proceed?"
    gave_consent: boolean           // "Yes, tell me what you see"
    alignment_expressed: boolean    // "Yes, that makes sense", "That resonates"
    hesitation_expressed: boolean   // "I'm not sure", "Let me think about it"
    agreed_to_offering: boolean     // Explicitly agreed to a proposed call/session/next step
    declined_offering: boolean      // Explicitly declined ("no thanks", "I'm good for now")
    financial_constraint: boolean   // User mentioned money/budget/cost constraints
    explicit_request: 'summary' | 'next_steps' | 'booking' | 'resource' | null
  }

  // Constraint hypothesis
  constraint: {
    category: ConstraintCategory | null
    confidence: number  // 0-1
    evidence: string
  }

  // Insight detection
  insights: {
    breakthrough_detected: boolean
    insight_phrases: string[]
    ownership_language: boolean
    meta_cognition: boolean
  }

  // Contradiction and resistance
  tensions: {
    contradiction_detected: boolean
    resistance_to_hypothesis: boolean
    stress_test_passed: boolean
  }

  // Tactical request detection
  tactical: {
    is_tactical_request: boolean
    tactical_topic: string | null  // "scheduling" | "naming" | "design" | "pricing" | "tool_selection" | "logistics" | null
  }

  // Engagement quality
  engagement: {
    low_effort: boolean             // Short, non-substantive response ("fine", "yeah", "not sure")
    meaningful_despite_short: boolean  // Short but emotionally loaded ("I'm scared", "I'm stuck")
    surface_deflection: boolean     // Articulate but shallow explanation that avoids deeper issue ("I just haven't had time")
  }

  // Cross-mapping: does the apparent constraint trace to a different root?
  cross_mapping: {
    upstream_signal_detected: boolean
    apparent_vs_root: 'execution_from_strategy' | 'strategy_from_psychology' | 'psychology_from_execution' | null
    evidence: string
  }

  // Exit intent detection
  exit_intent: boolean  // User is trying to end the conversation ("we're done", "I'm leaving", "goodbye")

  // Relationship assessment
  relationship: {
    engagement: 'high' | 'medium' | 'low' | 'resistant'
    trust_level: 'establishing' | 'building' | 'established' | 'damaged'
    disposition: 'collaborative_explorer' | 'direct_pragmatist' | 'skeptical_evaluator' | 'emotionally_processing'
    process_frustration: 'none' | 'mild' | 'significant' | 'hostile'
    frustration_target: 'process' | 'mira' | 'self' | 'situation' | null
  }

  // Meta
  reasoning: string
}

/**
 * Effective state after combining inferred + explicit
 * Explicit statements ALWAYS override inferred signals
 * This is what the decision engine actually uses
 */
export interface EffectiveState {
  clarity: ReadinessLevel
  confidence: ReadinessLevel
  capacity: ReadinessLevel
  overwhelm: boolean
  ready_to_close: boolean      // User explicitly ready for next steps
  has_blockers: boolean        // User named specific blockers
  blockers: string[] | null
  consent_given: boolean
}
