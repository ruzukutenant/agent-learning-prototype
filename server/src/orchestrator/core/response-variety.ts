// Response variety system to prevent formulaic language
// Tracks phrase usage and ensures rotation to keep conversations feeling natural

import type { VarietyTracker } from './types.js'

/**
 * Insight celebration openers - use different ones each time
 */
export const INSIGHT_OPENERS = [
  "I want to pause for a second because you just said something really important...",
  "Hold on - did you catch what you just said?",
  "That's worth sitting with for a moment.",
  "You just identified something important.",
  "Okay, that's significant.",
  "Let me reflect that back because it matters...",
]

/**
 * Insight connectors - short phrases that punctuate breakthroughs
 */
export const INSIGHT_CONNECTORS = [
  "There it is.",
  "That's exactly it.",
  "That's the shift.",
  "Now we're getting somewhere.",
  "That's real clarity.",
  "You just named it.",
]

/**
 * Validation prompts - ways to check if insight resonates
 */
export const VALIDATION_PROMPTS = [
  "Does that resonate?",
  "Is that what's actually going on?",
  "Does that land for you?",
  "Am I tracking this right?",
  "How does that feel to say out loud?",
]

/**
 * Brief acknowledgment for when we've hit reflection limit
 */
export const BRIEF_ACKNOWLEDGMENTS = [
  "That's another important realization.",
  "Good - you're getting clear on this.",
  "That's the pattern.",
  "You see it.",
]

/**
 * Question patterns - ways to ask exploratory questions
 */
export const QUESTION_PATTERNS = [
  "What does that look like for you?",
  "Tell me more about...",
  "How does that feel when you say it?",
  "What comes up when you think about...?",
  "What do you think is behind that?",
  "Where does that come from?",
  "What would need to change for that to be different?",
  "How long has this been going on?",
]

/**
 * Acknowledgment patterns - ways to show you're listening
 */
export const ACKNOWLEDGMENT_PATTERNS = [
  "I hear you.",
  "That makes sense.",
  "I can see that.",
  "Got it.",
  "Okay, so...",
  "Right - so...",
  "I'm noticing...",
  "It sounds like...",
]

/**
 * Exploration openers - ways to continue exploring
 */
export const EXPLORATION_OPENERS = [
  "I'm curious about...",
  "Tell me more about...",
  "Earlier you mentioned...",
  "I want to come back to...",
  "You said something interesting about...",
  "Let's dig into that a bit...",
  "That's interesting - ...",
  "I'm picking up on...",
]

/**
 * Maximum number of full reflection moments per conversation
 * Reduced from 4 to 3 to prevent over-celebrating and formulaic feel
 */
export const MAX_REFLECTIONS = 3

/**
 * Minimum turns between reflection moments
 * Increased from 2 to 3 to give more space between reflections
 */
export const MIN_TURNS_BETWEEN_REFLECTIONS = 3

/**
 * Initialize a new variety tracker
 */
export function initializeVarietyTracker(): VarietyTracker {
  return {
    insight_openers_used: [],
    connectors_used: [],
    validations_used: [],
    last_reflection_turn: -999,  // Allow first reflection immediately
    total_reflections: 0,
    // Extended tracking
    question_patterns_used: [],
    acknowledgment_patterns_used: [],
    exploration_openers_used: [],
    // Structural pattern tracking
    heres_what_count: 0,
    bold_sentence_count: 0,
    reflect_then_question_count: 0,
  }
}

/**
 * Get the next available phrase from a category
 * Rotates through options, avoiding recently used ones
 */
export function getNextPhrase(
  category: 'opener' | 'connector' | 'validation',
  tracker: VarietyTracker
): string {
  let phrases: string[]
  let usedIndices: number[]

  switch (category) {
    case 'opener':
      phrases = INSIGHT_OPENERS
      usedIndices = tracker.insight_openers_used
      break
    case 'connector':
      phrases = INSIGHT_CONNECTORS
      usedIndices = tracker.connectors_used
      break
    case 'validation':
      phrases = VALIDATION_PROMPTS
      usedIndices = tracker.validations_used
      break
  }

  // Find unused indices
  const availableIndices = phrases
    .map((_, i) => i)
    .filter(i => !usedIndices.includes(i))

  // If all used, reset and start over (but avoid last used)
  if (availableIndices.length === 0) {
    const lastUsed = usedIndices[usedIndices.length - 1]
    const resetIndices = phrases
      .map((_, i) => i)
      .filter(i => i !== lastUsed)

    // Clear tracker for this category
    usedIndices.length = 0

    // Pick random from reset options
    const idx = resetIndices[Math.floor(Math.random() * resetIndices.length)]
    usedIndices.push(idx)
    return phrases[idx]
  }

  // Pick random from available
  const idx = availableIndices[Math.floor(Math.random() * availableIndices.length)]
  usedIndices.push(idx)
  return phrases[idx]
}

