/**
 * Closing-specific analysis for intelligent progression through closing sequence
 *
 * Danny's model requires TWO agreement gates:
 * 1. Turn D: Agreement in principle (they need external help)
 * 2. Turn D2: Agreement to our offering (they want our free call)
 *
 * This analysis interprets user responses in context of what we just asked,
 * enabling proper objection handling and gate progression.
 */

import { geminiJSON } from './gemini-client.js'
import type {
  ClosingAskType,
  ClosingResponseType,
  ObjectionType,
  ClosingAnalysisResult
} from './types.js'

/**
 * Analyze user response specifically in the context of closing sequence
 * This is phase-aware - it knows what question we just asked
 */
export async function analyzeClosingResponse(
  userMessage: string,
  askType: ClosingAskType,
  recentContext: string
): Promise<ClosingAnalysisResult> {
  const askDescription = askType === 'agreement_in_principle'
    ? 'whether they want to explore getting external help from someone who specializes in their issue'
    : 'whether they want us to arrange a free exploratory call with our specialists'

  const questionAsked = askType === 'agreement_in_principle'
    ? '"Does that land for you? Would you want to explore getting that sort of help?"'
    : '"Would you want me to arrange that for you?"'

  const prompt = `You are analyzing a user's response during a coaching conversation's closing sequence.

CONTEXT (recent conversation):
${recentContext}

WE JUST ASKED THE USER: ${questionAsked}
This question was checking: ${askDescription}

USER'S RESPONSE:
"${userMessage}"

Classify their response into ONE of these categories:

1. "clear_agreement" - They clearly said yes, expressed enthusiasm, or indicated they want to proceed
   Examples: "Yes, that makes sense", "Absolutely", "That would be great", "I'm ready for that"

2. "tentative_agreement" - They agreed but with some reservation or hedging
   Examples: "I think so", "Probably", "Yeah, I guess", "Sure, worth exploring"

3. "hesitation" - They're uncertain, asking questions, or hedging without agreeing
   Examples: "I'm not sure", "What would that involve?", "Let me think about it", "Maybe"

4. "objection" - They pushed back, declined, or expressed resistance
   Examples: "I don't think I need that", "I'd rather figure it out myself", "Not right now"

5. "off_topic" - Their response doesn't address the question at all

If the response is "hesitation" or "objection", also classify the OBJECTION TYPE:

- "doesnt_need_help" - They don't believe they need external help at all
- "prefers_self_solve" - They want help but prefer to find it themselves
- "not_our_offering" - Concerns specifically about our service/offering
- "timing" - Not the right time (too busy, other priorities)
- "needs_more_info" - They want more details before deciding

Respond with JSON only:
{
  "response_type": "clear_agreement" | "tentative_agreement" | "hesitation" | "objection" | "off_topic",
  "objection_type": null | "doesnt_need_help" | "prefers_self_solve" | "not_our_offering" | "timing" | "needs_more_info",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of classification"
}`

  try {
    const result = await geminiJSON<{
      response_type: ClosingResponseType
      objection_type: ObjectionType | null
      confidence: number
      reasoning: string
    }>(prompt, {
      maxTokens: 256
    })

    console.log(`[ClosingAnalysis] ${askType}: ${result.response_type}${result.objection_type ? ` (${result.objection_type})` : ''} - ${result.reasoning}`)

    return {
      checking_for: askType,
      response_type: result.response_type,
      objection_type: result.objection_type || undefined,
      confidence: result.confidence,
      reasoning: result.reasoning
    }
  } catch (error) {
    console.error('[ClosingAnalysis] Analysis failed:', error)
    // Default to tentative agreement to avoid blocking - let conversation continue
    return {
      checking_for: askType,
      response_type: 'tentative_agreement',
      confidence: 0.5,
      reasoning: 'Analysis failed, defaulting to tentative agreement'
    }
  }
}

/**
 * Build recent context string for closing analysis
 * Includes last few turns to give context for the response
 */
export function buildClosingContext(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTurns: number = 4
): string {
  const recentTurns = history.slice(-maxTurns)
  return recentTurns
    .map(m => `${m.role === 'assistant' ? 'COACH' : 'USER'}: ${m.content}`)
    .join('\n\n')
}
