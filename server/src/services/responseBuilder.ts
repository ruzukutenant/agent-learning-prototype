// Response builder pattern for consistent API responses
// Ensures all required fields are always present, especially last_action

import type { Session, Message } from '../types/index.js'
import type { ConversationState } from '../orchestrator/core/types.js'

// Component payload structure from orchestrator
export interface ComponentPayload {
  message: string
  components: Array<{
    type: string
    text?: string
    metadata?: Record<string, unknown>
  }>
}

export interface OrchestratorResult {
  userMessage?: Message      // The saved user message (with cleaned text for voice)
  advisorMessage?: Message
  session: Session
  complete: boolean
  // UI components triggered by the orchestrator (view_summary, save_progress, etc.)
  components?: ComponentPayload
  state: {
    constraint_hypothesis: string | null
    readiness: {
      clarity: string
      confidence: string
      capacity: string
    }
    phase: string

    // Phase 5-7: Expose learner journey data to frontend
    learner_state?: {
      insights_articulated: string[]
      learning_milestones: number
      expertise_level: string
      hypothesis_co_created: boolean
      stress_test_passed: boolean
      contradictions_surfaced: number
    }

    readiness_check?: {
      stress_test_completed: boolean
      identified_blockers: string[]
      commitment_level: string
      ready_for_booking: boolean
    }

    last_action: string | null  // ALWAYS present (never undefined)
  }
}

/**
 * Build a consistent OrchestratorResult response
 *
 * Ensures all required fields are present, especially last_action
 * which was missing in initial greetings and causing E2E test failures
 *
 * @param advisorMessage - The advisor's response message (undefined for initial greeting)
 * @param session - Current session from database
 * @param conversationState - Full conversation state from orchestrator
 * @param complete - Whether the conversation is complete
 * @param lastAction - The decision action that was just taken (optional override)
 * @param userMessage - The saved user message with cleaned text (for voice transcription)
 * @param components - UI components triggered by the orchestrator (view_summary, etc.)
 * @returns Fully-populated OrchestratorResult with guaranteed last_action
 */
export function buildOrchestratorResult(
  advisorMessage: Message | undefined,
  session: Session,
  conversationState: ConversationState,
  complete: boolean,
  lastAction?: string,
  userMessage?: Message,
  components?: ComponentPayload
): OrchestratorResult {

  // Determine last_action priority:
  // 1. Explicit override parameter (when caller knows the action)
  // 2. From conversation state (most recent orchestrator decision)
  // 3. Null (for initial greeting before any decisions)
  const finalLastAction = lastAction ||
                         conversationState.last_action ||
                         null

  if (finalLastAction) {
    console.log(`[Response Builder] Including last_action: ${finalLastAction}`)
  } else {
    console.log('[Response Builder] No action yet (initial greeting)')
  }

  // Log component triggering for debugging
  if (components && components.components.length > 0) {
    console.log(`[Response Builder] Including ${components.components.length} UI components: ${components.components.map(c => c.type).join(', ')}`)
  }

  return {
    userMessage,
    advisorMessage,
    session,
    complete,
    components,  // UI components for frontend to render
    state: {
      constraint_hypothesis: conversationState.constraint_hypothesis,
      readiness: {
        clarity: conversationState.readiness.clarity,
        confidence: conversationState.readiness.confidence,
        capacity: conversationState.readiness.capacity
      },
      phase: conversationState.phase,

      // Phase 5-7: Learner journey data
      learner_state: {
        insights_articulated: conversationState.learner_state.insights_articulated,
        learning_milestones: conversationState.learner_state.learning_milestones,
        expertise_level: conversationState.learner_state.expertise_level,
        hypothesis_co_created: conversationState.learner_state.hypothesis_co_created,
        stress_test_passed: conversationState.learner_state.stress_test_passed,
        contradictions_surfaced: conversationState.learner_state.contradictions_surfaced
      },

      readiness_check: {
        stress_test_completed: conversationState.readiness_check.stress_test_completed,
        identified_blockers: conversationState.readiness_check.identified_blockers,
        commitment_level: conversationState.readiness_check.commitment_level,
        ready_for_booking: conversationState.readiness_check.ready_for_booking
      },

      // CRITICAL: Always include last_action (never undefined)
      last_action: finalLastAction
    }
  }
}
