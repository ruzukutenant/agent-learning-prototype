// LLM-based insight quality validation
// Distinguishes real insights from filler words using semantic understanding
// Uses Gemini Flash for speed with Haiku fallback

import { geminiJSON, isGeminiAvailable } from './gemini-client.js'
import Anthropic from '@anthropic-ai/sdk'

/**
 * Assessment of whether a phrase is a quality insight
 */
export interface InsightQuality {
  isQualityInsight: boolean
  confidence: number
  reasoning: string
}

/**
 * Assess whether a phrase is a real insight or just filler/acknowledgment
 *
 * Uses Claude Haiku to understand semantic meaning in context.
 * This is more reliable than regex patterns because it considers:
 * - Full user message context
 * - Conversation history
 * - Depth of self-discovery vs surface acknowledgment
 *
 * Examples:
 * - REAL INSIGHT: "I just realized my real constraint is positioning"
 * - FILLER: "I mean" (no elaboration)
 * - REAL INSIGHT: "exactly - I've been trying to serve everyone"
 * - FILLER: "exactly!" (standalone agreement)
 *
 * @param phrase - Candidate insight phrase extracted from user message
 * @param fullUserMessage - Complete user message for context
 * @param conversationHistory - Last 2-3 turns for context
 * @returns Quality assessment with confidence score
 */
export async function assessInsightQuality(
  phrase: string,
  fullUserMessage: string,
  conversationHistory: string
): Promise<InsightQuality> {

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  })

  const prompt = `Is this phrase a REAL INSIGHT or just FILLER/ACKNOWLEDGMENT?

**USER'S FULL MESSAGE:**
"${fullUserMessage}"

**PHRASE TO ASSESS:**
"${phrase}"

**RECENT CONVERSATION CONTEXT:**
${conversationHistory}

**DEFINITIONS:**

REAL INSIGHT = Self-discovery, realization, owns the problem, shifts understanding
Examples:
- "I just realized..." (followed by actual realization)
- "the real issue is..." (articulates root cause)
- "I've been assuming X but actually..." (self-correction)
- "exactly - I've been trying to serve everyone" (agreement WITH depth)
- "that's it - I don't have a clear framework" (ownership of specific gap)

FILLER = Casual acknowledgment, agreement without depth, transition words
Examples:
- "I mean" (no elaboration)
- "yeah exactly" (no additional insight)
- "could be" (vague agreement)
- "that makes sense" (passive acknowledgment)
- "I guess" (uncertainty without insight)

Return ONLY valid JSON with NO markdown:
{"isQualityInsight": true/false, "confidence": 0.0-1.0, "reasoning": "brief explanation"}`

  try {
    let result: InsightQuality

    // Try Gemini Flash first (faster)
    if (isGeminiAvailable()) {
      try {
        result = await geminiJSON<InsightQuality>(prompt, { maxTokens: 150 })
      } catch (geminiError) {
        console.warn('[Insight Quality] Gemini failed, falling back to Haiku:', geminiError)
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 150,
          temperature: 0,
          messages: [{ role: 'user', content: prompt }]
        })
        const text = response.content[0].type === 'text'
          ? response.content[0].text.replace(/```json|```/g, '').trim()
          : '{}'
        result = JSON.parse(text) as InsightQuality
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
      result = JSON.parse(text) as InsightQuality
    }

    console.log(
      `[Insight Quality] "${phrase}" → ${result.isQualityInsight ? 'INSIGHT' : 'FILLER'} ` +
      `(${result.confidence.toFixed(2)}) - ${result.reasoning}`
    )

    return result

  } catch (error) {
    console.error('[Insight Quality] Validation failed:', error)

    // Simple heuristic fallback (no regex for NLP, just basic rules)
    const fallback = fallbackQualityCheck(phrase)

    console.log(`[Insight Quality] Fallback: "${phrase}" → ${fallback.isQualityInsight ? 'INSIGHT' : 'FILLER'}`)

    return fallback
  }
}

