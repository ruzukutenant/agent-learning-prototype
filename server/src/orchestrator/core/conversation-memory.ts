// Conversation memory system to prevent circular exploration
// Tracks topics discussed, detects repetition, and guides conversation forward

import { geminiJSON, isGeminiAvailable } from './gemini-client.js'
import Anthropic from '@anthropic-ai/sdk'
import type { ConversationMemory, ReadinessLevel, ClarityTrend } from './types.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const TOPIC_MODEL = 'claude-haiku-4-5'

/**
 * Initialize empty conversation memory
 */
export function initializeConversationMemory(): ConversationMemory {
  return {
    topics_explored: [],
    questions_asked: [],
    user_answers_summary: [],
    ground_covered_score: 0,
    clarity_history: []
  }
}

/**
 * Extract the main topic from a conversation exchange
 * Uses lightweight LLM call for semantic understanding
 */
export async function extractTopicFromExchange(
  userMessage: string,
  advisorQuestion: string,
  existingTopics: string[]
): Promise<{ topic: string; isRepeat: boolean; similarity: number }> {
  const systemPrompt = `You extract conversation topics for tracking purposes.

Given a user message and the question that prompted it, identify:
1. The main topic being discussed (3-5 words)
2. Whether this topic is semantically similar to any existing topics
3. Similarity score (0-1) if similar

Previously discussed topics: ${existingTopics.length > 0 ? existingTopics.join(', ') : 'None yet'}

Respond in JSON format:
{
  "topic": "brief topic description",
  "similar_to": "existing topic or null",
  "similarity": 0.0-1.0
}`

  const prompt = `Advisor question: "${advisorQuestion}"
User response: "${userMessage}"`

  try {
    // Try Gemini Flash first (faster)
    if (isGeminiAvailable()) {
      try {
        const result = await geminiJSON<{ topic: string; similar_to: string | null; similarity: number }>(
          prompt,
          { systemPrompt, maxTokens: 200 }
        )
        return {
          topic: result.topic || 'general discussion',
          isRepeat: result.similarity > 0.6,
          similarity: result.similarity || 0
        }
      } catch (geminiError) {
        console.warn('[ConversationMemory] Gemini failed, falling back to Haiku:', geminiError)
      }
    }

    // Haiku fallback
    const response = await anthropic.messages.create({
      model: TOPIC_MODEL,
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        topic: parsed.topic || 'general discussion',
        isRepeat: parsed.similarity > 0.6,
        similarity: parsed.similarity || 0
      }
    }

    // Fallback if parsing fails
    return {
      topic: 'general discussion',
      isRepeat: false,
      similarity: 0
    }
  } catch (error) {
    console.error('[ConversationMemory] Topic extraction failed:', error)
    // Fallback to simple extraction
    return extractTopicSimple(userMessage, existingTopics)
  }
}

/**
 * Simple regex-based topic extraction (fallback)
 */
function extractTopicSimple(
  userMessage: string,
  existingTopics: string[]
): { topic: string; isRepeat: boolean; similarity: number } {
  // Extract key phrases
  const keyPhrases = [
    /what's (stopping|preventing|holding|in the way)/i,
    /why (haven't|don't|can't|won't)/i,
    /how (do|can|would|should)/i,
    /what (would|could|should)/i,
    /(pipeline|marketing|clients|leads)/i,
    /(systems|processes|automation)/i,
    /(time|capacity|bandwidth)/i,
    /(energy|motivation|burnout)/i,
    /(clarity|direction|focus)/i,
  ]

  let detectedTopic = 'general response'

  for (const pattern of keyPhrases) {
    const match = userMessage.match(pattern)
    if (match) {
      detectedTopic = match[0].toLowerCase()
      break
    }
  }

  // Check for repetition
  const isRepeat = existingTopics.some(topic =>
    topic.toLowerCase().includes(detectedTopic) ||
    detectedTopic.includes(topic.toLowerCase())
  )

  return {
    topic: detectedTopic,
    isRepeat,
    similarity: isRepeat ? 0.7 : 0
  }
}

/**
 * Extract the question theme from advisor's message
 */
