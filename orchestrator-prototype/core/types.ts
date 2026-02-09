// Core TypeScript types for orchestration prototype

export type ConstraintCategory = 'strategy' | 'execution' | 'energy'
export type Phase = 'context' | 'exploration' | 'diagnosis' | 'complete'
export type ReadinessLevel = 'low' | 'medium' | 'high'
export type ComplexityLevel = 'simple' | 'moderate' | 'complex'
export type EmotionalCharge = 'neutral' | 'moderate' | 'high'

export interface ConversationState {
  // Diagnostic tracking
  phase: Phase
  constraint_hypothesis: ConstraintCategory | null
  sub_dimension: string | null
  constraint_summary: string | null
  hypothesis_validated: boolean

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
  action: 'explore' | 'contain' | 'validate' | 'diagnose' | 'deepen' | 'cross_map' | 'diagnosis_complete'
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
}

export interface CrossMapResult {
  should_redirect: boolean
  upstream_category: ConstraintCategory | null
  reasoning: string
  confidence: number
}
