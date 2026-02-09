/**
 * Gemini 3 Flash client wrapper
 * Provides fast, cost-effective LLM calls for analysis tasks
 */

import { GoogleGenAI } from '@google/genai'

// Model constants
export const GEMINI_FLASH = 'gemini-3-flash-preview'
export const GEMINI_PRO = 'gemini-3-pro-preview'

// Lazy-initialized client (checked at call time, not import time)
// This allows env vars to be loaded before first use
let _client: GoogleGenAI | null = null
let _initialized = false

function getClient(): GoogleGenAI {
  if (!_initialized) {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.warn('[Gemini] No API key found. Set GOOGLE_API_KEY or GEMINI_API_KEY env var.')
    }
    _client = apiKey ? new GoogleGenAI({ apiKey }) : null
    _initialized = true
  }
  if (!_client) {
    throw new Error('Gemini client not initialized. Set GOOGLE_API_KEY env var.')
  }
  return _client
}

/**
 * Simple text completion with Gemini 3 Flash
 * Optimized for fast JSON analysis tasks
 */
export async function geminiComplete(
  prompt: string,
  options: {
    systemPrompt?: string
    maxTokens?: number
    temperature?: number
    responseMimeType?: string
  } = {}
): Promise<string> {
  const client = getClient()

  const { systemPrompt, maxTokens = 1024, temperature = 0.3, responseMimeType } = options

  // Build contents with optional system instruction
  const contents = systemPrompt
    ? `${systemPrompt}\n\n${prompt}`
    : prompt

  try {
    const response = await client.models.generateContent({
      model: GEMINI_FLASH,
      contents,
      config: {
        maxOutputTokens: maxTokens,
        temperature,
        ...(responseMimeType && { responseMimeType }),
        // Disable thinking mode for faster, simpler responses
        thinkingConfig: {
          thinkingBudget: 0
        }
      }
    })

    const text = response.text || ''

    if (!text || text.length < 5) {
      console.error('[Gemini] Empty or very short response. Full response object:', JSON.stringify(response, null, 2).slice(0, 500))
      throw new Error('Gemini returned empty or very short response')
    }

    return text
  } catch (error: any) {
    console.error('[Gemini] API call failed:', error?.message || error)
    throw error
  }
}

/**
 * JSON completion - parses response as JSON
 * Handles various Gemini response formats including markdown code blocks
 */
export async function geminiJSON<T>(
  prompt: string,
  options: {
    systemPrompt?: string
    maxTokens?: number
  } = {}
): Promise<T> {
  const systemWithJSON = `${options.systemPrompt || ''}\n\nIMPORTANT: Respond with valid JSON only. No markdown code blocks, no explanation, no backticks. Just the raw JSON object.`.trim()

  let text = await geminiComplete(prompt, {
    ...options,
    systemPrompt: systemWithJSON,
    temperature: 0.1, // Lower temp for JSON
    responseMimeType: 'application/json',
  })

  // Clean up the response - strip markdown code blocks if present
  text = text.trim()

  // Remove ```json ... ``` or ``` ... ``` wrappers
  if (text.startsWith('```')) {
    // Find the end of the opening tag (```json or ```)
    const firstNewline = text.indexOf('\n')
    const closingBackticks = text.lastIndexOf('```')

    if (firstNewline > 0 && closingBackticks > firstNewline) {
      text = text.substring(firstNewline + 1, closingBackticks).trim()
    }
  }

  // Try direct parse
  try {
    return JSON.parse(text)
  } catch (e1) {
    // Try extracting JSON object/array from text
    const objectMatch = text.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0])
      } catch (e2) {
        // Continue to error
      }
    }

    // Try array match
    const arrayMatch = text.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0])
      } catch (e3) {
        // Continue to error
      }
    }

    console.error('[Gemini] JSON parse failed. Raw response:', text.slice(0, 500))
    throw new Error(`Failed to parse Gemini response as JSON: ${text.slice(0, 200)}`)
  }
}

/**
 * Check if Gemini client is available
 */
export function isGeminiAvailable(): boolean {
  try {
    getClient()
    return true
  } catch {
    return false
  }
}

/**
 * Multi-turn conversation completion with Gemini 3 Flash
 * Designed for simulation use cases where we need strong persona consistency
 * over long conversations. Flash offers 1M context with fast, cheap inference.
 */
export async function geminiFlashChat(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options: {
    maxTokens?: number
    temperature?: number
    personaName?: string  // Name of the character being simulated
    otherPartyName?: string  // Name of the other party (to avoid echoing)
  } = {}
): Promise<string> {
  const client = getClient()

  const { maxTokens = 512, temperature = 0.7, personaName = 'the client', otherPartyName = 'the advisor' } = options

  // Build conversation with system prompt as first user message
  // Gemini doesn't have a dedicated system instruction field in this API
  // So we prepend it to the first user message or add as initial context
  const geminiMessages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []

  // Add system prompt as initial context (user message with system instructions)
  // followed by a model acknowledgment
  geminiMessages.push({
    role: 'user',
    parts: [{ text: `SYSTEM INSTRUCTIONS (stay in character throughout):\n\n${systemPrompt}\n\nAcknowledge these instructions briefly.` }]
  })
  geminiMessages.push({
    role: 'model',
    parts: [{ text: 'Understood. I will stay in character as instructed.' }]
  })

  // Add conversation messages (all except the last one)
  for (let i = 0; i < messages.length - 1; i++) {
    const m = messages[i]
    geminiMessages.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })
  }

  // Add the last message with explicit role reminder and anti-echo instructions
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1]
    const antiEchoPrompt = `
---
${otherPartyName.toUpperCase()} SAYS: "${lastMessage.content}"
---

NOW RESPOND AS ${personaName.toUpperCase()}.

CRITICAL RULES:
- You are ${personaName}, NOT ${otherPartyName}
- Respond as the CLIENT receiving advice, not as someone GIVING advice
- Do NOT use phrases like "Let's talk", "Reach out when", "Does that make sense"
- Do NOT give instructions or advice - you are the one RECEIVING the service
- Keep your response in first person from ${personaName}'s perspective
- Stay in character as described in your system instructions

Your response as ${personaName}:`

    geminiMessages.push({
      role: 'user',
      parts: [{ text: antiEchoPrompt }]
    })
  }

  try {
    const response = await client.models.generateContent({
      model: GEMINI_FLASH,
      contents: geminiMessages,
      config: {
        maxOutputTokens: maxTokens,
        temperature,
        // Disable thinking for faster responses in simulation
        thinkingConfig: {
          thinkingBudget: 0
        }
      }
    })

    const text = response.text || ''

    if (!text || text.length < 5) {
      console.error('[Gemini Flash Chat] Empty or very short response')
      throw new Error('Gemini Flash returned empty or very short response')
    }

    return text.trim()
  } catch (error: any) {
    console.error('[Gemini Flash Chat] API call failed:', error?.message || error)
    throw error
  }
}