/**
 * Get all available (unused) openers for prompt injection
 */
export function getAvailableOpeners(tracker: VarietyTracker): string[] {
  return INSIGHT_OPENERS.filter((_, i) => !tracker.insight_openers_used.includes(i))
}

/**
 * Get all available (unused) connectors for prompt injection
 */
export function getAvailableConnectors(tracker: VarietyTracker): string[] {
  return INSIGHT_CONNECTORS.filter((_, i) => !tracker.connectors_used.includes(i))
}

/**
 * Check if we should skip a full reflection moment
 * Returns true if too soon since last reflection or hit max
 */
export function shouldSkipReflection(
  tracker: VarietyTracker,
  currentTurn: number
): boolean {
  // Hit maximum reflections
  if (tracker.total_reflections >= MAX_REFLECTIONS) {
    return true
  }

  // Too soon since last reflection
  const turnsSinceReflection = currentTurn - tracker.last_reflection_turn
  if (turnsSinceReflection < MIN_TURNS_BETWEEN_REFLECTIONS) {
    return true
  }

  return false
}

/**
 * Record that a reflection moment occurred
 */
export function recordReflection(tracker: VarietyTracker, currentTurn: number): void {
  tracker.total_reflections++
  tracker.last_reflection_turn = currentTurn
}

/**
 * Get a brief acknowledgment when we've hit reflection limit
 */
export function getBriefAcknowledgment(): string {
  const idx = Math.floor(Math.random() * BRIEF_ACKNOWLEDGMENTS.length)
  return BRIEF_ACKNOWLEDGMENTS[idx]
}

/**
 * Get available question patterns (unused)
 */
export function getAvailableQuestionPatterns(tracker: VarietyTracker): string[] {
  return QUESTION_PATTERNS.filter((_, i) => !tracker.question_patterns_used.includes(i))
}

/**
 * Get available acknowledgment patterns (unused)
 */
export function getAvailableAcknowledgmentPatterns(tracker: VarietyTracker): string[] {
  return ACKNOWLEDGMENT_PATTERNS.filter((_, i) => !tracker.acknowledgment_patterns_used.includes(i))
}

/**
 * Get available exploration openers (unused)
 */
export function getAvailableExplorationOpeners(tracker: VarietyTracker): string[] {
  return EXPLORATION_OPENERS.filter((_, i) => !tracker.exploration_openers_used.includes(i))
}

/**
 * Detect and record which patterns were used in the LLM response
 * This updates the tracker to prevent the same patterns from being used again
 */
export function recordUsedPatterns(response: string, tracker: VarietyTracker): void {
  const responseLower = response.toLowerCase()

  // Check question patterns
  QUESTION_PATTERNS.forEach((pattern, index) => {
    const patternLower = pattern.toLowerCase().replace('...', '')
    if (responseLower.includes(patternLower) && !tracker.question_patterns_used.includes(index)) {
      tracker.question_patterns_used.push(index)
    }
  })

  // Check acknowledgment patterns
  ACKNOWLEDGMENT_PATTERNS.forEach((pattern, index) => {
    const patternLower = pattern.toLowerCase()
    if (responseLower.includes(patternLower) && !tracker.acknowledgment_patterns_used.includes(index)) {
      tracker.acknowledgment_patterns_used.push(index)
    }
  })

  // Check exploration openers
  EXPLORATION_OPENERS.forEach((pattern, index) => {
    const patternLower = pattern.toLowerCase().replace('...', '')
    if (responseLower.includes(patternLower) && !tracker.exploration_openers_used.includes(index)) {
      tracker.exploration_openers_used.push(index)
    }
  })

  // Check insight openers (already tracked separately but ensure consistency)
  INSIGHT_OPENERS.forEach((pattern, index) => {
    const patternLower = pattern.toLowerCase().replace('...', '')
    if (responseLower.includes(patternLower) && !tracker.insight_openers_used.includes(index)) {
      tracker.insight_openers_used.push(index)
    }
  })

  // Check insight connectors (tracks phrases like "There it is" to prevent repetition)
  INSIGHT_CONNECTORS.forEach((pattern, index) => {
    const patternLower = pattern.toLowerCase()
    if (responseLower.includes(patternLower) && !tracker.connectors_used.includes(index)) {
      tracker.connectors_used.push(index)
    }
  })

  // Track structural patterns
  const heresPattern = /here'?s what i'?m (seeing|noticing|hearing|curious about|picking up on)/gi
  const heresMatches = response.match(heresPattern)
  if (heresMatches) {
    tracker.heres_what_count = (tracker.heres_what_count || 0) + heresMatches.length
  }

  // Track bold sentence usage
  const boldSentences = response.match(/\*\*[^*]{10,}\*\*/g)
  if (boldSentences) {
    tracker.bold_sentence_count = (tracker.bold_sentence_count || 0) + boldSentences.length
  }

  // Reset arrays if they get too full (allow patterns to be reused after rotation)
  const MAX_TRACKED = 6
  if (tracker.question_patterns_used.length >= MAX_TRACKED) {
    tracker.question_patterns_used = tracker.question_patterns_used.slice(-2)
  }
  if (tracker.acknowledgment_patterns_used.length >= MAX_TRACKED) {
    tracker.acknowledgment_patterns_used = tracker.acknowledgment_patterns_used.slice(-2)
  }
  if (tracker.exploration_openers_used.length >= MAX_TRACKED) {
    tracker.exploration_openers_used = tracker.exploration_openers_used.slice(-2)
  }
  if (tracker.connectors_used.length >= MAX_TRACKED) {
    tracker.connectors_used = tracker.connectors_used.slice(-2)
  }
}

