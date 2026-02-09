// Runtime validation schemas using Zod
// Validates external data (LLM responses) before entering the system

import { z } from 'zod'
import type { StateInference, ConstraintCategory } from './types.js'

// ============================================================================
// Enums and Primitives
// ============================================================================

export const ConstraintCategorySchema = z.enum(['strategy', 'execution', 'psychology'])
export const ReadinessLevelSchema = z.enum(['low', 'medium', 'high'])
export const ExpertiseLevelSchema = z.enum(['novice', 'developing', 'expert'])
export const CommitmentLevelSchema = z.enum(['low', 'medium', 'high'])

// ============================================================================
// StateInference Schema
// ============================================================================

export const StateInferenceSchema = z.object({
  constraint_hypothesis: z.object({
    category: ConstraintCategorySchema.nullable(),
    confidence: z.number().min(0).max(1),
    evidence: z.array(z.string())
  }),

  sub_dimension: z.object({
    dimension: z.string().nullable(),
    confidence: z.number().min(0).max(1)
  }),

  diagnosis_ready: z.object({
    ready: z.boolean(),
    reasons: z.array(z.string()),
    blockers: z.array(z.string())
  }),

  validation_needed: z.boolean(),
  hypothesis_validated: z.boolean()
})

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate StateInference from LLM with graceful fallback
 *
 * This is the primary validation entry point for state-inference.ts
 * Ensures all LLM responses conform to expected structure before database save
 *
 * @param data - Parsed JSON from LLM response
 * @returns Valid StateInference or safe default
 */
export function validateStateInference(data: unknown): StateInference {
  const result = StateInferenceSchema.safeParse(data)

  if (result.success) {
    console.log('[Validation] StateInference validated successfully')
    return result.data as StateInference
  }

  // Log validation errors for debugging
  console.error('[Validation] StateInference failed:', result.error.format())

  // Graceful fallback to safe defaults
  // This prevents crashes but signals that something went wrong
  console.warn('[Validation] Using fallback StateInference defaults')

  return {
    constraint_hypothesis: {
      category: null,
      confidence: 0,
      evidence: ['Validation failed - using defaults']
    },
    sub_dimension: {
      dimension: null,
      confidence: 0
    },
    diagnosis_ready: {
      ready: false,
      reasons: [],
      blockers: ['Validation failed - cannot diagnose until state is valid']
    },
    validation_needed: false,
    hypothesis_validated: false
  }
}

/**
 * Validate individual constraint category value
 *
 * Used by constraint-mapper.ts to ensure mapped values are valid
 *
 * @param value - String that should be a valid ConstraintCategory
 * @returns Valid ConstraintCategory or null
 */
export function validateConstraintCategory(value: unknown): ConstraintCategory | null {
  const result = ConstraintCategorySchema.safeParse(value)

  if (result.success) {
    return result.data
  }

  console.warn(`[Validation] Invalid constraint category: ${value}`)
  return null
}

/**
 * Validate readiness level value
 *
 * @param value - String that should be a valid ReadinessLevel
 * @returns Valid ReadinessLevel or 'medium' default
 */
export function validateReadinessLevel(value: unknown): 'low' | 'medium' | 'high' {
  const result = ReadinessLevelSchema.safeParse(value)

  if (result.success) {
    return result.data
  }

  console.warn(`[Validation] Invalid readiness level: ${value}, defaulting to 'medium'`)
  return 'medium'
}

/**
 * Validate expertise level value
 *
 * @param value - String that should be a valid ExpertiseLevel
 * @returns Valid ExpertiseLevel or 'novice' default
 */
export function validateExpertiseLevel(value: unknown): 'novice' | 'developing' | 'expert' {
  const result = ExpertiseLevelSchema.safeParse(value)

  if (result.success) {
    return result.data
  }

  console.warn(`[Validation] Invalid expertise level: ${value}, defaulting to 'novice'`)
  return 'novice'
}

/**
 * Validate commitment level value
 *
 * @param value - String that should be a valid CommitmentLevel
 * @returns Valid CommitmentLevel or 'low' default
 */
export function validateCommitmentLevel(value: unknown): 'low' | 'medium' | 'high' {
  const result = CommitmentLevelSchema.safeParse(value)

  if (result.success) {
    return result.data
  }

  console.warn(`[Validation] Invalid commitment level: ${value}, defaulting to 'low'`)
  return 'low'
}
