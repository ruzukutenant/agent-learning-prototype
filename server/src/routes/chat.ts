import { Router } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { processMessage } from '../services/ai/conversation.js'
import { processMessageWithOrchestrator } from '../services/orchestratorService.js'
import { getMessages, getSession } from '../services/session.js'
import { cleanupTranscription } from '../services/transcription-cleanup.js'
import { SESSION_MAX_AGE_DAYS, MAX_MESSAGE_LENGTH } from '../config/constants.js'

const router = Router()

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.params.sessionId || ipKeyGenerator(req.ip ?? ''),
  message: { error: 'Too many messages, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Attachment type from frontend
interface MessageAttachment {
  url: string
  type: 'image' | 'pdf'
  name: string
}

// POST /api/chat/:sessionId/message - Send message and get AI response
// Supports both orchestrator and legacy prompt-based conversation
router.post('/:sessionId/message', chatLimiter, async (req, res) => {
  try {
    const { sessionId } = req.params
    const { message, wasVoice = false, useOrchestrator = true, attachments, meta_fbp, meta_fbc } = req.body as {
      message: string
      wasVoice?: boolean
      useOrchestrator?: boolean
      attachments?: MessageAttachment[]
      meta_fbp?: string
      meta_fbc?: string
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' })
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` })
    }

    // Check session expiration
    const session = await getSession(sessionId)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }
    const ageDays = (Date.now() - new Date(session.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (ageDays > SESSION_MAX_AGE_DAYS) {
      return res.status(410).json({ error: 'Session expired', expired: true })
    }

    // Clean up voice transcription if needed
    const cleanedMessage = wasVoice
      ? await cleanupTranscription(message.trim())
      : message.trim()

    // Use orchestrator by default, fall back to legacy if requested
    const result = useOrchestrator
      ? await processMessageWithOrchestrator(sessionId, cleanedMessage, wasVoice, attachments, {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          fbp: meta_fbp,
          fbc: meta_fbc,
        })
      : await processMessage(sessionId, cleanedMessage, wasVoice)

    res.json(result)
  } catch (error) {
    console.error('Error processing message:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    res.status(500).json({ error: 'Failed to process message' })
  }
})

// POST /api/chat/cleanup-voice - Clean up voice transcription only (fast, ~1-2s)
// This returns quickly so the UI can show the cleaned text while Mira's response loads
router.post('/cleanup-voice', chatLimiter, async (req, res) => {
  try {
    const { text } = req.body as { text: string }

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' })
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Text too long (max ${MAX_MESSAGE_LENGTH} characters)` })
    }

    const cleanedText = await cleanupTranscription(text.trim())
    res.json({ cleanedText })
  } catch (error) {
    console.error('Error cleaning voice transcription:', error)
    res.status(500).json({ error: 'Failed to clean transcription' })
  }
})

// GET /api/chat/:sessionId/messages - Get all messages
router.get('/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params

    // Check session expiration
    const session = await getSession(sessionId)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }
    const ageDays = (Date.now() - new Date(session.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (ageDays > SESSION_MAX_AGE_DAYS) {
      return res.status(410).json({ error: 'Session expired', expired: true })
    }

    const messages = await getMessages(sessionId)
    // Strip internal orchestrator signals from public response
    const publicMessages = messages.map(({ detected_signals, ...msg }: any) => msg)
    res.json({ messages: publicMessages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

export default router