/**
 * Filter a list of candidate insights to only quality ones
 *
 * Validates multiple insights in parallel for performance.
 * Total latency: ~300-400ms for 2-3 insights (parallelized)
 *
 * @param phrases - Candidate insight phrases
 * @param fullMessage - Full user message
 * @param history - Recent conversation history
 * @returns Only the phrases that are quality insights
 */
export async function filterQualityInsights(
  phrases: string[],
  fullMessage: string,
  history: string
): Promise<string[]> {

  // Pre-filter: reject fragments that are too short to be meaningful insights
  // Minimum 25 characters and 5 words to contain actual content
  const MIN_CHARS = 25
  const MIN_WORDS = 5

  const preFiltered = phrases.filter(phrase => {
    const wordCount = phrase.split(/\s+/).length
    if (phrase.length < MIN_CHARS || wordCount < MIN_WORDS) {
      console.log(`[Insight Quality] Pre-filtered (too short): "${phrase}"`)
      return false
    }
    return true
  })

  if (preFiltered.length === 0) {
    console.log('[Insight Quality] No phrases passed pre-filter')
    return []
  }

  // Validate all in parallel
  const validations = await Promise.all(
    preFiltered.map(p => assessInsightQuality(p, fullMessage, history))
  )

  // Filter based on quality and confidence threshold
  const filtered = preFiltered.filter((phrase, i) => {
    const v = validations[i]

    if (!v.isQualityInsight || v.confidence < 0.6) {
      console.log(`[Insight Quality] Filtered out: "${phrase}" - ${v.reasoning}`)
      return false
    }

    return true
  })

  console.log(`[Insight Quality] Kept ${filtered.length}/${phrases.length} insights`)

  return filtered
}

/**
 * Simple fallback quality check for error scenarios
 *
 * Uses basic heuristics, not regex for NLP.
 * Less accurate than LLM but better than nothing.
 *
 * @param phrase - Phrase to check
 * @returns Quality assessment
 */
function fallbackQualityCheck(phrase: string): InsightQuality {
  const lower = phrase.toLowerCase().trim()

  // Very short phrases are usually filler
  if (phrase.split(' ').length < 3) {
    return {
      isQualityInsight: false,
      confidence: 0.8,
      reasoning: 'Too short - likely filler'
    }
  }

  // Common filler starters
  const fillerStarters = [
    'i mean',
    'i guess',
    'maybe',
    'kind of',
    'sort of',
    'yeah',
    'exactly!', // exclamation with no elaboration
    'that makes sense',
    'could be'
  ]

  if (fillerStarters.some(f => lower.startsWith(f) && lower.length < 15)) {
    return {
      isQualityInsight: false,
      confidence: 0.7,
      reasoning: 'Starts with common filler and is short'
    }
  }

  // Insight indicators - but require minimum length to avoid "Wait" or "I just realized" alone
  const insightIndicators = [
    'i just realized',
    'the real issue',
    'the real problem',
    'i\'ve been',
    'that\'s it',
    'i see now',
    'the issue is',
    'i\'m doing exactly',
    'i\'m literally'
  ]

  // Require both an indicator AND meaningful length (at least 25 chars)
  if (phrase.length >= 25 && insightIndicators.some(i => lower.includes(i))) {
    return {
      isQualityInsight: true,
      confidence: 0.6,
      reasoning: 'Contains insight indicator phrase with substantive content'
    }
  }

  // Short phrases without substance are not insights
  if (phrase.length < 25 || phrase.split(' ').length < 5) {
    return {
      isQualityInsight: false,
      confidence: 0.7,
      reasoning: 'Too short to be a meaningful insight'
    }
  }

  // Default: accept medium-length statements
  return {
    isQualityInsight: true,
    confidence: 0.5,
    reasoning: 'Fallback heuristic - medium length statement'
  }
}
