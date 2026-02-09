// LLM-based semantic constraint category mapping
// Maps free-text descriptions to valid enum values
// Uses Gemini Flash for speed with Haiku fallback

import { geminiComplete, isGeminiAvailable } from './gemini-client.js'
import Anthropic from '@anthropic-ai/sdk'
import type { ConstraintCategory } from './types.js'
import { validateConstraintCategory } from './validation-schemas.js'

/**
 * Map a free-text constraint description to a valid ConstraintCategory enum
 *
 * Uses Claude Haiku for semantic understanding rather than regex patterns.
 * This is more reliable and handles any phrasing, including future variations.
 *
 * Examples:
 * - "Unclear Service Offering" → "strategy"
 * - "Won't launch despite having clarity" → "execution"
 * - "Burned out and depleted" → "psychology"
 * - "Fear of being judged" → "psychology"
 *
 * @param rawCategory - Free-text constraint description from LLM
 * @returns Valid ConstraintCategory or null if unmappable
 */
export async function mapConstraintCategory(
  rawCategory: string | null
): Promise<ConstraintCategory | null> {

  if (!rawCategory) {
    return null
  }

  // Quick exact match check (fast path)
  const normalized = rawCategory.toLowerCase().trim()
  if (normalized === 'strategy' || normalized === 'execution' || normalized === 'psychology') {
    console.log(`[Constraint Mapper] Exact match: "${rawCategory}" → "${normalized}"`)
    return normalized as ConstraintCategory
  }

  // Use LLM for semantic mapping
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  })

  const prompt = `Map this constraint description to ONE of these categories:

**Categories:**
- strategy (unclear WHAT to do: positioning, niche, offer clarity, messaging, who to serve)
- execution (need systems/help: doing everything themselves, bottlenecked, no delegation, can't scale)
- psychology (internal blocks: fear, imposter syndrome, burnout, exhaustion, self-doubt, permission issues, perfectionism driven by fear, avoidance patterns)

IMPORTANT: If someone KNOWS what to do but doesn't do it due to FEAR or SELF-DOUBT, that is PSYCHOLOGY, not execution.
Execution is about needing systems/help/delegation. Psychology is about internal blocks.

**Description:** "${rawCategory}"

Return ONLY one word: "strategy", "execution", or "psychology"

Do NOT explain. Do NOT add punctuation. Just the single word.`

  try {
    let text: string

    // Try Gemini Flash first (faster)
    if (isGeminiAvailable()) {
      try {
        text = await geminiComplete(prompt, { maxTokens: 10, temperature: 0.1 })
        text = text.trim().toLowerCase()
      } catch (geminiError) {
        console.warn('[Constraint Mapper] Gemini failed, falling back to Haiku:', geminiError)
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 10,
          temperature: 0,
          messages: [{ role: 'user', content: prompt }]
        })
        text = response.content[0].type === 'text'
          ? response.content[0].text.trim().toLowerCase()
          : ''
      }
    } else {
      // Haiku fallback
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 10,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }]
      })
      text = response.content[0].type === 'text'
        ? response.content[0].text.trim().toLowerCase()
        : ''
    }

    // Validate the LLM response using Zod
    const validated = validateConstraintCategory(text)

    if (validated) {
      console.log(`[Constraint Mapper] Mapped: "${rawCategory}" → "${validated}"`)
      return validated
    }

    console.warn(`[Constraint Mapper] LLM returned invalid category: "${text}"`)

    // Fallback: Try simple keyword matching as last resort
    return fallbackMapping(rawCategory)

  } catch (error) {
    console.error('[Constraint Mapper] LLM call failed:', error)

    // Fallback on error
    return fallbackMapping(rawCategory)
  }
}

/**
 * Simple fallback mapping for offline/error scenarios
 *
 * Uses basic keyword lookup table. Less reliable than LLM but better than nothing.
 * Only used when LLM call fails or returns invalid response.
 *
 * @param text - Raw constraint description
 * @returns Best-guess ConstraintCategory or null
 */
function fallbackMapping(text: string): ConstraintCategory | null {
  const lower = text.toLowerCase()

  // Strategy keywords
  const strategyKeywords = [
    'unclear', 'undefined', 'don\'t know what', 'which offer', 'which path',
    'positioning', 'who to serve', 'niche', 'messaging', 'clarity',
    'audience', 'market', 'offer', 'service offering'
  ]

  // Execution keywords (systems/delegation needs)
  const executionKeywords = [
    'doing everything', 'bottleneck', 'no team', 'can\'t delegate',
    'no systems', 'falling through', 'overwhelmed with tasks',
    'need help', 'can\'t scale', 'too much on my plate'
  ]

  // Psychology keywords (internal blocks)
  const psychologyKeywords = [
    'burnout', 'depleted', 'exhausted', 'can\'t sustain', 'boundary',
    'over-giving', 'drained', 'tired', 'overwhelmed', 'too much',
    'fear', 'afraid', 'imposter', 'self-doubt', 'who am i', 'permission',
    'judged', 'judgment', 'scared', 'anxious', 'avoidance', 'avoiding'
  ]

  // Check each category
  if (strategyKeywords.some(kw => lower.includes(kw))) {
    console.log(`[Constraint Mapper] Fallback: "${text}" → "strategy"`)
    return 'strategy'
  }

  if (executionKeywords.some(kw => lower.includes(kw))) {
    console.log(`[Constraint Mapper] Fallback: "${text}" → "execution"`)
    return 'execution'
  }

  if (psychologyKeywords.some(kw => lower.includes(kw))) {
    console.log(`[Constraint Mapper] Fallback: "${text}" → "psychology"`)
    return 'psychology'
  }

  // Default to strategy for unclear cases (most common)
  console.log(`[Constraint Mapper] Fallback: "${text}" → "strategy" (default)`)
  return 'strategy'
}
