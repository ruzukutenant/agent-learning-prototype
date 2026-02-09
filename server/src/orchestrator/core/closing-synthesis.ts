// Closing Synthesis Builder
// Builds the internal reasoning object that drives dynamic closing language
// Key insight from Danny: "The close shouldn't be a moment - it should be the
// natural continuation of a conversation that's already in motion."

import Anthropic from '@anthropic-ai/sdk'
import { geminiJSON, isGeminiAvailable } from './gemini-client.js'
import type {
  ClosingSynthesis,
  ConversationState,
  Message,
  ConstraintCategory
} from './types.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CLOSING_SYNTHESIS_PROMPT = `You are analyzing a coaching conversation to prepare for the closing sequence.

Your job is to extract everything needed to personalize a warm, enrollment-professional-style close.

## Conversation History
{{history}}

## Current State
Confirmed constraint: {{constraint}}
Diagnosis delivered: {{diagnosis_delivered}}
User name: {{user_name}}

## Your Analysis

Extract the following from the conversation. Be specific - use actual quotes and details.

Respond with JSON only (no markdown code blocks):

{
  "confirmed_constraint": "strategy" | "execution" | "psychology",

  "user_stated_future": [
    "Quote or paraphrase of desired outcomes they mentioned",
    "What they said they want to achieve"
  ],

  "user_stated_stakes": [
    "Quote or paraphrase of costs/frustrations they named",
    "What they said they're losing or struggling with"
  ],

  "attempted_solutions": [
    "What they've already tried to fix this",
    "Past attempts mentioned"
  ],

  "stall_reason": "Why self-resolution has stalled - the structural reason",

  "personality_style": {
    "directness": "direct" | "reflective",
    "thinking": "strategic" | "tactical",
    "pace": "fast" | "cautious",
    "verbosity": "concise" | "verbose"
  },

  "emotional_tone": "energized" | "frustrated" | "thoughtful" | "ambivalent",

  "capability_gap": "What's missing - framed as mechanical capability, NOT motivation",

  "why_self_resolution_fails": "Why trying harder won't work - the structural reason",

  "recommended_support_category": "Type of help that resolves this class of problem",

  "stakes_to_foreground": [
    "Which 1-2 stakes to emphasize in the close",
    "The most compelling ones for this user"
  ],

  "language_compression": "tight" | "expansive",

  "pacing_approach": "momentum" | "stabilize" | "reasoning" | "inevitability"
}

## Field Guidance

**user_stated_future**: What did they say they WANT? Look for:
- Goals mentioned ("I want to...", "I'm trying to...")
- Desired outcomes ("If I could just...", "My goal is...")
- Vision statements

**user_stated_stakes**: What did they say they're LOSING or STRUGGLING with? Look for:
- Frustrations expressed
- Costs mentioned (time, money, energy, opportunities)
- Pain points articulated

**attempted_solutions**: What have they ALREADY TRIED? Look for:
- Past efforts mentioned
- Things they've tried that didn't work
- Strategies attempted

**stall_reason**: Why can't they solve this themselves? This is CRITICAL.
- What's the structural barrier?
- Why would more effort not work?
- What's the real blocker?

**personality_style**:
- directness: Do they speak in direct statements or explore reflectively?
- thinking: Do they focus on big picture strategy or step-by-step tactics?
- pace: Do they want to move fast or take time to consider?
- verbosity: Do they use brief responses or elaborate explanations?

**emotional_tone**:
- energized: Excited, ready to act, forward momentum
- frustrated: Stuck, annoyed, wants resolution
- thoughtful: Contemplative, processing, analytical
- ambivalent: Mixed feelings, uncertain, conflicted

**capability_gap**: CRITICAL - This must be framed as MECHANICAL, not MOTIVATIONAL.
- NOT: "They need more motivation/discipline"
- YES: "They need external structure/sequencing/perspective"

**why_self_resolution_fails**: Why will trying harder NOT work?
- What's the structural reason?
- What's missing that they can't generate alone?

