/**
 * Signal Session Agent - Core Type Definitions
 *
 * This agent helps users clarify their thinking and produce a creative brief
 * through a structured design-before-writing process.
 */

// =============================================================================
// PHASES
// =============================================================================

export type Phase =
  | 'thread_opening'           // Get the raw idea on the table
  | 'deepening'                // Go beneath the surface
  | 'insight_crystallization'  // Arrive at a single, clean insight
  | 'arc_building'             // Construct the narrative arc
  | 'arc_validation'           // Stress-test the arc
  | 'brief_generation'         // Produce the creative brief
  | 'complete';                // Session finished

export const PHASE_ORDER: Phase[] = [
  'thread_opening',
  'deepening',
  'insight_crystallization',
  'arc_building',
  'arc_validation',
  'brief_generation',
  'complete'
];

// =============================================================================
// SIGNALS (Extracted by Unified Analysis)
// =============================================================================

export type IdeaState = 'none' | 'vague' | 'emerging' | 'clear';
export type DepthState = 'surface' | 'approaching' | 'deep';
export type InsightState = 'none' | 'generic' | 'specific' | 'confirmed';
export type ArcElementState = 'absent' | 'partial' | 'clear';
export type ArcCoherence = 'untested' | 'weak' | 'strong';
export type ResponseSubstance = 'thin' | 'adequate' | 'rich';
export type EngagementLevel = 'low' | 'medium' | 'high';
export type ConfirmationState = 'none' | 'hesitant' | 'confirmed';
export type RiskLevel = 'low' | 'medium' | 'high';
export type CircularState = 'none' | 'emerging' | 'stuck';
export type ShiftType = 'none' | 'incremental' | 'breakthrough';
export type EnergyShift = 'decreased' | 'stable' | 'increased';
export type UserIntent =
  | 'exploring'
  | 'answering'
  | 'questioning'
  | 'confirming'
  | 'deflecting'
  | 'rushing';

export interface Signals {
  // Content State
  idea_state: IdeaState;
  depth_state: DepthState;
  insight_state: InsightState;
  insight_text: string | null;

  // Arc State
  arc_opening: ArcElementState;
  arc_progression: ArcElementState;
  arc_destination: ArcElementState;
  arc_coherence: ArcCoherence;

  // User State
  response_substance: ResponseSubstance;
  engagement: EngagementLevel;
  confirmation_state: ConfirmationState;
  hesitation_indicators: string[];

  // Process Risks
  premature_closure_risk: RiskLevel;
  circular_exploration: CircularState;

  // Turn Dynamics
  clarity_shift: ShiftType;
  energy_shift: EnergyShift;
  user_intent: UserIntent;
}

// Default signals for initialization
export const DEFAULT_SIGNALS: Signals = {
  idea_state: 'none',
  depth_state: 'surface',
  insight_state: 'none',
  insight_text: null,
  arc_opening: 'absent',
  arc_progression: 'absent',
  arc_destination: 'absent',
  arc_coherence: 'untested',
  response_substance: 'adequate',
  engagement: 'medium',
  confirmation_state: 'none',
  hesitation_indicators: [],
  premature_closure_risk: 'low',
  circular_exploration: 'none',
  clarity_shift: 'none',
  energy_shift: 'stable',
  user_intent: 'exploring'
};

// =============================================================================
// ACTIONS (Selected by Decision Engine)
// =============================================================================

export type Action =
  // Thread Opening
  | 'invite_thread'
  | 'gentle_probe'
  | 'reflect_and_open'

  // Deepening
  | 'push_deeper'
  | 'deepen_further'
  | 'probe_gently'
  | 'acknowledge_depth'

  // Insight Crystallization
  | 'seek_insight'
  | 'push_for_specificity'
  | 'reflect_insight_seek_confirmation'
  | 'explore_hesitation'
  | 'hold_for_confirmation'

  // Arc Building
  | 'ask_opening_tension'
  | 'clarify_opening'
  | 'ask_progression'
  | 'clarify_progression'
  | 'ask_destination'
  | 'clarify_destination'
  | 'summarize_arc'

  // Arc Validation
  | 'stress_test_arc'
  | 'explore_arc_weakness'
  | 'seek_arc_confirmation'
  | 'acknowledge_arc_ready'

  // Brief Generation
  | 'generate_brief'
  | 'revise_brief'
  | 'complete_session'

  // Global Guardrails
  | 'slow_down_guardrail'
  | 'redirect_forward';

