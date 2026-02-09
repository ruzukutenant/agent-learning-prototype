import { processConversationTurn, initializeState } from '../orchestrator/conversation/orchestrator.js'
import { getDefaultSummary } from '../orchestrator/core/constraint-summarizer.js'
import { initializeVarietyTracker } from '../orchestrator/core/response-variety.js'
import { initializeConversationMemory } from '../orchestrator/core/conversation-memory.js'
import { getSession, updateSession, addMessage, getMessages } from './session.js'
import type { Session, Message, Endpoint } from '../types/index.js'
import type { ConversationState, Message as OrchestratorMessage, MessageAttachment } from '../orchestrator/core/types.js'
import { buildOrchestratorResult, type OrchestratorResult } from './responseBuilder.js'
import { sendSessionSummaryEmail } from './email/send-summary.js'
import { sendMetaEvent } from './meta-conversions.js'

/**
 * Process message using orchestrator instead of direct LLM prompts
 */
export interface RequestContext {
  ip?: string
  userAgent?: string
  fbp?: string
  fbc?: string
}

export async function processMessageWithOrchestrator(
  sessionId: string,
  userMessageText: string,
  wasVoice: boolean = false,
  attachments?: MessageAttachment[],
  requestContext?: RequestContext
): Promise<OrchestratorResult> {

  // Handle initial greeting
  if (userMessageText === '__INIT__') {
    const session = await getSession(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }

    // Idempotency check: if greeting already exists, return it instead of creating duplicate
    const existingMessages = await getMessages(sessionId)
    if (existingMessages.length > 0) {
      console.log(`[Orchestrator] __INIT__ called but ${existingMessages.length} messages exist - returning existing greeting`)
      return buildOrchestratorResult(
        existingMessages[0],
        session,
        session.conversation_state as ConversationState || initializeState(session.user_name),
        false,
        undefined
      )
    }

    // Server-side StartConversation event (covers ad-blocked users)
    sendMetaEvent('StartConversation', crypto.randomUUID(), {
      ip: requestContext?.ip,
      userAgent: requestContext?.userAgent,
      fbp: requestContext?.fbp,
      fbc: requestContext?.fbc,
      sourceUrl: 'https://advisor.coachmira.ai',
    })

    const greetingText = `Hey ${session.user_name}! I'm here to help you identify what's really holding your business back. Let's start: Tell me about your coaching or consulting business—what do you do and who do you serve?`

    const advisorMessage = await addMessage({
      sessionId,
      turnNumber: 1,
      speaker: 'advisor',
      messageText: greetingText,
      phase: 'context',
    })

    // Initialize orchestrator state
    const initialState = initializeState(session.user_name)

    await updateSession(sessionId, {
      total_turns: 1,
      conversation_state: initialState as any,
      current_phase: 'context',
    })

    const updatedSession = await getSession(sessionId)
    if (!updatedSession) {
      throw new Error('Session not found after init')
    }

    // Use response builder to ensure last_action is always included
    return buildOrchestratorResult(
      advisorMessage,
      updatedSession,
      initialState,
      false,
      undefined  // No action yet (initial greeting)
    )
  }

  // 1. Get current session and messages
  let session = await getSession(sessionId)
  if (!session) {
    throw new Error('Session not found')
  }

  const existingMessages = await getMessages(sessionId)

  // 2. Convert database messages to orchestrator format
  const history: OrchestratorMessage[] = existingMessages
    .filter((msg) => msg.message_text && msg.message_text.trim())
    .map((msg) => ({
      role: msg.speaker === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.message_text,
      turn: msg.turn_number,
      timestamp: new Date(msg.created_at),
    }))

  // 3. Get current orchestrator state from session
  let conversationState: ConversationState
  if (session.conversation_state && typeof session.conversation_state === 'object') {
    conversationState = session.conversation_state as ConversationState

    // Backfill fields added after session was created (prevents crashes on resumed sessions)
    if (!conversationState.tactical_drift) {
      conversationState.tactical_drift = {
        consecutive_tactical_turns: 0,
        total_tactical_turns: 0,
        redirect_count: 0,
        last_redirect_turn: 0
      }
    }
    if (!conversationState.closing_sequence) {
      conversationState.closing_sequence = {
        phase: 'not_started',
        turns_in_closing: 0,
        synthesis: null,
        alignment_detected: false,
        user_hesitation_expressed: false,
        facilitation_offered: false,
        closing_arc_complete: false,
        agreed_needs_help: false,
        agreed_to_offering: false,
      }
    }
    if (conversationState.hypothesis_resistance_count === undefined) {
      conversationState.hypothesis_resistance_count = 0
    }
    if (!conversationState.variety_tracker) {
      conversationState.variety_tracker = initializeVarietyTracker()
    }
    if (!conversationState.conversation_memory) {
      conversationState.conversation_memory = initializeConversationMemory()
    }
    if (!conversationState.relationship) {
      conversationState.relationship = {
        engagement: 'medium',
        trust_level: 'establishing',
        disposition: 'collaborative_explorer',
        process_frustration: 'none',
        frustration_target: null,
        confirmed_reflections: 0,
        boundary_set: false,
        frustration_acknowledged_count: 0,
      }
    }
    // Backfill frustration_acknowledged_count for existing sessions
    if (conversationState.relationship && conversationState.relationship.frustration_acknowledged_count === undefined) {
      conversationState.relationship.frustration_acknowledged_count = 0
    }
    if (!conversationState.low_effort_tracking) {
      conversationState.low_effort_tracking = {
        consecutive_low_effort_turns: 0,
        total_low_effort_turns: 0,
        has_pushed_back: false,
        pushback_count: 0
      }
    } else if (conversationState.low_effort_tracking.pushback_count === undefined) {
      conversationState.low_effort_tracking.pushback_count = 0
    }
  } else {
    // Fallback: initialize state if not found
    console.warn('[Orchestrator] No conversation state found, initializing')
    conversationState = initializeState(session.user_name)
  }

  // 4. Save user message
  const userMessage = await addMessage({
    sessionId,
    turnNumber: session.total_turns + 1,
    speaker: 'user',
    messageText: userMessageText,
    phase: conversationState.phase,
    wasVoice,
  })

  // 5. Process turn through orchestrator
  try {
    const result = await processConversationTurn(
      userMessageText,
      history,
      conversationState,
      attachments
    )

    // 6. Save advisor message
    const advisorMessage = await addMessage({
      sessionId,
      turnNumber: session.total_turns + 2,
      speaker: 'advisor',
      messageText: result.advisorResponse,
      phase: result.state.phase,
    })

    // 7. Update session with new state
    // Only set constraint_category when diagnosis is actually confirmed (phase=complete or diagnosis confirmed)
    // Don't set it from hypothesis during exploration - that's just a working theory
    const shouldSetConstraint =
      result.state.phase === 'complete' ||
      (result.state.hypothesis_validated && result.state.consent_state?.diagnosis_confirmed)

    // Map constraint to endpoint (EC or MIST) on completion
    const constraintToEndpoint: Record<string, Endpoint> = {
      strategy: 'EC',
      execution: 'MIST',
      psychology: 'EC',
    }
    const constraint = result.state.constraint_hypothesis || session.constraint_category
    const endpoint = constraint ? constraintToEndpoint[constraint] || null : null

    // Safety net: ensure constraint_summary is never null for complete sessions
    if (shouldSetConstraint && !result.state.constraint_summary && !session.constraint_summary && constraint) {
      console.warn('[OrchestratorService] constraint_summary is null for complete session, generating fallback')
      result.state.constraint_summary = getDefaultSummary(constraint as any)
    }

    await updateSession(sessionId, {
      total_turns: session.total_turns + 2,
      conversation_state: result.state as any,
      current_phase: result.state.phase,
      constraint_category: shouldSetConstraint
        ? (result.state.constraint_hypothesis || session.constraint_category)
        : session.constraint_category,
      constraint_summary: shouldSetConstraint
        ? (result.state.constraint_summary || session.constraint_summary)
        : session.constraint_summary,
      endpoint_selected: (result.state.phase === 'complete' && endpoint)
        ? endpoint
        : session.endpoint_selected,
      clarity_score: mapReadinessToScore(result.state.readiness.clarity),
      confidence_score: mapReadinessToScore(result.state.readiness.confidence),
      capacity_score: mapReadinessToScore(result.state.readiness.capacity),
    })

    // 8. Meta CAPI milestone events (fire-and-forget)
    const prevTurns = session.total_turns
    const newTurns = prevTurns + 2
    if (prevTurns < 10 && newTurns >= 10) {
      sendMetaEvent('EngagedUser', crypto.randomUUID(), {
        ip: requestContext?.ip,
        userAgent: requestContext?.userAgent,
        fbp: requestContext?.fbp,
        fbc: requestContext?.fbc,
        sourceUrl: 'https://advisor.coachmira.ai',
      })
    }
    if (prevTurns < 40 && newTurns >= 40) {
      sendMetaEvent('DeepEngagement', crypto.randomUUID(), {
        ip: requestContext?.ip,
        userAgent: requestContext?.userAgent,
        fbp: requestContext?.fbp,
        fbc: requestContext?.fbc,
        sourceUrl: 'https://advisor.coachmira.ai',
      })
    }

    // 9. Auto-send summary email when session completes with email on file
    // Fire-and-forget: don't block the user's response on email/report generation
    if (result.complete && session.user_email && !session.email_sent) {
      console.log(`[OrchestratorService] Auto-sending summary email to ${session.user_email}`)
      sendSessionSummaryEmail(sessionId)
        .then(emailResult => {
          if (emailResult.success) {
            console.log('[OrchestratorService] Auto-send summary email succeeded')
          } else {
            console.error('[OrchestratorService] Auto-send summary email failed:', emailResult.error)
          }
        })
        .catch(error => {
          console.error('[OrchestratorService] Auto-send summary email error:', error)
        })
    }

    // 9. Get updated session
    const updatedSession = await getSession(sessionId)
    if (!updatedSession) {
      throw new Error('Session not found after update')
    }

    // Use response builder to ensure last_action is always included
    // Pass components for UI rendering (view_summary, save_progress, etc.)
    return buildOrchestratorResult(
      advisorMessage,
      updatedSession,
      result.state,
      result.complete ?? false,
      result.decision?.action,  // Pass the decision action
      userMessage,  // Include the saved user message with cleaned text
      result.components  // UI components triggered by orchestrator
    )
  } catch (error) {
    console.error('[Orchestrator] Error processing turn:', error)
    throw error
  }
}

/**
 * Map readiness level (low/medium/high) to numeric score (1-10)
 */
function mapReadinessToScore(level: string): number {
  switch (level) {
    case 'low': return 3
    case 'medium': return 6
    case 'high': return 9
    default: return 5
  }
}
