// ============================================
// Database Types
// ============================================

export type Phase = 'context' | 'exploration' | 'diagnosis' | 'readiness' | 'routing' | 'closing' | 'complete';

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
  conversation_state: any | null;  // Orchestrator ConversationState (JSONB)
  email_sent: boolean;
  email_sent_at: string | null;
  webhook_sent: boolean;
  webhook_sent_at: string | null;
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
