// LLM-based constraint summary generation
// Creates clean, personalized summaries from conversation context
// Uses Gemini Flash for speed with Haiku fallback

import { geminiComplete, isGeminiAvailable } from './gemini-client.js'
import Anthropic from '@anthropic-ai/sdk'
import type { ConstraintCategory, Message } from './types.js'

/**
 * Options for generating a constraint summary
 */
interface SummaryOptions {
  /** Array of user's key insights from the conversation */
  insights?: string[]
  /** User's business description from early conversation */
  businessContext?: string
}

/**
 * Generate a clean constraint summary from conversation context
 *
 * Instead of dumping user quotes, this synthesizes evidence into
 * a clear 2-3 sentence summary that:
 * - Uses second person ("You...")
 * - References specific details from THEIR conversation
 * - Connects their symptoms to the root constraint
 *
 * @param constraint - The identified constraint category
 * @param evidence - Array of evidence strings from conversation
 * @param userName - User's name for personalization
 * @param history - Full conversation history
 * @param options - Additional context (insights, business context)
 * @returns Clean, personalized summary
 */
export async function generateConstraintSummary(
  constraint: ConstraintCategory,
  evidence: string[],
  userName: string | undefined,
  history: Message[],
  options: SummaryOptions = {}
): Promise<string> {

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  })

  // Extract USER messages for more specific context
  const userMessages = history.filter(m => m.role === 'user')

  // Get early context (what they do, who they serve) from first few messages
  const earlyContext = userMessages.slice(0, 3).map(m => m.content).join(' ').substring(0, 500)

  // Get key moments - their longest/most substantive messages often have breakthrough content
  const substantiveMessages = userMessages
    .filter(m => m.content.length > 100)
    .slice(-4)
    .map(m => m.content.substring(0, 300))

  const constraintLabel = getConstraintLabel(constraint)

  // Build evidence section from unified analysis
  const evidenceSection = evidence.length > 0
    ? `\n**SPECIFIC EVIDENCE:**\n${evidence.map(e => `- ${e}`).join('\n')}\n`
    : ''

  // Build insights section if we have accumulated insights
  const insightsSection = options.insights && options.insights.length > 0
    ? `\n**KEY REALIZATIONS (their own words):**\n${options.insights.map(i => `- "${i}"`).join('\n')}\n`
    : ''

  // Add name context for personalization
  const nameContext = userName ? `Their name is ${userName}. ` : ''

  const prompt = `Create a concise 2-3 sentence summary of this person's core constraint. ${nameContext}

**CONSTRAINT TYPE:** ${constraint} (${constraintLabel})

**ABOUT THEIR BUSINESS (early in conversation):**
${earlyContext}
${evidenceSection}${insightsSection}
**THEIR KEY STATEMENTS:**
${substantiveMessages.map(m => `"${m}..."`).join('\n\n')}

**INSTRUCTIONS:**
- Write in second person ("You...")
- Be SPECIFIC to their exact situation - use details from their business/statements
- Reference what they actually said/realized, not generic constraint language
- Connect THEIR specific symptoms to the root constraint
- Keep it 2-3 sentences max
- Sound like a coach who listened carefully, not a diagnostic report

**GOOD EXAMPLE (specific, uses their details):**
"You've built a fitness coaching program that genuinely transforms your 12 clients - but you're drowning trying to customize everything yourself. The constraint isn't motivation or knowledge; it's that you haven't built the systems to deliver consistently without you doing every piece manually."

**BAD EXAMPLE (generic, no specifics):**
"You have an execution constraint. You're doing everything yourself and things are falling through the cracks. You need systems and support to scale."

Return ONLY the summary text, no explanation or labels.`

  try {
    let text: string

    // Try Gemini Flash first (faster)
    if (isGeminiAvailable()) {
      try {
        text = await geminiComplete(prompt, { maxTokens: 200, temperature: 0.3 })
        text = text.trim()
      } catch (geminiError) {
        console.warn('[Constraint Summary] Gemini failed, falling back to Haiku:', geminiError)
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 200,
          temperature: 0.3,
          messages: [{ role: 'user', content: prompt }]
        })
        text = response.content[0].type === 'text'
          ? response.content[0].text.trim()
          : getDefaultSummary(constraint)
      }
    } else {
      // Haiku fallback
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 200,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      })
      text = response.content[0].type === 'text'
        ? response.content[0].text.trim()
        : getDefaultSummary(constraint)
    }

    console.log(`[Constraint Summary] Generated: "${text.substring(0, 80)}..."`)

    return text

  } catch (error) {
    console.error('[Constraint Summary] Generation failed:', error)
    return getDefaultSummary(constraint)
  }
}

/**
 * Get human-readable constraint label
 */
function getConstraintLabel(constraint: ConstraintCategory): string {
  switch (constraint) {
    case 'strategy':
      return 'clarity on direction - who to serve and what makes them different'
    case 'execution':
      return 'doing everything themselves, systems breaking down'
    case 'psychology':
      return 'internal blocks - fear, self-doubt, or permission issues'
    default:
      return 'unclear constraint'
  }
}

/**
 * Fallback summary if LLM fails
 */
export function getDefaultSummary(constraint: ConstraintCategory): string {
  switch (constraint) {
    case 'strategy':
      return "You're stuck on clarity about direction - who you serve and what makes you different. That uncertainty is driving overthinking and making it hard to commit to a path forward."

    case 'execution':
      return "You know what you want to do, but you're doing everything yourself and it's not sustainable. Things are falling through the cracks because you haven't built the systems and support to scale."

    case 'psychology':
      return "You know what to do, but internal blocks are getting in the way - fear of judgment, self-doubt, imposter syndrome, or burnout. The issue isn't strategy or systems - it's the internal patterns keeping you stuck."

    default:
      return "We've identified what's holding you back. The good news is this is solvable with the right focus and support."
  }
}
