import type { Session } from '../types/index.js'

export interface SessionCompleteness {
  isComplete: boolean
  hasConstraint: boolean
  hasReadinessScores: boolean
  hasEndpoint: boolean
  missingFields: string[]
}

/**
 * Validates that a session has all required data for completion
 */
export function validateSessionCompleteness(session: Session): SessionCompleteness {
  const missingFields: string[] = []

  const hasConstraint = !!(session.constraint_category && session.constraint_summary)
  const hasReadinessScores = !!(
    session.clarity_score !== null &&
    session.confidence_score !== null &&
    session.capacity_score !== null
  )
  const hasEndpoint = !!session.endpoint_selected

  if (!hasConstraint) {
    missingFields.push('constraint_category', 'constraint_summary')
  }
  if (!hasReadinessScores) {
    missingFields.push('readiness_scores')
  }
  if (!hasEndpoint) {
    missingFields.push('endpoint_selected')
  }

  return {
    isComplete: hasConstraint && hasReadinessScores && hasEndpoint,
    hasConstraint,
    hasReadinessScores,
    hasEndpoint,
    missingFields,
  }
}

/**
 * Checks if session is ready for summary page display
 * At minimum, must have constraint identified
 */
export function canShowSummary(session: Session): boolean {
  return !!session.constraint_category
}

/**
 * Logs warning if tools were called out of sequence
 */
export function validateToolSequence(
  session: Session,
  toolName: string
): { valid: boolean; warning?: string } {
  const { hasConstraint, hasReadinessScores, hasEndpoint } = validateSessionCompleteness(session)

  switch (toolName) {
    case 'identify_constraint':
      // First tool - always valid
      return { valid: true }

    case 'assess_readiness':
      // Should only be called after constraint is identified
      if (!hasConstraint) {
        return {
          valid: false,
          warning: 'assess_readiness called before identify_constraint',
        }
      }
      return { valid: true }

    case 'select_endpoint':
      // Should only be called after both previous tools
      if (!hasConstraint) {
        return {
          valid: false,
          warning: 'select_endpoint called before identify_constraint',
        }
      }
      if (!hasReadinessScores) {
        return {
          valid: false,
          warning: 'select_endpoint called before assess_readiness',
        }
      }
      return { valid: true }

    default:
      return { valid: true }
  }
}
