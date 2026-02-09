/**
 * Component Policies (Layer 2 - Guards)
 *
 * Policies define when a component CAN be shown - hard constraints
 * that override any business rules. If a policy check fails,
 * the component will not be shown regardless of what rules say.
 */

import type { ComponentType, ComponentPolicy, ConditionValue } from './types.js'
import type { ConversationState } from '../core/types.js'

// ============================================================================
// POLICY DEFINITIONS
// ============================================================================

export const componentPolicies: Record<ComponentType, ComponentPolicy> = {
  view_summary: {
    type: 'view_summary',

    // Required conditions - ALL must be true
    requires: {
      // Must have delivered a diagnosis
      diagnosis_delivered: true,

      // Must have a constraint identified
      constraint_hypothesis: { not: null }
    },

    // Blocking conditions - if ANY are true, component is blocked
    blocks: {
      // Don't show if already viewing summary (prevent double-trigger)
      summary_already_shown: true
    }
  },

  save_progress: {
    type: 'save_progress',

    // Required conditions - ALL must be true
    requires: {
      // Must have delivered a diagnosis (they've done the work)
      diagnosis_delivered: true,

      // Must have a constraint identified
      constraint_hypothesis: { not: null }
    },

    // Blocking conditions - if ANY are true, component is blocked
    blocks: {
      // Note: We intentionally do NOT block on summary_already_shown
      // If user rejected the booking CTA, we still want to offer email capture
      // This ensures every conversation ends with a next step
    }
  },

  collect_email: {
    type: 'collect_email',

    // No strict requirements - trigger logic is in orchestrator (deterministic rule 5)
    requires: {},

    // Blocking conditions
    blocks: {
      email_capture_shown: true
    }
  }

  // Future policies would be added here:
  // book_call: { ... }
}

// ============================================================================
// POLICY EVALUATION
// ============================================================================

/**
 * Check if a component passes its policy guards
 */
export function checkPolicy(
  type: ComponentType,
  state: ConversationState
): { eligible: boolean; reason?: string } {
  const policy = componentPolicies[type]

  // No policy = always eligible
  if (!policy) {
    return { eligible: true }
  }

  // Check blocking conditions first (faster rejection)
  if (policy.blocks) {
    for (const [field, blockValue] of Object.entries(policy.blocks)) {
      const actual = getStateValue(state, field)
      if (matchesCondition(actual, blockValue)) {
        return {
          eligible: false,
          reason: `Blocked by condition: ${field}`
        }
      }
    }
  }

  // Check required conditions
  if (policy.requires) {
    for (const [field, required] of Object.entries(policy.requires)) {
      const actual = getStateValue(state, field)
      if (!matchesCondition(actual, required)) {
        return {
          eligible: false,
          reason: `Missing requirement: ${field} (expected: ${JSON.stringify(required)}, got: ${JSON.stringify(actual)})`
        }
      }
    }
  }

  return { eligible: true }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get a value from state, supporting dot notation for nested paths
 */
function getStateValue(state: ConversationState, field: string): unknown {
  const parts = field.split('.')
  let value: unknown = state

  for (const part of parts) {
    if (value === null || value === undefined) {
      return undefined
    }
    value = (value as Record<string, unknown>)[part]
  }

  return value
}

/**
 * Check if an actual value matches an expected condition
 */
function matchesCondition(actual: unknown, expected: ConditionValue): boolean {
  // Null/undefined checks
  if (expected === null) {
    return actual === null
  }

  // Direct equality for primitives
  if (typeof expected !== 'object') {
    return actual === expected
  }

  // Operator conditions
  const operators = expected as Record<string, unknown>

  if ('not' in operators) {
    return actual !== operators.not
  }

  if ('exists' in operators) {
    return operators.exists ? actual != null : actual == null
  }

  if ('gte' in operators) {
    return typeof actual === 'number' && actual >= (operators.gte as number)
  }

  if ('lte' in operators) {
    return typeof actual === 'number' && actual <= (operators.lte as number)
  }

  if ('gt' in operators) {
    return typeof actual === 'number' && actual > (operators.gt as number)
  }

  if ('lt' in operators) {
    return typeof actual === 'number' && actual < (operators.lt as number)
  }

  if ('in' in operators) {
    return Array.isArray(operators.in) && operators.in.includes(actual)
  }

  // Default to equality
  return actual === expected
}
