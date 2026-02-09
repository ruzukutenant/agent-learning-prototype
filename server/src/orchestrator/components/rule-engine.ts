/**
 * Component Rule Engine
 *
 * Evaluates business rules to determine which components should
 * be triggered at any given moment in the conversation.
 *
 * The engine:
 * 1. Filters rules by trigger point
 * 2. Evaluates conditions against current state
 * 3. Applies policy guards to filter eligible components
 * 4. Returns the components to be rendered
 */

import type {
  ComponentTrigger,
  TriggerPoint,
  EvaluationContext,
  RuleEvaluationResult,
  ConditionValue
} from './types.js'
import type { ConversationState } from '../core/types.js'
import { getRulesForTrigger } from './rules.js'
import { checkPolicy } from './policies.js'

// ============================================================================
// ANALYSIS SIGNALS
// ============================================================================

/**
 * Signals extracted from unified analysis that are relevant to component rules
 */
export interface AnalysisSignals {
  alignment_expressed: boolean
  hesitation_expressed: boolean
  explicit_request: string | null
}

// ============================================================================
// RULE ENGINE
// ============================================================================

export class ComponentRuleEngine {
  /**
   * Evaluate rules for a trigger point and return components to render
   */
  evaluate(
    trigger: TriggerPoint,
    state: ConversationState,
    signals: AnalysisSignals
  ): RuleEvaluationResult {
    console.log(`[RuleEngine] Evaluating trigger: ${trigger}`)

    // Build evaluation context from state + signals
    const context = this.buildContext(state, signals)

    // Get rules for this trigger, sorted by priority
    const rules = getRulesForTrigger(trigger)
    console.log(`[RuleEngine] ${rules.length} rules for trigger ${trigger}`)

    // Find first matching rule
    for (const rule of rules) {
      const conditionResult = this.evaluateConditions(rule.conditions, context)

      if (conditionResult.matched) {
        console.log(`[RuleEngine] Rule matched: ${rule.id}`)

        // Filter components by policy eligibility
        const eligibleComponents = this.filterByPolicy(rule.components, state)

        if (eligibleComponents.length === 0) {
          console.log(`[RuleEngine] All components blocked by policy, continuing to next rule`)
          continue
        }

        return {
          matched: true,
          rule,
          components: eligibleComponents,
          debug: {
            trigger,
            rulesEvaluated: rules.indexOf(rule) + 1,
            matchedRuleId: rule.id
          }
        }
      } else {
        console.log(`[RuleEngine] Rule ${rule.id} conditions not met:`, conditionResult.debug)
      }
    }

    console.log(`[RuleEngine] No rules matched for trigger: ${trigger}`)
    return {
      matched: false,
      rule: null,
      components: [],
      debug: {
        trigger,
        rulesEvaluated: rules.length,
        reason: 'no_matching_rules'
      }
    }
  }

  /**
   * Build evaluation context from state and analysis signals
   */
  private buildContext(
    state: ConversationState,
    signals: AnalysisSignals
  ): EvaluationContext {
    return {
      // From tracked state
      turns_total: state.turns_total,
      diagnosis_delivered: state.diagnosis_delivered,
      summary_already_shown: state.summary_already_shown,
      closing_phase: state.closing_sequence?.phase || 'not_started',
      constraint: state.constraint_hypothesis,
      user_name: state.user_name || null,

      // From analysis signals
      alignment_expressed: signals.alignment_expressed,
      hesitation_expressed: signals.hesitation_expressed,
      explicit_request: signals.explicit_request,

      // Computed values
      turns_since_diagnosis: state.diagnosis_delivered
        ? state.turns_total - (state.turns_total - state.turns_in_phase)
        : null
    }
  }

  /**
   * Evaluate rule conditions against context
   */
  private evaluateConditions(
    conditions: Record<string, ConditionValue>,
    context: EvaluationContext
  ): { matched: boolean; debug: Record<string, unknown> } {
    const debug: Record<string, unknown> = {}

    // Empty conditions = always match
    if (Object.keys(conditions).length === 0) {
      return { matched: true, debug: { note: 'no_conditions' } }
    }

    for (const [field, expected] of Object.entries(conditions)) {
      const actual = context[field]
      const matches = this.matchesCondition(actual, expected)

      debug[field] = { expected, actual, matches }

      if (!matches) {
        return { matched: false, debug }
      }
    }

    return { matched: true, debug }
  }

  /**
   * Filter components through their policy guards
   */
  private filterByPolicy(
    components: ComponentTrigger[],
    state: ConversationState
  ): ComponentTrigger[] {
    return components.filter(comp => {
      const policyResult = checkPolicy(comp.type, state)

      if (!policyResult.eligible) {
        console.log(`[RuleEngine] Component ${comp.type} blocked by policy: ${policyResult.reason}`)
        return false
      }

      return true
    })
  }

  /**
   * Check if an actual value matches an expected condition
   */
  private matchesCondition(actual: unknown, expected: ConditionValue): boolean {
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
}

// Singleton instance
export const ruleEngine = new ComponentRuleEngine()