// =============================================================================
// STATE
// =============================================================================

export interface VarietyTracker {
  used_openers: string[];
  used_reflections: string[];
  used_probes: string[];
  reflection_count: number;
  last_reflection_turn: number;
}

export const DEFAULT_VARIETY_TRACKER: VarietyTracker = {
  used_openers: [],
  used_reflections: [],
  used_probes: [],
  reflection_count: 0,
  last_reflection_turn: 0
};

export interface Module0Context {
  thinking_style: string;
  audience_snapshot: {
    who: string;
    challenges: string[];
    aspirations: string[];
  };
  collaboration_preferences: {
    depth_vs_speed: 'depth' | 'balanced' | 'speed';
    preferred_tone: 'challenging' | 'supportive' | 'precise' | 'exploratory';
    response_length: 'concise' | 'moderate' | 'detailed';
  };
  operating_stance: string;
}

// Default Module 0 context (mocked for POC)
export const DEFAULT_MODULE0_CONTEXT: Module0Context = {
  thinking_style: 'Prefers to explore before committing, values depth over speed',
  audience_snapshot: {
    who: 'Coaches and consultants building their practice',
    challenges: ['Unclear positioning', 'Content that feels generic', 'Difficulty articulating value'],
    aspirations: ['Clear thought leadership', 'Content that resonates', 'Authentic voice']
  },
  collaboration_preferences: {
    depth_vs_speed: 'depth',
    preferred_tone: 'precise',
    response_length: 'concise'
  },
  operating_stance: 'Building a sustainable coaching business with integrity'
};

export interface SignalSessionState {
  // Session metadata
  session_id: string;
  agent_type: 'signal-session';

  // Phase tracking
  phase: Phase;
  turns_in_phase: number;
  turns_total: number;

  // Accumulated content (what we've confirmed)
  confirmed_insight: string | null;
  arc_opening: string | null;
  arc_progression: string | null;
  arc_destination: string | null;

  // Current arc element being worked on (for arc_building phase)
  current_arc_element: 'opening' | 'progression' | 'destination' | null;

  // Latest signals from analysis
  current_signals: Signals;

  // Variety tracking
  variety_tracker: VarietyTracker;

  // Module 0 context
  user_context: Module0Context;

  // Output
  generated_brief: CreativeBrief | null;
  brief_revision_count: number;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export const createInitialState = (sessionId: string, userContext?: Partial<Module0Context>): SignalSessionState => ({
  session_id: sessionId,
  agent_type: 'signal-session',
  phase: 'thread_opening',
  turns_in_phase: 0,
  turns_total: 0,
  confirmed_insight: null,
  arc_opening: null,
  arc_progression: null,
  arc_destination: null,
  current_arc_element: null,
  current_signals: { ...DEFAULT_SIGNALS },
  variety_tracker: { ...DEFAULT_VARIETY_TRACKER },
  user_context: { ...DEFAULT_MODULE0_CONTEXT, ...userContext },
  generated_brief: null,
  brief_revision_count: 0,
  created_at: new Date(),
  updated_at: new Date()
});

// =============================================================================
// OUTPUT: CREATIVE BRIEF
// =============================================================================

export interface CreativeBrief {
  working_title: string;
  core_insight: string;
  narrative_arc: {
    opening_tension: string;
    progression_beats: string[];
    insight_crystallization: string;
    close: string;
  };
  intended_reader: {
    who: string;
    struggling_with: string;
    current_misunderstanding?: string;
  };
  what_this_clarifies: string[];
  tone_and_guardrails: {
    qualities: string[];
    do_nots: string[];
  };
  key_language_or_metaphors?: string[];

  // Metadata
  generated_at: Date;
  session_id: string;
  turns_to_complete: number;
}

// =============================================================================
// DECISION & ORCHESTRATOR TYPES
// =============================================================================

export interface Decision {
  action: Action;
  reasoning: string;
  phase_transition?: Phase;
}

export interface UnifiedAnalysisResult {
  signals: Signals;
  reasoning: string;
  suggested_action: Action;
}

export interface OrchestratorResult {
  message: string;
  state: SignalSessionState;
  decision: Decision;
  complete: boolean;
  brief?: CreativeBrief;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  turn_number: number;
  timestamp: Date;
}
