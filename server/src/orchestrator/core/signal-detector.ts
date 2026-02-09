// Signal detection - analyze user responses for emotional and clarity signals

import { geminiJSON, isGeminiAvailable } from './gemini-client.js'
import Anthropic from '@anthropic-ai/sdk'
import type { ConversationSignals, Message, ReadinessLevel } from './types.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SIGNAL_SYSTEM_PROMPT = `You are a conversation analyzer. Analyze this user message IN CONTEXT of the conversation history.

IMPORTANT: Look for patterns across the conversation, not just the current message. Consider:
- How their clarity is evolving (getting clearer or more confused?)
- Emotional patterns (building overwhelm, or settling down?)
- Contradictions between current message and earlier statements
- Shifts in confidence or ownership
- Moments of insight and breakthrough understanding
- Resistance to ideas or hypotheses presented
- Commitment and readiness signals

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
  "ownership_language": boolean,
  "insight_articulated": boolean,
  "breakthrough_language": ["phrase1", "phrase2"],
  "contradiction_present": boolean,
  "resistance_to_hypothesis": boolean,
  "stress_test_passed": boolean,
  "blocker_mentioned": boolean,
  "commitment_language": boolean,
  "positive_emotion_detected": boolean,
  "negative_overwhelm_detected": boolean,
  "meta_cognition_detected": boolean
}

Criteria:
- emotional_markers: words like "overwhelmed", "exhausted", "frustrated", "stuck" in CURRENT message
- clarity_level: Can they state their issue clearly NOW, considering the whole conversation? (vague = low, some clarity = medium, precise = high)
- confidence_level: Do they own insights or seek validation? Look at trajectory across messages. (hesitant = low, curious = medium, convicted = high)
- capacity_signals: mentions of "no time", "too busy", "burned out", "can't handle" in CURRENT message
- contradiction_detected: Does current message contradict something from earlier in conversation history?
- overwhelm_detected: Are they showing emotional flooding/overwhelm in current message?
- validation_seeking: Do they ask "right?", "does that make sense?", "am I wrong?" in CURRENT message
- ownership_language: Do they say "that's exactly it", "I know", "definitely" in CURRENT message
- insight_articulated: Are they expressing a clear realization or breakthrough about their situation? (e.g., connecting dots, seeing patterns)
- breakthrough_language: Specific phrases showing discovery like "oh!", "I see now", "that's exactly it", "that makes sense", "I hadn't thought of it that way"
- contradiction_present: Is there internal contradiction in CURRENT message itself (not just vs history)?
- resistance_to_hypothesis: Are they pushing back against or questioning an idea/hypothesis presented by the advisor?
- stress_test_passed: If a hypothesis was presented, are they confirming it holds up against their reality?
- blocker_mentioned: Do they mention something preventing action? (time, money, fear, other priorities)
- commitment_language: Do they express readiness to take action? ("I'm ready", "let's do this", "I want to start", "I'm excited to work on", "this is important to me")
- positive_emotion_detected: Excitement, clarity, breakthrough emotion ("exactly!", "I see it now", "oh wow", "excited", "clear", "confident", "that's it")
- negative_overwhelm_detected: Distress, flooding, can't cope ("too much", "drowning", "can't handle", "exhausted", "breaking down", "overwhelmed")
- meta_cognition_detected: User questions their own framing, self-corrects ("I've been thinking X but actually...", "Wait, that's not right...", "I thought... but really...", "Actually, the real problem is...")`

export async function detectSignals(
  userMessage: string,
  history: Message[]
): Promise<ConversationSignals> {
  const prompt = `Current message: "${userMessage}"

Conversation history (last 5 messages):
${history.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

Analyze and return JSON.`

  // Try Gemini Flash first (faster and cheaper)
  if (isGeminiAvailable()) {
    try {
      const result = await geminiJSON<ConversationSignals>(prompt, {
        systemPrompt: SIGNAL_SYSTEM_PROMPT,
        maxTokens: 500
      })
      return result
    } catch (error) {
      console.warn('[Signal Detection] Gemini failed, falling back to Haiku:', error)
    }
  }

  // Fallback to Haiku
  const analysis = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 500,
    system: SIGNAL_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
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

  // Recursive prompting signals
  // Extract FULL SENTENCES containing breakthrough indicators, not just the trigger phrases
  const breakthroughPattern = /\boh!|\baha!|I see now|that's exactly it|that makes sense|I hadn't thought of it that way|now I understand|that clicks|that resonates|I (just )?realized|wait[,.]?\s*I|actually[,.]?\s*(the|I|my)/i

  // Split into sentences and find those containing breakthrough language
  const sentences = userMessage.split(/(?<=[.!?])\s+/)
  const breakthroughLanguage = sentences.filter(sentence =>
    sentence.length >= 15 && breakthroughPattern.test(sentence)
  )

  const insightArticulated =
    breakthroughLanguage.length > 0 ||
    /I (just )?realized|it's (really )?about|the (real )?issue is|what I'm (really )?seeing/i.test(userMessage)

  const contradictionPresent =
    /but (also|at the same time)|on one hand.*on the other|I (want|need) to.*but I (can't|don't)/i.test(userMessage)

  const resistanceToHypothesis =
    /I don't (think|know if)|I'm not sure (that's|if)|but (what about|isn't)|yes but/i.test(userMessage)

  const stressTestPassed =
    /that (really )?fits|that's accurate|that (really )?resonates|yes (exactly|that's right)|that makes sense|I can see that/i.test(userMessage)

  const blockerMentioned =
    /can't afford|don't have time|too expensive|not ready|maybe later|need to (think|wait)|other priorities/i.test(userMessage)

  // Enhanced commitment language detection (FIX: Bug #3)
  const commitmentLanguage =
    /I'm (excited|ready|committed|determined)|I (really )?want to (work on|do|fix|solve)|this is (important|critical|essential) to me|(let's|I need to) (do this|move forward|take action)|I'm (in|all in)|count me in|how do (I|we) (start|begin)|what's next/i.test(userMessage)

  // Positive vs negative emotion detection (FIX: Bug #2)
  const positiveEmotionDetected =
    /exactly!?|yes!?|that's (exactly )?it|I see (it|now)|wait,? I|oh wow|aha!?|I just realized|excited|clear|confident|ready|that clicks|that resonates/i.test(userMessage)

  const negativeOverwhelmDetected =
    /overwhelm(ed|ing)?|drowning|too much|can't handle|exhausted?|burnt out|can't do this|give up|breaking down/i.test(userMessage)

  // Meta-cognition detection (FIX: Bug #6)
  const metaCognitionDetected =
    /I've been thinking .* but (that's not|I realize|actually)|I thought .* but (actually|really)|wait.* I just realized|the (real|actual) (problem|issue) (isn't|is not) .* (it's|is)|I was wrong about|I need to rethink/i.test(userMessage)

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
    ownership_language: ownershipLanguage,
    insight_articulated: insightArticulated,
    breakthrough_language: breakthroughLanguage,
    contradiction_present: contradictionPresent,
    resistance_to_hypothesis: resistanceToHypothesis,
    stress_test_passed: stressTestPassed,
    blocker_mentioned: blockerMentioned,
    commitment_language: commitmentLanguage,
    positive_emotion_detected: positiveEmotionDetected,
    negative_overwhelm_detected: negativeOverwhelmDetected,
    meta_cognition_detected: metaCognitionDetected
  }
}