**recommended_support_category**: What TYPE of help resolves this?
- For strategy: "positioning specialist", "clarity expert"
- For execution: "systems designer", "implementation support"
- For psychology: "pattern work", "internal blocks specialist"

**language_compression**:
- tight: Strategic thinkers get tighter, higher-level reasoning
- expansive: Tactical thinkers get more concrete mechanics

**pacing_approach**:
- momentum: For energized users - keep the forward motion
- stabilize: For overwhelmed users - slow and steady
- reasoning: For skeptical users - emphasize logic
- inevitability: For ambivalent users - emphasize natural progression`

/**
 * Build closing synthesis from conversation history
 * This extracts everything needed to generate personalized closing language
 */
export async function buildClosingSynthesis(
  history: Message[],
  state: ConversationState
): Promise<ClosingSynthesis> {

  // Build conversation history string
  const historyText = history.map(m =>
    `${m.role.toUpperCase()}: ${m.content}`
  ).join('\n\n')

  const prompt = CLOSING_SYNTHESIS_PROMPT
    .replace('{{history}}', historyText)
    .replace('{{constraint}}', state.constraint_hypothesis || 'unknown')
    .replace('{{diagnosis_delivered}}', String(state.diagnosis_delivered))
    .replace('{{user_name}}', state.user_name || 'User')

  // Try Gemini first (faster and cheaper)
  if (isGeminiAvailable()) {
    try {
      const result = await geminiJSON<Partial<ClosingSynthesis>>(prompt, {
        systemPrompt: 'You are a conversation analyzer. Return only valid JSON.',
        maxTokens: 1200
      })
      console.log('[ClosingSynthesis] Gemini result:', summarizeSynthesis(result))
      return validateAndFillDefaults(result, state.constraint_hypothesis)
    } catch (error) {
      console.warn('[ClosingSynthesis] Gemini failed, falling back to Haiku:', error)
    }
  }

  // Fallback to Haiku
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

  try {
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleanText) as Partial<ClosingSynthesis>
    console.log('[ClosingSynthesis] Haiku result:', summarizeSynthesis(parsed))
    return validateAndFillDefaults(parsed, state.constraint_hypothesis)
  } catch (error) {
    console.error('[ClosingSynthesis] Failed to parse response:', error)
    return getDefaultSynthesis(state.constraint_hypothesis)
  }
}

/**
 * Validate synthesis and fill in defaults for missing fields
 */
function validateAndFillDefaults(
  synthesis: Partial<ClosingSynthesis>,
  constraint: ConstraintCategory | null
): ClosingSynthesis {
  return {
    confirmed_constraint: synthesis.confirmed_constraint || constraint,
    user_stated_future: synthesis.user_stated_future || [],
    user_stated_stakes: synthesis.user_stated_stakes || [],
    attempted_solutions: synthesis.attempted_solutions || [],
    stall_reason: synthesis.stall_reason || 'Unable to determine stall reason',

    personality_style: {
      directness: synthesis.personality_style?.directness || 'reflective',
      thinking: synthesis.personality_style?.thinking || 'tactical',
      pace: synthesis.personality_style?.pace || 'cautious',
      verbosity: synthesis.personality_style?.verbosity || 'verbose'
    },

    emotional_tone: synthesis.emotional_tone || 'thoughtful',

    capability_gap: synthesis.capability_gap || getDefaultCapabilityGap(constraint),
    why_self_resolution_fails: synthesis.why_self_resolution_fails || getDefaultWhySelfResolutionFails(constraint),
    recommended_support_category: synthesis.recommended_support_category || getDefaultSupportCategory(constraint),

    stakes_to_foreground: synthesis.stakes_to_foreground || synthesis.user_stated_stakes?.slice(0, 2) || [],
    language_compression: synthesis.language_compression || 'expansive',
    pacing_approach: synthesis.pacing_approach || 'reasoning'
  }
}

/**
 * Get default capability gap based on constraint
 */
function getDefaultCapabilityGap(constraint: ConstraintCategory | null): string {
  switch (constraint) {
    case 'strategy':
      return 'external positioning lens and decision framework'
    case 'execution':
      return 'system design and implementation sequencing'
    case 'psychology':
      return 'working through internal patterns with objective support'
    default:
      return 'structured support to move from insight to action'
  }
}

/**
 * Get default explanation for why self-resolution fails
 */
function getDefaultWhySelfResolutionFails(constraint: ConstraintCategory | null): string {
  switch (constraint) {
    case 'strategy':
      return 'You cannot clarity your way out of this without an external lens - you are too close to see the patterns clearly'
    case 'execution':
      return 'This does not move until someone helps you design and sequence the systems - trying harder at the same approach produces the same results'
    case 'psychology':
      return 'Internal patterns do not resolve through effort alone - they require working through the underlying blocks with support'
    default:
      return 'The structural nature of this constraint means individual effort cannot resolve it'
  }
}

/**
 * Get default support category based on constraint
 */
function getDefaultSupportCategory(constraint: ConstraintCategory | null): string {
  switch (constraint) {
    case 'strategy':
      return 'positioning and clarity specialist'
    case 'execution':
      return 'systems design and implementation support'
    case 'psychology':
      return 'someone who works with internal patterns and blocks'
    default:
      return 'structured support for this class of challenge'
  }
}

/**
 * Get default synthesis for error cases
 */
function getDefaultSynthesis(constraint: ConstraintCategory | null): ClosingSynthesis {
  return validateAndFillDefaults({}, constraint)
}

/**
 * Summarize synthesis for logging
 */
function summarizeSynthesis(synthesis: Partial<ClosingSynthesis>): object {
  return {
    constraint: synthesis.confirmed_constraint,
    stakes_count: synthesis.user_stated_stakes?.length || 0,
    emotional_tone: synthesis.emotional_tone,
    capability_gap: synthesis.capability_gap?.substring(0, 50) + '...',
    pacing: synthesis.pacing_approach
  }
}

/**
 * Format synthesis for injection into prompts
 * This creates the context block that gets added to closing overlays
 */
export function formatSynthesisForPrompt(synthesis: ClosingSynthesis): string {
  const parts: string[] = []

  parts.push('## CLOSING SYNTHESIS (Use this to personalize your response)')
  parts.push('')

  // User's goals (with null check)
  if (synthesis.user_stated_future?.length > 0) {
    parts.push('**What they want (in their words):**')
    synthesis.user_stated_future.forEach(f => parts.push(`- "${f}"`))
    parts.push('')
  }

  // Stakes to foreground (with null check)
  if (synthesis.stakes_to_foreground?.length > 0) {
    parts.push('**Stakes to emphasize:**')
    synthesis.stakes_to_foreground.forEach(s => parts.push(`- "${s}"`))
    parts.push('')
  }

  // What they've tried (with null check)
  if (synthesis.attempted_solutions?.length > 0) {
    parts.push('**What they\'ve already tried:**')
    synthesis.attempted_solutions.forEach(a => parts.push(`- ${a}`))
    parts.push('')
  }

  // The capability gap
  if (synthesis.capability_gap) {
    parts.push('**The missing piece (frame as mechanical, not motivational):**')
    parts.push(synthesis.capability_gap)
    parts.push('')
  }

  // Why self-resolution fails
  if (synthesis.why_self_resolution_fails) {
    parts.push('**Why trying harder won\'t work:**')
    parts.push(synthesis.why_self_resolution_fails)
    parts.push('')
  }

  // Support recommendation
  if (synthesis.recommended_support_category) {
    parts.push('**Type of support that resolves this:**')
    parts.push(synthesis.recommended_support_category)
    parts.push('')
  }

  // Personalization guidance (with null checks)
  parts.push('**Personalization:**')
  parts.push(`- Tone: ${synthesis.emotional_tone || 'warm'}`)
  parts.push(`- Pacing: ${synthesis.pacing_approach || 'moderate'}`)
  parts.push(`- Language: ${synthesis.language_compression === 'tight' ? 'Be concise, higher-level' : 'Be more concrete and detailed'}`)
  parts.push(`- Style: ${synthesis.personality_style?.directness === 'direct' ? 'Be direct' : 'Be more exploratory'}`)

  return parts.join('\n')
}
