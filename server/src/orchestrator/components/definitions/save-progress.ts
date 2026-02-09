/**
 * Save Progress Component
 *
 * Low-commitment CTA for hesitant users who gained insight
 * but aren't ready to take action. Preserves value and leaves
 * the door open for future engagement.
 *
 * Design principles:
 * - Validate their process (they did real work)
 * - Preserve value (don't let insights fade)
 * - Low commitment (email vs book a call)
 * - Leave door open (when you're ready...)
 */

import type { Component, ComponentContext, RenderedComponent } from '../types.js'
import type { ConstraintCategory } from '../../core/types.js'

// Constraint-specific insight framing
const CONSTRAINT_INSIGHTS: Record<ConstraintCategory, {
  whatYouUncovered: string
  whyItMatters: string
}> = {
  strategy: {
    whatYouUncovered: 'clarity on what\'s been keeping you scattered',
    whyItMatters: 'Now you know the real question isn\'t "what should I do" but "who am I building this for"'
  },
  execution: {
    whatYouUncovered: 'the bottleneck that\'s been limiting your growth',
    whyItMatters: 'Now you can see it\'s not about working harder - it\'s about building differently'
  },
  psychology: {
    whatYouUncovered: 'the internal pattern that\'s been running the show',
    whyItMatters: 'Now you can see it\'s not about discipline or tactics - it\'s about what\'s underneath'
  }
}

// Variants based on hesitation type
type SaveProgressVariant = 'reflective' | 'practical' | 'gentle' | 'fallback' | 'turn_limit'

interface VariantContent {
  headline: string
  subhead: string
  primaryCTA: string
  secondaryCTA: string
}

const VARIANT_CONTENT: Record<SaveProgressVariant, VariantContent> = {
  // For users who are processing deeply
  reflective: {
    headline: 'Your insights are worth keeping',
    subhead: 'You did real work here - even if you\'re not ready to act on it yet.',
    primaryCTA: 'Email me my insights',
    secondaryCTA: 'View summary'
  },

  // For users who want something concrete
  practical: {
    headline: 'Here\'s what we uncovered',
    subhead: 'I\'ve captured the key points so you don\'t lose them.',
    primaryCTA: 'Save to email',
    secondaryCTA: 'View now'
  },

  // For users who seem overwhelmed
  gentle: {
    headline: 'No pressure - just saving your progress',
    subhead: 'Whenever you\'re ready, your insights will be here.',
    primaryCTA: 'Send to my email',
    secondaryCTA: 'Take a look'
  },

  // For users who pushed back on booking - lower commitment alternative
  fallback: {
    headline: 'I\'ll send you what we discussed',
    subhead: 'Take some time with it. We can always connect later if you want to go deeper.',
    primaryCTA: 'Email me the summary',
    secondaryCTA: 'No thanks'
  },

  // For when conversation hits turn limit - graceful wrap up
  turn_limit: {
    headline: 'We covered a lot of ground today',
    subhead: 'I\'ll send you a summary of what we uncovered so you don\'t lose these insights.',
    primaryCTA: 'Email me my summary',
    secondaryCTA: 'No thanks'
  }
}

/**
 * Build the component text
 */
function buildText(
  variant: SaveProgressVariant,
  constraint: ConstraintCategory | null,
  userName?: string
): string {
  const content = VARIANT_CONTENT[variant]

  // Get constraint-specific insight if available
  const insight = constraint ? CONSTRAINT_INSIGHTS[constraint] : null

  let text = `${content.headline}${userName ? `, ${userName}` : ''}.\n\n`

  if (insight) {
    text += `Today you uncovered ${insight.whatYouUncovered}. ${insight.whyItMatters}.\n\n`
  }

  text += `${content.subhead}\n\n`
  text += `[${content.primaryCTA}]  [${content.secondaryCTA}]`

  return text
}

/**
 * Determine variant based on context
 */
function determineVariant(context: ComponentContext): SaveProgressVariant {
  // Check for explicit config
  if (context.config?.variant) {
    return context.config.variant as SaveProgressVariant
  }

  // Infer from state
  const { state } = context

  // If high emotional charge, use gentle
  if (state.emotional_charge === 'high' || state.overwhelm_detected) {
    return 'gentle'
  }

  // If they've been exploring for a while, use reflective
  if (state.turns_total > 20) {
    return 'reflective'
  }

  // Default to practical
  return 'practical'
}

/**
 * Save Progress Component Definition
 */
export const saveProgressComponent: Component = {
  type: 'save_progress',

  render(context: ComponentContext): RenderedComponent {
    const variant = determineVariant(context)
    const constraint = context.state.constraint_hypothesis
    const userName = context.state.user_name

    console.log(`[SaveProgress] Rendering variant: ${variant}, constraint: ${constraint}`)

    const text = buildText(variant, constraint, userName)

    return {
      type: 'save_progress',
      text,
      metadata: {
        variant,
        constraint,
        userName: userName || null,
        // For frontend to know which CTAs to show
        actions: {
          primary: 'email_summary',
          secondary: 'view_summary'
        }
      }
    }
  }
}
