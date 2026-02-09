/**
 * Component System Types
 *
 * This defines the interfaces for the component-based response system.
 * Components are UI elements that get appended to conversation responses
 * based on business rules - the LLM never generates these directly.
 */

import type { ConversationState, ConstraintCategory, ClosingSynthesis } from '../core/types.js'

// ============================================================================
// COMPONENT TYPES
// ============================================================================

/**
 * Available component types
 * Add new component types here as the system grows
 */
export type ComponentType =
  | 'view_summary'        // CTA to view the conversation summary (ready users)
  | 'save_progress'       // Low-commitment CTA for hesitant users
  | 'collect_email'       // Mid-conversation email capture card
  // Future components:
  // | 'book_call'
  // | 'download_resource'

/**
 * Trigger points in the conversation where components can be evaluated
 *
 * Design: Components only appear at conversation completion, not mid-conversation.
 * This ensures clean separation between exploration/diagnosis and CTAs.
 */
export type TriggerPoint =
  | 'closing_sequence_complete'   // After closing sequence finishes (complete_with_handoff)
  | 'conversation_complete'       // Conversation marked as complete (legacy/fallback)
  | 'conversation_stalled'        // User hesitant, conversation reaching natural end
  | 'explicit_user_request'       // User explicitly asked for something (after diagnosis)
  // Future triggers:
  // | 'high_engagement_moment'
  // | 'resource_downloaded'
  // | 'mid_conversation_milestone'

// ============================================================================
// COMPONENT DEFINITION (Layer 1)
// ============================================================================

/**
 * Context passed to components for rendering
 */
export interface ComponentContext {
  state: ConversationState
  synthesis?: ClosingSynthesis | null
  config?: Record<string, unknown>
}

/**
 * A rendered component ready for assembly
 */
export interface RenderedComponent {
  type: ComponentType

  // Natural language text for the component
  // This gets appended to the LLM response
  text: string

  // Structured metadata for frontend rendering
  // Frontend can use this to render rich UI
  metadata: {
    action?: string              // Primary action URL or identifier
    actionLabel?: string         // Button/CTA text
    variant?: string             // Visual variant for styling
    [key: string]: unknown       // Component-specific data
  }
}

/**
 * A component definition - knows how to render itself
 */
export interface Component {
  type: ComponentType

  // Render the component given context
  render(context: ComponentContext): RenderedComponent
}

// ============================================================================
// COMPONENT POLICY (Layer 2 - Guards)
// ============================================================================

/**
 * Condition operators for complex matching
 */
export interface ConditionOperators {
  gte?: number                   // Greater than or equal
  lte?: number                   // Less than or equal
  gt?: number                    // Greater than
  lt?: number                    // Less than
  in?: unknown[]                 // Value in array
  not?: unknown                  // Not equal to
  exists?: boolean               // Is not null/undefined
}

export type ConditionValue = unknown | ConditionOperators

/**
 * Policy guard for a component - defines when it CAN be shown
 */
export interface ComponentPolicy {
  type: ComponentType

  // Required conditions - ALL must be true
  requires?: Record<string, ConditionValue>

  // Blocking conditions - if ANY match, component is blocked
  blocks?: Record<string, ConditionValue>
}

// ============================================================================
// COMPONENT RULES (Layer 3 - Business Logic)
// ============================================================================

/**
 * A trigger specification for a component in a rule
 */
export interface ComponentTrigger {
  type: ComponentType
  config?: Record<string, unknown>
}

/**
 * A business rule that determines when components should show
 */
export interface ComponentRule {
  id: string
  name: string
  description: string

  // When does this rule get evaluated?
  trigger: TriggerPoint

  // What conditions must be true for this rule to match?
  conditions: Record<string, ConditionValue>

  // What components to trigger when this rule matches
  components: ComponentTrigger[]

  // Priority for rule ordering (higher = checked first)
  priority: number
}

// ============================================================================
// RULE ENGINE
// ============================================================================

/**
 * Context available during rule evaluation
 * Built from ConversationState + computed values
 */
export interface EvaluationContext {
  // From tracked state
  turns_total: number
  diagnosis_delivered: boolean
  summary_already_shown: boolean
  closing_phase: string
  constraint: ConstraintCategory | null
  user_name: string | null

  // From LLM analysis
  alignment_expressed: boolean
  hesitation_expressed: boolean
  explicit_request: string | null

  // Computed
  [key: string]: unknown
}

/**
 * Result of rule evaluation
 */
export interface RuleEvaluationResult {
  matched: boolean
  rule: ComponentRule | null
  components: ComponentTrigger[]
  debug: {
    trigger: TriggerPoint
    rulesEvaluated: number
    matchedRuleId?: string
    reason?: string
  }
}

// ============================================================================
// RESPONSE ASSEMBLY
// ============================================================================

/**
 * Final assembled response combining LLM content and components
 */
export interface AssembledResponse {
  // Pure conversational content from LLM
  conversation: string

  // Rendered components
  components: RenderedComponent[]

  // Combined text for text-only contexts
  fullText: string

  // Structured payload for frontend
  payload: {
    message: string
    components: {
      type: string
      text: string
      metadata: Record<string, unknown>
    }[]
  }
}
