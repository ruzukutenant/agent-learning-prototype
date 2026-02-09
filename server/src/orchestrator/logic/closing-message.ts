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

  const transition = getTransitionMessage(category)

  return `${greeting}, here's what I'm seeing:

Your core constraint is **${categoryLabel}**—${summary}

${acknowledgment}

${transition}`
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
    case 'psychology':
      return 'psychology'
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

    case 'psychology':
      return 'This is the hidden blocker beneath everything else. Internal patterns like fear, self-doubt, or burnout are keeping you stuck. Addressing this first will unlock everything.'

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

    case 'internal_blocks':
      return 'When did you first start noticing this pattern?'

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

    case 'psychology':
      return 'What do you think is really driving that pattern?'

    default:
      return 'What does that look like in practice?'
  }
}

/**
 * Get category-specific transition message
 * Invites them to book the appropriate call based on constraint
 * Must match actual UI: button says "View Your Summary & Next Steps →"
 */
function getTransitionMessage(category: ConstraintCategory): string {
  switch (category) {
    case 'strategy':
      return `This is really common with coaches at your stage—you're good at the work, but you're stuck figuring out your direction. The good news? This is exactly the kind of clarity challenge that's solvable with the right support.

I'd recommend booking a free call with one of our strategists. They'll help you map out your direction and positioning so you know exactly where to focus.

Click "View Your Summary & Next Steps" below to see your personalized summary and book your call.`

    case 'execution':
      return `This is really common with coaches who are growing—you know what to do, but building the systems to actually do it is the hard part. The good news? This is exactly what our implementation team is designed for.

I'd recommend booking a free call with our MIST team. They'll help you figure out which systems to build first and how to get them done.

Click "View Your Summary & Next Steps" below to see your personalized summary and book your call.`

    case 'psychology':
      return `This is really common for coaches who are good at what they do—internal patterns like fear, self-doubt, or burnout can quietly sabotage everything. The important thing? This isn't about working harder. It's about working through the internal blocks.

I'd recommend booking a free call to explore what's really going on beneath the surface—and map out a path forward that actually addresses the root cause.

Click "View Your Summary & Next Steps" below to see your personalized summary and book your call.`

    default:
      return `Based on what we discovered, I'd recommend booking a free call with someone who can help you move forward.

Click "View Your Summary & Next Steps" below to see your personalized summary and book your call.`
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

    case 'psychology':
      return 'there\'s an internal pattern here—fear, self-doubt, or depletion—that\'s making everything feel harder than it needs to be'

    default:
      return 'there\'s a pattern here, but we need to zoom out to see it clearly'
  }
}
