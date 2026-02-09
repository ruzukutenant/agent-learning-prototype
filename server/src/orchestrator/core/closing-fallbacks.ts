/**
 * Fallback templates for critical closing turns
 *
 * When LLM-generated responses fail validation twice, these templates
 * ensure we maintain the proper closing sequence structure.
 *
 * These are intentionally generic so they work for any constraint type.
 * The key is maintaining the turn structure (questions where needed,
 * proper separation of agreement gates, etc.)
 */

import type { ConstraintCategory } from './types.js'

/**
 * Turn D (assert_and_align) - Agreement in principle
 * MUST end with a question, MUST NOT mention our offering
 */
export function getTurnDFallback(constraint: ConstraintCategory | null): string {
  const constraintDescriptions: Record<ConstraintCategory, string> = {
    strategy: 'strategic clarity - helping you figure out exactly who you serve and what makes you different',
    execution: 'operational systems - helping you build the processes and infrastructure to scale',
    psychology: 'working through these internal patterns - the blocks that keep showing up even when you know what to do'
  }

  const description = constraint
    ? constraintDescriptions[constraint]
    : 'this kind of focused support'

  return `Based on everything we've talked through, I think what you really need is someone who specializes in ${description}. There are people whose whole focus is exactly this kind of work.

Does that land for you? Would you want to explore getting that sort of help?`
}

/**
 * Turn D2 (offer_solution) - Offer our specific solution
 * MUST end with a question, MUST mention FREE/complimentary
 */
export function getTurnD2Fallback(): string {
  return `You could definitely find someone on your own who does this kind of work. But we actually have specialists on staff who focus on exactly this.

I can set up a **free exploratory call** for you - no cost, no obligation - just a conversation to see if they can help based on everything we've uncovered.

Would you want me to arrange that for you?`
}

/**
 * Turn E (facilitate) - Brief acknowledgment + booking
 * Should NOT ask a question, should be brief (2-3 sentences)
 */
export function getTurnEFallback(): string {
  return `Perfect. The free session will give you a chance to talk this through with someone who sees this kind of thing all the time - and can look at it from the outside.

Here's your summary with everything we covered, plus the link to book that call.`
}

/**
 * Get fallback template for a closing action
 */
export function getClosingFallback(
  action: string,
  constraint: ConstraintCategory | null
): string | null {
  switch (action) {
    case 'closing_assert_and_align':
      return getTurnDFallback(constraint)
    case 'closing_offer_solution':
      return getTurnD2Fallback()
    case 'closing_facilitate':
      return getTurnEFallback()
    default:
      return null
  }
}

/**
 * Actions that have mandatory fallbacks when validation fails
 */
export const CRITICAL_CLOSING_ACTIONS = [
  'closing_assert_and_align',
  'closing_offer_solution',
  'closing_facilitate'
]