/**
 * Build dynamic phrases for prompt overlay
 * Returns string that can be injected into prompt
 */
export function buildVarietyGuidance(tracker: VarietyTracker, currentTurn: number): string {
  const availableOpeners = getAvailableOpeners(tracker)
  const availableConnectors = getAvailableConnectors(tracker)
  const availableQuestionPatterns = getAvailableQuestionPatterns(tracker)
  const availableAcknowledgments = getAvailableAcknowledgmentPatterns(tracker)
  const availableExplorationOpeners = getAvailableExplorationOpeners(tracker)

  const shouldSkip = shouldSkipReflection(tracker, currentTurn)
  const reflectionsRemaining = MAX_REFLECTIONS - tracker.total_reflections

  const heresCount = tracker.heres_what_count || 0
  const boldCount = tracker.bold_sentence_count || 0

  let guidance = `
## Response Variety - CRITICAL

**IMPORTANT: Vary your language AND your structure! Do NOT use the same patterns repeatedly.**

**Reflection status:**
- Reflections used: ${tracker.total_reflections}/${MAX_REFLECTIONS}
- Turns since last reflection: ${currentTurn - tracker.last_reflection_turn}
`

  // Structural warnings
  if (heresCount >= 2) {
    guidance += `
**⚠️ STRUCTURAL ALERT: You have used "Here's what I'm [X]" ${heresCount} times already (max 2). Switch to different openers for the rest of this conversation.**
`
  }

  if (boldCount > 4) {
    guidance += `
**⚠️ BOLD OVERUSE: You've bolded ${boldCount} sentences so far. STOP using bold for the next several turns. Most responses should have NO bold text.**
`
  }

  // Reflection guidance (when applicable)
  if (shouldSkip) {
    guidance += `
**Reflection note: Skip full reflection - ${
  tracker.total_reflections >= MAX_REFLECTIONS
    ? 'hit maximum - acknowledge briefly and move on.'
    : 'too soon since last reflection.'
}**
`
  } else if (availableOpeners.length > 0) {
    guidance += `
**For reflection moments (use fresh ones):**
Openers: ${availableOpeners.slice(0, 3).map(o => `"${o}"`).join(' | ')}
Connectors: ${availableConnectors.slice(0, 3).map(c => `"${c}"`).join(' | ')}
`
  }

  // Always include question and acknowledgment variety
  guidance += `
**For questions (rotate these - don't repeat):**
${availableQuestionPatterns.slice(0, 4).map(q => `- "${q}"`).join('\n')}

**For acknowledgments (vary how you show you're listening):**
${availableAcknowledgments.slice(0, 4).map(a => `- "${a}"`).join('\n')}

**For exploration (fresh ways to continue):**
${availableExplorationOpeners.slice(0, 4).map(e => `- "${e}"`).join('\n')}

**AVOID THESE (already used or overused):**
- "Okay, that's significant" (limit to 1-2 uses)
- "There it is" - can ONLY use once per conversation
- Repeating the same question structure back-to-back
- Starting multiple responses with the same opener
- Using the same connector phrase twice (e.g., "There it is", "That's exactly it")

**STRUCTURAL PATTERNS — limit repetition:**
- "Here's what I'm [seeing/noticing/hearing/curious about]" — fine to use, but MAX 2 times total in a conversation. After that, find different ways to introduce observations.
- "But here's what..." as a pivot after validation — don't use this every turn. Sometimes just state the observation directly.
- The reflect → **bold insight** → question formula — good structure, but vary it. Not every turn should follow this pattern.
- Bolding a sentence in every response — save bold for genuine breakthrough moments (2-3 per conversation max)
`

  return guidance
}
