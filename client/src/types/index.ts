// ============================================
// Database Types
// ============================================

export type Phase = 'context' | 'exploration' | 'diagnosis' | 'readiness' | 'routing' | 'complete';

export type ConstraintCategory = 'strategy' | 'execution' | 'psychology';

export type Endpoint = 'EC' | 'MIST' | 'NURTURE';

export type CompletionStatus = 'in_progress' | 'completed' | 'abandoned';

export type Speaker = 'advisor' | 'user';

export interface DetectedSignals {
  strategy: string[];
  execution: string[];
  psychology: string[];
}

export interface Session {
  id: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string | null;
  business_type: string | null;
  business_stage: string | null;
  surface_challenge: string | null;
  constraint_category: ConstraintCategory | null;
  constraint_summary: string | null;
  constraint_validated: boolean;
  clarity_score: number | null;
  confidence_score: number | null;
  capacity_score: number | null;
  endpoint_selected: Endpoint | null;
  clarity_shift_rating: number | null;
  current_phase: Phase;
  total_turns: number;
  completion_status: CompletionStatus;
  conversation_log: Message[];
  email_sent: boolean;
  email_sent_at: string | null;
  webhook_sent: boolean;
  webhook_sent_at: string | null;
  conversation_state?: any; // Phase 5-7: Full orchestrator state with learner_state
}

export interface Message {
  id: string;
  session_id: string;
  created_at: string;
  turn_number: number;
  speaker: Speaker;
  message_text: string;
  phase: Phase | null;
  detected_signals: DetectedSignals | null;
  was_voice: boolean;
  audio_duration_seconds: number | null;
}

// ============================================
// API Types
// ============================================

export interface CreateSessionRequest {
  userName: string;
}

export interface CreateSessionResponse {
  session: Session;
}

export interface MessageAttachment {
  url: string;
  type: 'image' | 'pdf';
  name: string;
}

export interface SendMessageRequest {
  message: string;
  wasVoice?: boolean;
  attachments?: MessageAttachment[];
}

export interface SendMessageResponse {
  userMessage: Message;
  advisorMessage: Message;
  session: Session;
}

// ============================================
// UI State Types
// ============================================

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  currentPhase: Phase;
}

// ============================================
// Signal Session Types
// ============================================

export type SignalPhase =
  | 'thread_opening'
  | 'deepening'
  | 'insight_crystallization'
  | 'arc_building'
  | 'arc_validation'
  | 'brief_generation'
  | 'complete';

export const SIGNAL_PHASE_ORDER: SignalPhase[] = [
  'thread_opening',
  'deepening',
  'insight_crystallization',
  'arc_building',
  'arc_validation',
  'brief_generation',
  'complete'
];

export const SIGNAL_PHASE_LABELS: Record<SignalPhase, string> = {
  thread_opening: 'Opening',
  deepening: 'Deepening',
  insight_crystallization: 'Insight',
  arc_building: 'Arc Building',
  arc_validation: 'Validation',
  brief_generation: 'Brief',
  complete: 'Complete'
};

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
  generated_at: string;
  session_id: string;
  turns_to_complete: number;
}

export interface SignalSessionMessage {
  role: 'user' | 'assistant';
  content: string;
  turnNumber: number;
  timestamp: string;
}

export interface SignalSessionState {
  sessionId: string;
  phase: SignalPhase;
  turnCount: number;
  messages: SignalSessionMessage[];
  complete: boolean;
  brief?: CreativeBrief;
}
