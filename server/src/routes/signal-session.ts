/**
 * Signal Session Agent - API Routes
 *
 * Endpoints for the Signal Session agent that helps users clarify their thinking
 * and produce a creative brief.
 */

import { Router } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import crypto from 'crypto'
import {
  processMessage,
  processOpeningMessage,
  getSessionSummary,
  exportBriefAsMarkdown,
  exportBriefAsJson
} from '../agents/signal-session/index.js'
import type { SignalSessionState, Message } from '../agents/signal-session/index.js'

// Generate UUID using crypto (built-in)
function generateSessionId(): string {
  return crypto.randomUUID()
}

const router = Router()

// In-memory storage for POC (replace with Supabase in production)
const sessions: Map<string, {
  state: SignalSessionState
  messages: Message[]
}> = new Map()

// Rate limiter
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.params.sessionId || ipKeyGenerator(req.ip ?? ''),
  message: { error: 'Too many messages, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
})

const sessionCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many sessions created, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * GET /api/signal-session/sessions
 * List all sessions (for dashboard)
 */
router.get('/sessions', async (_req, res) => {
  try {
    const sessionList = Array.from(sessions.entries()).map(([id, session]) => {
      const summary = getSessionSummary(session.state)
      const firstAssistantMsg = session.messages.find(m => m.role === 'assistant')
      const lastMsg = session.messages[session.messages.length - 1]
      return {
        sessionId: id,
        phase: summary.phase,
        turn: summary.turn,
        hasBrief: summary.hasBrief,
        complete: session.state.phase === 'complete',
        createdAt: session.messages[0]?.timestamp ?? new Date(),
        updatedAt: lastMsg?.timestamp ?? new Date(),
        briefTitle: session.state.generated_brief?.working_title ?? null,
        preview: firstAssistantMsg?.content?.slice(0, 100) ?? null,
      }
    })

    // Sort by most recently updated
    sessionList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    res.json({ sessions: sessionList })
  } catch (error) {
    console.error('Error listing signal sessions:', error)
    res.status(500).json({ error: 'Failed to list sessions' })
  }
})

/**
 * POST /api/signal-session/start
 * Create a new Signal Session and get the opening message
 */
router.post('/start', sessionCreateLimiter, async (req, res) => {
  try {
    const { userContext } = req.body

    // Generate session ID
    const sessionId = generateSessionId()

    // Process opening message
    const result = await processOpeningMessage(sessionId, userContext)

    // Store session
    sessions.set(sessionId, {
      state: result.state,
      messages: [{
        role: 'assistant',
        content: result.message,
        turn_number: 1,
        timestamp: new Date()
      }]
    })

    res.status(201).json({
      sessionId,
      message: result.message,
      phase: result.state.phase,
      turnCount: result.state.turns_total
    })
  } catch (error) {
    console.error('Error starting signal session:', error)
    res.status(500).json({ error: 'Failed to start session' })
  }
})

/**
 * POST /api/signal-session/:sessionId/message
 * Send a message and get a response
 */
router.post('/:sessionId/message', messageLimiter, async (req, res) => {
  try {
    const { sessionId } = req.params
    const { message } = req.body

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' })
    }

    if (message.length > 4000) {
      return res.status(400).json({ error: 'Message too long (max 4000 characters)' })
    }

    // Get session
    const session = sessions.get(sessionId)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Add user message to history
    const userMessage: Message = {
      role: 'user',
      content: message.trim(),
      turn_number: session.messages.length + 1,
      timestamp: new Date()
    }
    session.messages.push(userMessage)

    // Process message
    const result = await processMessage(
      message.trim(),
      session.messages.slice(0, -1), // Exclude the message we just added
      session.state
    )

    // Add assistant response to history
    const assistantMessage: Message = {
      role: 'assistant',
      content: result.message,
      turn_number: session.messages.length + 1,
      timestamp: new Date()
    }
    session.messages.push(assistantMessage)

    // Update session state
    session.state = result.state

    res.json({
      message: result.message,
      phase: result.state.phase,
      turnCount: result.state.turns_total,
      complete: result.complete,
      brief: result.brief,
      decision: {
        action: result.decision.action,
        reasoning: result.decision.reasoning
      }
    })
  } catch (error) {
    console.error('Error processing signal session message:', error)
    res.status(500).json({ error: 'Failed to process message' })
  }
})

/**
 * GET /api/signal-session/:sessionId
 * Get session details
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params

    const session = sessions.get(sessionId)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const summary = getSessionSummary(session.state)

    res.json({
      sessionId,
      ...summary,
      messageCount: session.messages.length
    })
  } catch (error) {
    console.error('Error getting signal session:', error)
    res.status(500).json({ error: 'Failed to get session' })
  }
})

/**
 * GET /api/signal-session/:sessionId/messages
 * Get all messages in the session
 */
router.get('/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params

    const session = sessions.get(sessionId)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    res.json({
      messages: session.messages.map(m => ({
        role: m.role,
        content: m.content,
        turnNumber: m.turn_number,
        timestamp: m.timestamp
      }))
    })
  } catch (error) {
    console.error('Error getting signal session messages:', error)
    res.status(500).json({ error: 'Failed to get messages' })
  }
})

/**
 * GET /api/signal-session/:sessionId/brief
 * Get the generated creative brief (if complete)
 */
router.get('/:sessionId/brief', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { format } = req.query

    const session = sessions.get(sessionId)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    if (!session.state.generated_brief) {
      return res.status(404).json({ error: 'Brief not yet generated' })
    }

    const brief = session.state.generated_brief

    if (format === 'markdown') {
      res.type('text/markdown').send(exportBriefAsMarkdown(brief))
    } else if (format === 'json') {
      res.type('application/json').send(exportBriefAsJson(brief))
    } else {
      res.json({ brief })
    }
  } catch (error) {
    console.error('Error getting signal session brief:', error)
    res.status(500).json({ error: 'Failed to get brief' })
  }
})

/**
 * GET /api/signal-session/:sessionId/state
 * Get the full session state (for debugging)
 */
router.get('/:sessionId/state', async (req, res) => {
  try {
    const { sessionId } = req.params

    const session = sessions.get(sessionId)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    res.json({
      state: session.state
    })
  } catch (error) {
    console.error('Error getting signal session state:', error)
    res.status(500).json({ error: 'Failed to get state' })
  }
})

export default router
