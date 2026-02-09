/**
 * Component Rules (Layer 3 - Business Logic)
 *
 * NOTE: These rules are NOT actively evaluated by the rule engine at runtime.
 * Component triggering is handled by deterministic rules in orchestrator.ts
 * (see "DETERMINISTIC RULE" comments). These rules serve as documentation
 * of the intended behavior and can be externalized to YAML in the future.
 *
 * Rules determine WHEN components SHOULD show, based on conversation
 * state and user signals. Rules are evaluated in priority order -
 * first matching rule wins.
 */

import type { ComponentRule } from './types.js'

// ============================================================================
// VIEW_SUMMARY RULES
// ============================================================================

export const componentRules: ComponentRule[] = [
  // ---------------------------------------------------------
  // CLOSING SEQUENCE COMPLETE - User Aligned
  // ---------------------------------------------------------
  {
    id: 'summary_aligned_close',
    name: 'Aligned User - Confident Summary CTA',
    description: `
      User completed the closing sequence and showed alignment.
      This is the ideal conversion path - present summary with
      confident, forward-momentum framing.
    `,

    trigger: 'closing_sequence_complete',

    conditions: {
      alignment_expressed: true,
      hesitation_expressed: false
    },

    components: [
      {
        type: 'view_summary',
        config: { variant: 'aligned' }
      }
    ],

    priority: 100
  },

  // ---------------------------------------------------------
  // CLOSING SEQUENCE COMPLETE - User Uncertain
  // ---------------------------------------------------------
  {
    id: 'summary_soft_close',
    name: 'Uncertain User - Soft Summary CTA',
    description: `
      User completed closing but didn't show clear alignment.
      Present summary with softer, no-pressure framing.
    `,

    trigger: 'closing_sequence_complete',

    conditions: {
      alignment_expressed: false,
      hesitation_expressed: false
    },

    components: [
      {
        type: 'view_summary',
        config: { variant: 'soft' }
      }
    ],

    priority: 90
  },

  // ---------------------------------------------------------
  // CLOSING SEQUENCE COMPLETE - User Hesitant but Engaged
  // ---------------------------------------------------------
  // NOTE: Removed in favor of save_progress for hesitant users.
  // Hesitant users should get low-commitment save_progress, not a summary CTA.
  // The save_progress_closing_hesitant rule handles this case.

  // ---------------------------------------------------------
  // CONVERSATION COMPLETE (Legacy/Fallback)
  // ---------------------------------------------------------
  {
    id: 'summary_conversation_complete',
    name: 'Conversation Complete - Default Summary CTA',
    description: `
      Fallback rule for when conversation is marked complete
      without going through the full closing sequence.
    `,

    trigger: 'conversation_complete',

    conditions: {
      // No specific conditions - this is the fallback
    },

    components: [
      {
        type: 'view_summary',
        config: { variant: 'default' }
      }
    ],

    priority: 50
  },

  // ---------------------------------------------------------
  // EXPLICIT USER REQUEST
  // ---------------------------------------------------------
  {
    id: 'summary_explicit_request',
    name: 'User Requests Summary',
    description: `
      User explicitly asked to see their summary or next steps.
      Respond directly to their request.
    `,

    trigger: 'explicit_user_request',

    conditions: {
      explicit_request: { in: ['summary', 'next_steps', 'results'] }
    },

    components: [
      {
        type: 'view_summary',
        config: { variant: 'aligned' }  // They asked - treat as aligned
      }
    ],

    priority: 200  // Highest priority - user explicitly asked
  },

  // =========================================================
  // SAVE_PROGRESS RULES (for hesitant users)
  // =========================================================

  // ---------------------------------------------------------
  // CONVERSATION STALLED - User Hesitant
  // ---------------------------------------------------------
  {
    id: 'save_progress_hesitant',
    name: 'Hesitant User - Save Progress',
    description: `
      User expressed hesitation during closing or conversation stalled.
      Offer low-commitment way to preserve their insights.
    `,

    trigger: 'conversation_stalled',

    conditions: {
      hesitation_expressed: true
    },

    components: [
      {
        type: 'save_progress',
        config: { variant: 'reflective' }
      }
    ],

    priority: 80
  },

  // ---------------------------------------------------------
  // CONVERSATION STALLED - No Clear Signal
  // ---------------------------------------------------------
  {
    id: 'save_progress_stalled',
    name: 'Stalled Conversation - Save Progress',
    description: `
      Conversation reached natural end without clear resolution.
      Default to save_progress as graceful close.
    `,

    trigger: 'conversation_stalled',

    conditions: {
      // No specific conditions - fallback for stalled conversations
    },

    components: [
      {
        type: 'save_progress',
        config: { variant: 'practical' }
      }
    ],

    priority: 40  // Lower priority - fallback
  },

  // ---------------------------------------------------------
  // CLOSING COMPLETE BUT HESITANT
  // ---------------------------------------------------------
  {
    id: 'save_progress_closing_hesitant',
    name: 'Closing Complete But Hesitant - Save Progress',
    description: `
      User went through closing sequence but expressed hesitation.
      Offer save_progress instead of pushing for summary.
    `,

    trigger: 'closing_sequence_complete',

    conditions: {
      hesitation_expressed: true,
      alignment_expressed: false
    },

    components: [
      {
        type: 'save_progress',
        config: { variant: 'gentle' }
      }
    ],

    priority: 85  // Higher than regular hesitant close, but lower than aligned
  },

  // ---------------------------------------------------------
  // PUSHBACK AFTER SUMMARY CTA - Fallback to Email Capture
  // ---------------------------------------------------------
  {
    id: 'save_progress_after_summary_rejected',
    name: 'Summary Rejected - Email Capture Fallback',
    description: `
      User saw the summary CTA but pushed back or expressed hesitation.
      Offer email capture as a lower-commitment alternative.
      Ensures every conversation ends with a next step.
    `,

    trigger: 'closing_sequence_complete',

    conditions: {
      summary_already_shown: true,
      hesitation_expressed: true
    },

    components: [
      {
        type: 'save_progress',
        config: { variant: 'fallback' }
      }
    ],

    priority: 95  // Higher than hesitant close - this is the recovery path
  },

  // ---------------------------------------------------------
  // EARLY EXIT - No Diagnosis Delivered (off-ramp scenarios)
  // ---------------------------------------------------------
  {
    id: 'email_capture_early_exit',
    name: 'Early Exit - Email Capture',
    description: `
      Conversation ended before diagnosis was delivered (frustrated user,
      low engagement exit, exit intent). Still capture email so we can
      nurture them for future re-engagement.
    `,

    trigger: 'closing_sequence_complete',

    conditions: {
      diagnosis_delivered: false
    },

    components: [
      {
        type: 'collect_email',
        config: { variant: 'early_exit' }
      }
    ],

    priority: 30  // Low priority - only fires when no other closing rule matches
  }
]

// ============================================================================
// RULE HELPERS
// ============================================================================

/**
 * Get rules sorted by priority (highest first)
 */
export function getRulesByPriority(): ComponentRule[] {
  return [...componentRules].sort((a, b) => b.priority - a.priority)
}

/**
 * Get rules for a specific trigger point
 */
export function getRulesForTrigger(trigger: string): ComponentRule[] {
  return componentRules
    .filter(rule => rule.trigger === trigger)
    .sort((a, b) => b.priority - a.priority)
}
