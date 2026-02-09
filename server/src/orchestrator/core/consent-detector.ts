// LLM-based consent detection
// Detects whether user has consented to proceed with diagnosis
// Uses Gemini Flash for speed with Haiku fallback

import { geminiJSON, isGeminiAvailable } from './gemini-client.js'
import Anthropic from '@anthropic-ai/sdk'

/**
 * Result of consent detection
 */
export interface ConsentResult {
  consented: boolean
  confidence: number
  reasoning: string
}

/**
 * Detect whether user consented to proceed with diagnosis
 *
 * Uses Claude Haiku to understand semantic meaning, not pattern matching.
 * This handles nuanced responses like:
 * - "Sure, go ahead" → consent
 * - "I guess..." → unclear (low confidence)
 * - "Not yet, I want to think more" → decline
 * - "Yes, I'd love to hear your thoughts" → consent
 *
 * @param userMessage - The user's response to consent request
 * @param consentContext - What we asked them to consent to
 * @returns Consent detection result with confidence
 */
export async function detectConsentFromMessage(
  userMessage: string,
  consentContext: string
): Promise<ConsentResult> {

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  })

  const prompt = `Did the user consent to proceed?

**CONTEXT:** We asked the user: "${consentContext}"

**USER'S RESPONSE:** "${userMessage}"

**DEFINITIONS:**

CONSENT (consented: true):
- Clear affirmative: "yes", "sure", "go ahead", "let's do it", "I'm ready"
- Affirmative with elaboration: "Yes, I'd love to hear", "Please, tell me what you see"
- Implied consent with engagement: "I'm curious what you think", "What are you seeing?"
- Agreement that we're on track: "I think you're on track", "that resonates", "that's right"
- Gradual/hesitant consent: "hmmm... yeah I think so", "I think that's accurate", "you might be right"

DECLINE (consented: false):
- Explicit no: "not yet", "hold on", "wait"
- Hesitation without resolution: "I'm not sure", "let me think"
- Deflection: changes topic, asks unrelated question
- Disagreement: "that doesn't feel right", "I'm not seeing it that way"

IMPORTANT - GRADUAL CONSENT:
Users often hesitate before agreeing. Focus on their FINAL position, not initial hesitation:
- "hmmm... no I think you are on track" → CONSENT (starts hesitant but concludes with agreement)
- "I don't know... maybe you're right" → CONSENT (concludes with agreement)
- "let me think... actually yes" → CONSENT (concludes with yes)
- "hmm, I'm not sure that's it" → DECLINE (concludes with doubt)

UNCLEAR (low confidence):
- Vague responses: "I guess", "maybe" (without resolution)
- Mixed signals that don't resolve

Return ONLY valid JSON with NO markdown:
{"consented": true/false, "confidence": 0.0-1.0, "reasoning": "brief explanation"}`

  try {
    let result: ConsentResult

    // Try Gemini Flash first (faster)
    if (isGeminiAvailable()) {
      try {
        result = await geminiJSON<ConsentResult>(prompt, { maxTokens: 150 })
      } catch (geminiError) {
        console.warn('[Consent Detection] Gemini failed, falling back to Haiku:', geminiError)
        // Fall through to Haiku
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 150,
          temperature: 0,
          messages: [{ role: 'user', content: prompt }]
        })
        const text = response.content[0].type === 'text'
          ? response.content[0].text.replace(/```json|```/g, '').trim()
          : '{}'
        result = JSON.parse(text) as ConsentResult
      }
    } else {
      // Haiku fallback
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 150,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }]
      })
      const text = response.content[0].type === 'text'
        ? response.content[0].text.replace(/```json|```/g, '').trim()
        : '{}'
      result = JSON.parse(text) as ConsentResult
    }

    console.log(
      `[Consent Detection] "${userMessage.substring(0, 50)}..." → ` +
      `${result.consented ? 'CONSENT' : 'DECLINE'} (${result.confidence.toFixed(2)}) - ${result.reasoning}`
    )

    return result

  } catch (error) {
    console.error('[Consent Detection] Detection failed:', error)

    // Fallback: require explicit affirmative for consent
    const fallback = fallbackConsentCheck(userMessage)

    console.log(
      `[Consent Detection] Fallback: "${userMessage.substring(0, 30)}..." → ` +
      `${fallback.consented ? 'CONSENT' : 'DECLINE'}`
    )

    return fallback
  }
}

/**
 * Simple fallback consent check for error scenarios
 *
 * Conservative approach: only consent on clear affirmatives.
 * Better to ask again than to proceed without consent.
 *
 * @param userMessage - User's response
 * @returns Consent result (conservative)
 */
function fallbackConsentCheck(userMessage: string): ConsentResult {
  const lower = userMessage.toLowerCase().trim()

  // Clear affirmatives
  const affirmatives = [
    'yes',
    'sure',
    'go ahead',
    'please',
    'tell me',
    "i'd love to",
    'i want to hear',
    'absolutely',
    'definitely',
    "let's do it",
    "i'm ready",
    'that resonates',
    "you're on track",
    "you are on track",
    "that's right",
    "that's accurate",
    "you might be right",
    "i think so",
    "makes sense"
  ]

  // Clear negatives - only if they appear without resolution
  const negatives = [
    'not yet',
    'hold on',
    'wait',
    'let me think',
    "i'm not sure",
    'maybe later',
    "doesn't feel right",
    "not seeing it"
  ]

  // Check for gradual consent patterns (hesitation followed by agreement)
  // These override negatives if they appear at the end
  const gradualConsentPatterns = [
    /hmm.*on track/i,
    /hmm.*right/i,
    /hmm.*yes/i,
    /hmm.*resonates/i,
    /think.*on track/i,
    /think.*right/i,
    /actually.*yes/i,
    /maybe.*right/i
  ]

  if (gradualConsentPatterns.some(p => p.test(lower))) {
    return {
      consented: true,
      confidence: 0.75,
      reasoning: 'Fallback: gradual consent pattern (hesitation then agreement)'
    }
  }

  if (affirmatives.some(a => lower.includes(a))) {
    return {
      consented: true,
      confidence: 0.7,
      reasoning: 'Fallback: contains affirmative phrase'
    }
  }

  if (negatives.some(n => lower.includes(n))) {
    return {
      consented: false,
      confidence: 0.7,
      reasoning: 'Fallback: contains negative phrase'
    }
  }

  // Default: unclear, treat as not consented (conservative)
  return {
    consented: false,
    confidence: 0.4,
    reasoning: 'Fallback: unclear response, defaulting to no consent'
  }
}