export function extractQuestionTheme(advisorMessage: string): string {
  const questionPatterns = [
    { pattern: /what's (stopping|preventing|holding|blocking)/i, theme: 'blockers' },
    { pattern: /why (haven't|don't|can't)/i, theme: 'root cause' },
    { pattern: /what would (it|things) look like/i, theme: 'vision' },
    { pattern: /how (do|would|could) you/i, theme: 'approach' },
    { pattern: /tell me (more )?about/i, theme: 'elaboration' },
    { pattern: /what's (different|changed)/i, theme: 'change' },
    { pattern: /when did (this|you)/i, theme: 'timeline' },
    { pattern: /what have you tried/i, theme: 'past attempts' },
    { pattern: /does that (resonate|land|feel)/i, theme: 'validation' },
  ]

  for (const { pattern, theme } of questionPatterns) {
    if (pattern.test(advisorMessage)) {
      return theme
    }
  }

  return 'exploration'
}

/**
 * Calculate how much conversational ground has been covered
 * Returns 0-1 score based on topics explored relative to typical conversation
 */
export function calculateGroundCovered(
  memory: ConversationMemory,
  hypothesis: string | null
): number {
  // Base score from number of unique topics
  const topicScore = Math.min(memory.topics_explored.length / 8, 0.5)

  // Bonus for having a hypothesis
  const hypothesisBonus = hypothesis ? 0.2 : 0

  // Bonus for covering key areas
  const keyAreas = ['business context', 'challenges', 'blockers', 'past attempts', 'goals']
  const topicsLower = memory.topics_explored.map(t => t.toLowerCase())
  const areasCovers = keyAreas.filter(area =>
    topicsLower.some(t => t.includes(area) || area.includes(t))
  ).length
  const areaScore = (areasCovers / keyAreas.length) * 0.3

  // Penalty for repetition (indicated by high ground_covered_score already)
  const repetitionPenalty = memory.ground_covered_score > 0.5 ? 0.1 : 0

  const total = Math.min(topicScore + hypothesisBonus + areaScore + repetitionPenalty, 1.0)

  return Math.round(total * 100) / 100
}

/**
 * Detect if the conversation is circling back to covered ground
 */
export function detectCircularExploration(
  memory: ConversationMemory,
  currentTopic: string
): { isCircular: boolean; suggestion: string } {
  // Count how many times similar topics appear
  const similarCount = memory.topics_explored.filter(topic => {
    const topicLower = topic.toLowerCase()
    const currentLower = currentTopic.toLowerCase()
    return topicLower.includes(currentLower) ||
           currentLower.includes(topicLower) ||
           wordOverlap(topicLower, currentLower) > 0.5
  }).length

  if (similarCount >= 2) {
    return {
      isCircular: true,
      suggestion: determineNextDirection(memory)
    }
  }

  // Check question themes for repetition
  const questionTheme = extractQuestionTheme(currentTopic)
  const themeCount = memory.questions_asked.filter(q => q === questionTheme).length

  if (themeCount >= 2) {
    return {
      isCircular: true,
      suggestion: `Move past "${questionTheme}" questions - you've asked this type multiple times`
    }
  }

  return {
    isCircular: false,
    suggestion: ''
  }
}

/**
 * Calculate word overlap between two strings
 */
function wordOverlap(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 3))
  const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 3))

  if (words1.size === 0 || words2.size === 0) return 0

  const intersection = [...words1].filter(w => words2.has(w)).length
  const union = new Set([...words1, ...words2]).size

  return intersection / union
}

/**
 * Suggest next direction based on conversation gaps
 */
function determineNextDirection(memory: ConversationMemory): string {
  const coveredThemes = new Set(memory.questions_asked)

  const priorityThemes = [
    { theme: 'validation', suggestion: 'Move toward validating the hypothesis' },
    { theme: 'vision', suggestion: 'Ask what success looks like' },
    { theme: 'blockers', suggestion: 'Explore specific blockers' },
    { theme: 'past attempts', suggestion: 'Ask what they have tried' },
  ]

  for (const { theme, suggestion } of priorityThemes) {
    if (!coveredThemes.has(theme)) {
      return suggestion
    }
  }

  return 'Enough exploration - move toward diagnosis'
}

/**
 * Detect clarity trend from history
 */
export function detectClarityTrend(memory: ConversationMemory): ClarityTrend {
  const history = memory.clarity_history

  if (history.length < 3) {
    return 'stable'
  }

  // Look at last 3-4 entries
  const recent = history.slice(-4)
  const levelToNum = { low: 0, medium: 1, high: 2 }
  const nums = recent.map(l => levelToNum[l])

  // Calculate trend
  let increasing = 0
  let decreasing = 0

  for (let i = 1; i < nums.length; i++) {
    if (nums[i] > nums[i-1]) increasing++
    if (nums[i] < nums[i-1]) decreasing++
  }

  if (increasing >= 2 && decreasing === 0) return 'increasing'
  if (decreasing >= 2 && increasing === 0) return 'decreasing'
  return 'stable'
}

/**
 * Update conversation memory with new exchange
 */
export async function updateConversationMemory(
  memory: ConversationMemory,
  userMessage: string,
  advisorMessage: string,
  currentClarity: ReadinessLevel
): Promise<{ memory: ConversationMemory; isRepeat: boolean }> {
  // Extract topic from this exchange
  const topicResult = await extractTopicFromExchange(
    userMessage,
    advisorMessage,
    memory.topics_explored
  )

  // Extract question theme
  const questionTheme = extractQuestionTheme(advisorMessage)

  // Update memory
  const updatedMemory: ConversationMemory = {
    topics_explored: [...memory.topics_explored, topicResult.topic].slice(-10),
    questions_asked: [...memory.questions_asked, questionTheme].slice(-10),
    user_answers_summary: memory.user_answers_summary, // Could add summarization here
    ground_covered_score: topicResult.isRepeat
      ? Math.min(memory.ground_covered_score + 0.15, 1.0)
      : memory.ground_covered_score,
    clarity_history: [...memory.clarity_history, currentClarity].slice(-6)
  }

  // Recalculate ground covered
  updatedMemory.ground_covered_score = calculateGroundCovered(
    updatedMemory,
    null // Hypothesis would be passed in real usage
  )

  return {
    memory: updatedMemory,
    isRepeat: topicResult.isRepeat
  }
}

/**
 * Build memory context for prompt injection
 */
export function buildMemoryContext(memory: ConversationMemory): string {
  const trend = detectClarityTrend(memory)
  const circularCheck = memory.topics_explored.length > 0
    ? detectCircularExploration(memory, memory.topics_explored[memory.topics_explored.length - 1])
    : { isCircular: false, suggestion: '' }

  const questionsUsed = memory.questions_asked.length > 0
    ? `\n- Question types already asked: ${[...new Set(memory.questions_asked)].join(', ')}`
    : ''

  return `
**Conversation Memory:**
- Topics explored: ${memory.topics_explored.join(', ') || 'None yet'}${questionsUsed}
- Ground covered: ${Math.round(memory.ground_covered_score * 100)}%
- Clarity trend: ${trend}
${circularCheck.isCircular ? `
**WARNING: Circular exploration detected!**
You've already covered this territory. Do NOT ask similar questions again.
Suggestion: ${circularCheck.suggestion}
` : ''}
`
}
