// Closing message generation - supportive transition after diagnosis

import type { ConstraintCategory } from '../core/types.js'

/**
 * Generate closing message after constraint identification
 * This replaces the LLM's need to generate this message
 *
 * Structure:
 * 1. Name the constraint
 * 2. Acknowledge the discovery
 * 3. Bridge to next step
 */
export function generateClosingMessage(
  category: ConstraintCategory,
  summary: string,
  userName?: string
): string {

  const greeting = userName ? userName : 'there'
  const categoryLabel = getCategoryLabel(category)
  const acknowledgment = getAcknowledgment(category)

  return `${greeting}, based on everything you've shared, your core constraint is ${categoryLabel}—${summary}

${acknowledgment}

I'm going to have you do a quick check-in on where you are with this—it'll help us figure out the best way forward. Takes about 60 seconds.`
}

/**
 * Get user-friendly category label
 */
function getCategoryLabel(category: ConstraintCategory): string {
  switch (category) {
    case 'strategy':
      return 'strategy'
    case 'execution':
      return 'execution'
    case 'energy':
      return 'energy'
    default:
      return 'your constraint'
  }
}

/**
 * Get category-specific acknowledgment
 */
function getAcknowledgment(category: ConstraintCategory): string {
  switch (category) {
    case 'strategy':
      return 'This is the real blocker keeping your business from growing consistently. Once you get clear on your positioning and messaging, the tactics become obvious.'

    case 'execution':
      return 'This is what\'s keeping you stuck in the day-to-day and preventing scale. Once you build the right systems and capacity, growth becomes sustainable.'

    case 'energy':
      return 'This is the hidden blocker beneath everything else. When your energy is drained, nothing else works. Addressing this first will unlock everything.'

    default:
      return 'This is the real blocker keeping your business from growing consistently. The good news is that once you address this, everything else becomes easier.'
  }
}

/**
 * Generate validation request message
 * Used when hypothesis exists but needs user confirmation
 */
export function generateValidationMessage(
  category: ConstraintCategory,
  evidence: string[]
): string {

  const categoryLabel = getCategoryLabel(category)
  const evidenceSummary = evidence.slice(0, 2).join(', ')

  return `I'm hearing that ${categoryLabel} might be the core issue here—specifically around ${evidenceSummary}.

Does that resonate? Or am I off track?`
}

/**
 * Generate deepening question
 * Used when we need more information before diagnosing
 */
export function generateDeepeningQuestion(
  category: ConstraintCategory | null,
  subDimension: string | null
): string {

  if (subDimension) {
    return getDimensionSpecificQuestion(subDimension)
  }

  if (category) {
    return getCategorySpecificQuestion(category)
  }

  // Generic deepening
  return 'Tell me more about what that looks like day-to-day.'
}

/**
 * Get dimension-specific deepening questions
 */
function getDimensionSpecificQuestion(dimension: string): string {
  switch (dimension) {
    case 'offer_clarity':
      return 'When someone asks what you do, how do you explain it?'

    case 'positioning':
      return 'What makes your approach different from other coaches or consultants in your space?'

    case 'delegation':
      return 'What parts of your business are you still doing yourself that you wish you weren\'t?'

    case 'capacity':
      return 'Walk me through a typical week—where does your time actually go?'

    case 'systems':
      return 'What breaks down most often when you try to deliver for clients?'

    case 'energy_drain':
      return 'When did you first start feeling this way about the business?'

    default:
      return 'Tell me more about that.'
  }
}

/**
 * Get category-specific deepening questions
 */
function getCategorySpecificQuestion(category: ConstraintCategory): string {
  switch (category) {
    case 'strategy':
      return 'How do most of your clients find you right now?'

    case 'execution':
      return 'What\'s the biggest bottleneck in how you deliver your work?'

    case 'energy':
      return 'What part of running the business drains you most?'

    default:
      return 'What does that look like in practice?'
  }
}

/**
 * Generate containment message - adaptive based on overwhelm level
 * Used when overwhelm is detected
 */
export function generateContainmentMessage(
  emotionalMarkers: string[],
  capacitySignals: string[],
  hypothesisCategory: string | null,
  hypothesisConfidence: number
): string {

  // HIGH OVERWHELM: Validate + normalize + soft redirect
  // Triggered when: 3+ emotional markers OR 2+ capacity signals
  if (emotionalMarkers.length >= 3 || capacitySignals.length >= 2) {
    return `I hear you. That\'s a lot.

It sounds like you\'ve been trying everything, and that\'s exhausting. Sometimes when we\'re in that mode, it\'s hard to see what\'s actually going on.

What does your gut tell you is really happening here?`
  }

  // MEDIUM OVERWHELM + HYPOTHESIS FORMING: Offer observation
  // Triggered when: hypothesis exists with decent confidence + some overwhelm
  if (hypothesisCategory && hypothesisConfidence > 0.5) {
    const observation = getHypothesisObservation(hypothesisCategory)
    return `I hear you. That\'s a lot of moving pieces.

Here\'s what I\'m noticing: ${observation}

Does that land?`
  }

  // LIGHT OVERWHELM: Gentle refocus with reframe
  // Triggered when: some emotional markers but not severe
  return `I hear you.

Forget about tactics for a second—what feels most stuck right now?`
}

/**
 * Get hypothesis-specific observation for containment
 */
function getHypothesisObservation(category: string): string {
  switch (category) {
    case 'strategy':
      return 'you\'re great at what you do (strong close rate), but the front-end—how people find you and understand your value—feels murky'

    case 'execution':
      return 'you know what to do, but the systems and capacity to deliver consistently aren\'t there yet'

    case 'energy':
      return 'you\'re running on empty, and when your energy is drained, everything else feels harder'

    default:
      return 'there\'s a pattern here, but we need to zoom out to see it clearly'
  }
}
