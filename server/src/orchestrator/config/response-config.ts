// Response configuration - templates and structural requirements
// This file controls response structure validation
// Easy to update without code changes

import type { ConstraintCategory } from '../core/types.js'

/**
 * Constraint descriptions for reference
 * Used by the AI to understand what each constraint means
 * The closing flow is now handled dynamically by the AI via the closing_handoff overlay
 */
export const CONSTRAINT_DESCRIPTIONS: Record<ConstraintCategory, {
  summary_frame: string
  recommendation: string
}> = {
  strategy: {
    summary_frame: "You need clarity on direction - who you serve and what makes you different.",
    recommendation: "Working with someone who specializes in positioning - they help you get clear on exactly who you serve and how to talk about it."
  },
  execution: {
    summary_frame: "You need systems and support so you're not the bottleneck.",
    recommendation: "Getting support from someone who specializes in building systems and delegation - they help you identify what to hand off first."
  },
  psychology: {
    summary_frame: "You're blocked by internal patterns - fear, self-doubt, or permission issues - not by strategy or systems.",
    recommendation: "Working with someone who understands the deeper patterns - helping you work through the internal blocks so you can actually take action."
  }
}

/**
 * Structural requirements per action type
 * Used for positive validation - checking what SHOULD be present
 */
export const ACTION_REQUIREMENTS: Record<string, {
  must_end_with_question: boolean
  max_sentences?: number
  purpose: string
}> = {
  explore: {
    must_end_with_question: true,
    max_sentences: 5,
    purpose: "Ask one insightful question based on what they shared"
  },
  reflect_insight: {
    must_end_with_question: true,
    max_sentences: 6,
    purpose: "Mirror back their breakthrough, then ask what it means to them"
  },
  surface_contradiction: {
    must_end_with_question: true,
    max_sentences: 6,
    purpose: "Name the tension you're seeing and ask them to help you understand"
  },
  validate: {
    must_end_with_question: true,
    max_sentences: 6,
    purpose: "Present hypothesis and ask if it resonates"
  },
  diagnose: {
    must_end_with_question: true,
    max_sentences: 6,
    purpose: "Share diagnosis clearly and ask if it lands"
  },
  check_blockers: {
    must_end_with_question: true,
    max_sentences: 4,
    purpose: "Ask what would prevent them from working on this"
  },
  stress_test: {
    must_end_with_question: true,
    max_sentences: 5,
    purpose: "Check if the hypothesis holds up - invite them to challenge it"
  },
  build_criteria: {
    must_end_with_question: true,
    max_sentences: 5,
    purpose: "Establish what success looks like together"
  },
  pre_commitment_check: {
    must_end_with_question: true,
    max_sentences: 5,
    purpose: "Check readiness and surface blockers"
  },
  request_diagnosis_consent: {
    must_end_with_question: true,
    max_sentences: 3,
    purpose: "Ask permission to share what you're seeing"
  },
  explore_readiness: {
    must_end_with_question: true,
    max_sentences: 4,
    purpose: "Explore what's behind their hesitation"
  },
  contain: {
    must_end_with_question: true,
    max_sentences: 5,
    purpose: "Create safety and simplify focus"
  },
  deepen: {
    must_end_with_question: true,
    max_sentences: 4,
    purpose: "Ask for more specificity or examples"
  },
  cross_map: {
    must_end_with_question: true,
    max_sentences: 5,
    purpose: "Redirect to the upstream constraint"
  },
  complete_with_handoff: {
    must_end_with_question: false,  // Only action that doesn't need a question
    max_sentences: 10,  // Longer to allow for dynamic closing flow
    purpose: "Guide them to next steps like an enrollment professional - warm and consultative"
  },

  // =============================================================================
  // MULTI-TURN CLOSING SEQUENCE (Danny's enrollment-professional model)
  // =============================================================================

  closing_reflect_implication: {
    must_end_with_question: true,  // Text chat needs invitation to respond (soft check-in)
    max_sentences: 6,
    purpose: "Reflect diagnosis with structural implication, end with 'Does that resonate?'"
  },
  closing_reflect_stakes: {
    must_end_with_question: true,  // Text chat needs invitation to respond (soft check-in)
    max_sentences: 4,
    purpose: "Mirror back stakes as statement, end with brief 'Does that land?' or 'Yeah?'"
  },
  closing_name_capability_gap: {
    must_end_with_question: true,  // Text chat needs invitation to respond
    max_sentences: 6,
    purpose: "Name what's missing mechanically, end with 'Does that make sense?'"
  },
  closing_assert_and_align: {
    must_end_with_question: true,  // Check for sense-making alignment
    max_sentences: 5,
    purpose: "Assert what would be helpful (not 'would it be helpful'), then check alignment"
  },
  closing_facilitate: {
    must_end_with_question: false,  // Describing the path forward
    max_sentences: 6,
    purpose: "Lay out the path as continuation - booking is implementation detail, not the point"
  },

  push_back_on_low_effort: {
    must_end_with_question: true,
    max_sentences: 4,
    purpose: "Gently push for more depth - acknowledge their response, then ask a more specific question"
  }
}

/**
 * Get the constraint description for prompt context
 */
export function getConstraintDescription(constraint: ConstraintCategory | null): {
  summary_frame: string
  recommendation: string
} {
  return CONSTRAINT_DESCRIPTIONS[constraint || 'strategy']
}
