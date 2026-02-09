// Signal detection - analyze user responses for emotional and clarity signals

import Anthropic from '@anthropic-ai/sdk'
import type { ConversationSignals, Message, ReadinessLevel } from './types.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function detectSignals(
  userMessage: string,
  history: Message[]
): Promise<ConversationSignals> {

  // Use Haiku for fast, cheap signal analysis
  const analysis = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 500,
    system: `You are a conversation analyzer. Analyze this user message and conversation history.

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "response_length": number,
  "emotional_markers": ["marker1", "marker2"],
  "clarity_level": "low" | "medium" | "high",
  "confidence_level": "low" | "medium" | "high",
  "capacity_signals": ["signal1", "signal2"],
  "contradiction_detected": boolean,
  "overwhelm_detected": boolean,
  "validation_seeking": boolean,
  "ownership_language": boolean
}

Criteria:
- emotional_markers: words like "overwhelmed", "exhausted", "frustrated", "stuck"
- clarity_level: Can they state their issue clearly? (vague = low, some clarity = medium, precise = high)
- confidence_level: Do they own insights or seek validation? (hesitant = low, curious = medium, convicted = high)
- capacity_signals: mentions of "no time", "too busy", "burned out", "can't handle"
- contradiction_detected: Does this message contradict something from history?
- overwhelm_detected: Are they showing emotional flooding/overwhelm?
- validation_seeking: Do they ask "right?", "does that make sense?", "am I wrong?"
- ownership_language: Do they say "that's exactly it", "I know", "definitely"?`,

    messages: [
      {
        role: 'user',
        content: `Current message: "${userMessage}"

Conversation history (last 5 messages):
${history.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

Analyze and return JSON.`
      }
    ]
  })

  try {
    let text = analysis.content[0].type === 'text' ? analysis.content[0].text : '{}'

    // Strip markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    const parsed = JSON.parse(text)

    return parsed as ConversationSignals
  } catch (error) {
    console.error('[Signal Detection] Failed to parse:', error)
    // Fallback to simple detection
    return detectSignalsSimple(userMessage, history)
  }
}

// Simpler regex-based detector (fallback)
export function detectSignalsSimple(
  userMessage: string,
  history: Message[]
): ConversationSignals {

  const responseLength = userMessage.split(' ').length

  const emotionalMarkers = [
    ...userMessage.match(/overwhelmed?|exhausted?|frustrated?|stuck|drained?|burned out/gi) || []
  ]

  const capacitySignals = [
    ...userMessage.match(/no time|too busy|burned out|can't handle|don't have bandwidth/gi) || []
  ]

  const overwhelmDetected =
    /overwhelmed?|too much|can't handle|exhausted?|so many/i.test(userMessage)

  const validationSeeking =
    /right\?|does that make sense|am I wrong|is that correct/i.test(userMessage)

  const ownershipLanguage =
    /that's (exactly )?it|I know|definitely|clearly|I see (it|that) now|exactly|precisely/i.test(userMessage)

  // Simple clarity heuristic
  let clarityLevel: ReadinessLevel = 'medium'
  if (/kind of|sort of|maybe|I guess|not sure/i.test(userMessage)) {
    clarityLevel = 'low'
  } else if (responseLength < 30 && !/(kind of|sort of)/i.test(userMessage)) {
    clarityLevel = 'high'
  }

  // Simple confidence heuristic
  let confidenceLevel: ReadinessLevel = 'medium'
  if (validationSeeking) {
    confidenceLevel = 'low'
  } else if (ownershipLanguage) {
    confidenceLevel = 'high'
  }

  return {
    response_length: responseLength,
    emotional_markers: emotionalMarkers,
    clarity_level: clarityLevel,
    confidence_level: confidenceLevel,
    capacity_signals: capacitySignals,
    contradiction_detected: false, // Would need more sophisticated analysis
    overwhelm_detected: overwhelmDetected,
    validation_seeking: validationSeeking,
    ownership_language: ownershipLanguage
  }
}
