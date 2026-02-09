// Cross-mapping logic - detect upstream constraints
// Execution chaos often traces to unclear strategy
// Strategy paralysis often traces to psychology (fear/burnout)
// Psychology blocks can trace back to execution overwhelm

import type { ConstraintCategory, ConversationSignals, StateInference, CrossMapResult, UnifiedAnalysis } from '../core/types.js'

/**
 * Check if apparent constraint actually traces to upstream root cause
 *
 * Cross-mapping patterns:
 * - EXECUTION → STRATEGY: Scattered tactics often mean unclear positioning
 * - STRATEGY → PSYCHOLOGY: Paralysis/overthinking often means fear or burnout
 * - PSYCHOLOGY → EXECUTION: Burnout often caused by unsustainable systems
 */
export function detectUpstreamConstraint(
  apparentCategory: ConstraintCategory,
  inference: StateInference,
  signals: ConversationSignals,
  analysis?: UnifiedAnalysis
): CrossMapResult {

  // Primary: LLM-detected cross-mapping from unified analysis
  if (analysis?.cross_mapping?.upstream_signal_detected && analysis.cross_mapping.apparent_vs_root) {
    const upstreamMap: Record<string, ConstraintCategory> = {
      'execution_from_strategy': 'strategy',
      'strategy_from_psychology': 'psychology',
      'psychology_from_execution': 'execution'
    }
    const upstream = upstreamMap[analysis.cross_mapping.apparent_vs_root]
    if (upstream) {
      return {
        should_redirect: true,
        upstream_category: upstream,
        reasoning: analysis.cross_mapping.evidence,
        confidence: 0.75
      }
    }
  }

  // Fallback: existing regex logic
  switch (apparentCategory) {
    case 'execution':
      return checkExecutionToStrategy(inference, signals)

    case 'strategy':
      return checkStrategyToPsychology(inference, signals)

    case 'psychology':
      return checkPsychologyToExecution(inference, signals)

    default:
      return {
        should_redirect: false,
        upstream_category: null,
        reasoning: 'No cross-mapping needed',
        confidence: 0
      }
  }
}

/**
 * Check if execution chaos traces to unclear strategy
 *
 * Signals:
 * - Mentions "trying everything", "scattered", "inconsistent"
 * - But can't articulate WHO they serve or WHAT makes them different
 * - Multiple tactics but no coherent approach
 */
function checkExecutionToStrategy(
  inference: StateInference,
  signals: ConversationSignals
): CrossMapResult {

  const scatteredLanguage = /scattered|trying everything|inconsistent|all over the place|don't know what to focus on/i
  const evidence = inference.constraint_hypothesis.evidence.join(' ')

  const hasScatteredPattern = scatteredLanguage.test(evidence)
  const subDimension = inference.sub_dimension.dimension

  // If sub-dimension suggests positioning/clarity issues, not just systems
  const suggestsStrategyIssue =
    subDimension === 'offer_clarity' ||
    subDimension === 'positioning' ||
    evidence.includes('not clear') ||
    evidence.includes('don\'t know who')

  if (hasScatteredPattern && suggestsStrategyIssue) {
    return {
      should_redirect: true,
      upstream_category: 'strategy',
      reasoning: 'Execution chaos (scattered tactics) often stems from unclear positioning - need to clarify WHO they serve and WHAT makes them different before fixing systems',
      confidence: 0.8
    }
  }

  return {
    should_redirect: false,
    upstream_category: null,
    reasoning: 'Execution issues appear to be genuine systems/capacity problems',
    confidence: 0.6
  }
}

/**
 * Check if strategy paralysis traces to psychology (fear/burnout)
 *
 * Signals:
 * - Mentions "exhausted", "burned out", "can't think clearly", "afraid", "scared"
 * - Overthinking/analysis paralysis language
 * - High emotional charge but low capacity
 */
function checkStrategyToPsychology(
  inference: StateInference,
  signals: ConversationSignals
): CrossMapResult {

  const hasPsychologyMarkers =
    signals.emotional_markers.length > 2 ||
    signals.overwhelm_detected ||
    signals.capacity_signals.length > 0

  const hasParalysisPattern =
    /paralyzed|can't decide|overthinking|analysis paralysis|stuck in my head|afraid|scared|fear/i.test(
      inference.constraint_hypothesis.evidence.join(' ')
    )

  if (hasPsychologyMarkers && hasParalysisPattern) {
    return {
      should_redirect: true,
      upstream_category: 'psychology',
      reasoning: 'Strategy paralysis often comes from fear or burnout - when blocked internally, everything feels unclear. Need to address psychology first.',
      confidence: 0.75
    }
  }

  return {
    should_redirect: false,
    upstream_category: null,
    reasoning: 'Strategy issues appear to be genuine positioning/messaging problems',
    confidence: 0.6
  }
}

/**
 * Check if psychology blocks trace to broken execution systems
 *
 * Signals:
 * - Mentions "too much on my plate", "working all the time", "no time"
 * - Capacity signals present
 * - Burnout from DOING too much, not from emotional disconnect or fear
 */
function checkPsychologyToExecution(
  inference: StateInference,
  signals: ConversationSignals
): CrossMapResult {

  const hasCapacityOverload = signals.capacity_signals.length > 1

  const hasSystemsPattern =
    /doing everything myself|no time|too much on my plate|working all the time|can't keep up/i.test(
      inference.constraint_hypothesis.evidence.join(' ')
    )

  const subDimension = inference.sub_dimension.dimension
  const suggestsExecutionIssue =
    subDimension === 'delegation' ||
    subDimension === 'systems' ||
    subDimension === 'capacity'

  if (hasCapacityOverload && hasSystemsPattern && suggestsExecutionIssue) {
    return {
      should_redirect: true,
      upstream_category: 'execution',
      reasoning: 'Psychology issues caused by unsustainable systems - need to fix capacity/delegation before addressing internal patterns',
      confidence: 0.7
    }
  }

  return {
    should_redirect: false,
    upstream_category: null,
    reasoning: 'Psychology issues appear to be genuine internal blocks (fear, self-doubt, burnout)',
    confidence: 0.6
  }
}

/**
 * Simple helper to check if cross-mapping should be attempted
 * Only attempt after sufficient conversation depth
 */
export function shouldAttemptCrossMapping(
  turnsInPhase: number,
  crossMapApplied: boolean
): boolean {
  return turnsInPhase >= 4 && !crossMapApplied
}
