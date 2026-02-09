/**
 * View Summary Component
 *
 * A conversion-optimized CTA that encourages users to view their
 * personalized summary at the end of the conversation.
 *
 * This component adapts its messaging based on:
 * - User's constraint type (strategy/execution/psychology)
 * - User's emotional state (aligned/hesitant)
 * - Conversation context (what they shared, their stakes)
 */

import type { Component, ComponentContext, RenderedComponent } from '../types.js'
import type { ConstraintCategory, ClosingSynthesis } from '../../core/types.js'

/**
 * Constraint-specific value propositions
 * What makes the summary valuable for each constraint type
 */
const CONSTRAINT_VALUE_PROPS: Record<ConstraintCategory, {
  headline: string
  benefit: string
  specifics: string
}> = {
  strategy: {
    headline: 'Your clarity roadmap is ready',
    benefit: 'See exactly what\'s been keeping you stuck and the path forward',
    specifics: 'positioning insights, decision framework, and recommended next steps'
  },
  execution: {
    headline: 'Your systems blueprint is ready',
    benefit: 'See what to systematize first and how to stop being the bottleneck',
    specifics: 'priority actions, delegation opportunities, and implementation sequence'
  },
  psychology: {
    headline: 'Your breakthrough summary is ready',
    benefit: 'See the patterns we uncovered and how to move past them',
    specifics: 'internal blocks identified, reframes to practice, and support recommendations'
  }
}

/**
 * Variant-specific messaging
 * Different tones based on user's state
 */
type Variant = 'aligned' | 'soft' | 'curious' | 'default'

export const viewSummaryComponent: Component = {
  type: 'view_summary',

  render(ctx: ComponentContext): RenderedComponent {
    const { state, synthesis, config } = ctx
    const variant = (config?.variant as Variant) ?? 'default'
    const constraint = state.constraint_hypothesis || 'strategy'

    // Build personalized text
    const text = buildText(variant, constraint, state.user_name || null, synthesis)

    // Build rich metadata for frontend
    const metadata = buildMetadata(variant, constraint, state, synthesis)

    return {
      type: 'view_summary',
      text,
      metadata
    }
  }
}

/**
 * Build the natural language text for this component
 *
 * IMPORTANT: This text should be MINIMAL because the UI will render
 * the actual button/card. We don't need sentences about "clicking below" -
 * the frontend handles the visual CTA.
 */
function buildText(
  _variant: Variant,
  _constraint: ConstraintCategory,
  _userName: string | null,
  _synthesis: ClosingSynthesis | null | undefined
): string {
  // Return empty text - the UI renders the button component
  // The LLM's conversational response is all that's needed
  // The metadata below drives what the frontend displays
  return ''
}

/**
 * Build metadata for frontend rendering
 */
function buildMetadata(
  variant: Variant,
  constraint: ConstraintCategory,
  state: import('../../core/types.js').ConversationState,
  synthesis: ClosingSynthesis | null | undefined
): RenderedComponent['metadata'] {
  const props = CONSTRAINT_VALUE_PROPS[constraint]

  return {
    // Primary action
    action: 'view_summary',
    actionLabel: getActionLabel(variant),

    // Visual variant for styling
    variant,

    // Headline for summary card
    headline: props.headline,
    subheadline: props.benefit,

    // Constraint-specific theming
    constraint,
    constraintLabel: getConstraintLabel(constraint),

    // Preview of what's in the summary (for hover/preview states)
    preview: {
      sections: getSummarySections(constraint),
      stakes: synthesis?.stakes_to_foreground || [],
      recommendation: synthesis?.recommended_support_category || null
    },

    // Session context for tracking
    turnsTotal: state.turns_total,

    // For analytics
    triggeredAt: new Date().toISOString()
  }
}

/**
 * Get action label based on variant
 */
function getActionLabel(variant: Variant): string {
  switch (variant) {
    case 'aligned':
      return 'View My Summary'
    case 'soft':
      return 'View Summary'
    case 'curious':
      return 'See What I Found'
    default:
      return 'View Your Summary'
  }
}

/**
 * Get human-readable constraint label
 */
function getConstraintLabel(constraint: ConstraintCategory): string {
  switch (constraint) {
    case 'strategy':
      return 'Clarity & Direction'
    case 'execution':
      return 'Systems & Leverage'
    case 'psychology':
      return 'Internal Patterns'
  }
}

/**
 * Get summary section labels for preview
 */
function getSummarySections(constraint: ConstraintCategory): string[] {
  const common = ['What We Uncovered', 'The Real Challenge']

  switch (constraint) {
    case 'strategy':
      return [...common, 'Positioning Insights', 'Recommended Path Forward']
    case 'execution':
      return [...common, 'System Priorities', 'Quick Wins to Start']
    case 'psychology':
      return [...common, 'Patterns Identified', 'Reframes to Practice']
  }
}
