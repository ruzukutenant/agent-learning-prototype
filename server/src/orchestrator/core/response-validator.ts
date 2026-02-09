// Response validator - positive structure validation
// Validates that responses match expected structure for each action type
// No more forbidden patterns - just checking what SHOULD be present

import type { OrchestratorDecision } from './types.js'
import { ACTION_REQUIREMENTS } from '../config/response-config.js'

/**
 * Validation result for a response
 */
export interface ValidationResult {
  valid: boolean
  violations: string[]
  warnings: string[]
}

/**
 * Count sentences in a response (approximate)
 */
function countSentences(text: string): number {
  // Split on sentence-ending punctuation, filter empty
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  return sentences.length
}

/**
 * Check if response ends with a question
 */
function endsWithQuestion(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.endsWith('?')
}

/**
 * Check if response contains goodbye language that shouldn't appear in mid-closing turns
 */
function containsGoodbyeLanguage(text: string): boolean {
  const goodbyePatterns = [
    /good luck/i,
    /take care/i,
    /best of luck/i,
    /you've got this/i,
    /you got this/i,
    /i hope you find/i,
    /best wishes/i,
    /all the best/i,
    /farewell/i,
  ]
  return goodbyePatterns.some(pattern => pattern.test(text))
}

/**
 * Actions that should not contain goodbye language
 * Goodbye language should ONLY appear in the final turn (complete_with_handoff or closing_facilitate)
 */
const NO_GOODBYE_ACTIONS = [
  'closing_reflect_implication',
  'closing_reflect_stakes',
  'closing_name_capability_gap',
  'closing_assert_and_align',
  'closing_offer_solution',   // Turn D2 - still not the final turn
  'reflect_insight',  // Can happen during closing sequence - shouldn't have goodbye language
  'explore',
  'deepen',
  'validate',
  'diagnose',
  'check_blockers',
  'stress_test',
  'request_diagnosis_consent',
  'explore_readiness',
  'contain',
  'cross_map',
  'build_criteria',
  'pre_commitment_check'
]

/**
 * Check if response contains CTA language that should only appear in closing
 */
function containsCTALanguage(text: string): boolean {
  const ctaPatterns = [
    /book a call/i,
    /book a time/i,
    /book a session/i,
    /schedule a call/i,
    /schedule a time/i,
    /schedule a session/i,
    /book your call/i,
    /clarity call/i,
    /click below/i,
    /click here/i,
    /click the button/i,
    /\[book/i,
    /→\]/i,
    /calendly/i,
    /see your summary/i,
    /i've put together a summary/i,
    /i'd love to explore working together/i,
    /work with me/i,
    /my coaching program/i,
    /my program/i,
    /i'm sending/i,
    /i'll send/i,
    /sending.*to your email/i,
    /send.*to your email/i,
  ]
  return ctaPatterns.some(pattern => pattern.test(text))
}

/**
 * Check if response contains language where Mira claims to be the solution
 * Mira is the diagnostic tool - she identifies constraints, she doesn't coach through them
 */
function containsSelfAsCoachLanguage(text: string): boolean {
  const selfCoachPatterns = [
    /that's (exactly )?what i help (people )?(work through|with)/i,
    /that's what i do/i,
    /i can help you (work through|with)/i,
    /i help people (work through|with)/i,
    /i specialize in/i,
    /i work with people/i,
    /someone (from |on )?(our|the) team/i,
    /our (team|staff|specialists?|experts?|people)/i,
    /what working together/i,
  ]
  return selfCoachPatterns.some(pattern => pattern.test(text))
}

/**
 * Check if response contains facilitation/summary content that belongs in Turn E
 * This enforces turn boundaries - Turns A-D should NOT contain Turn E content
 */
function containsFacilitationContent(text: string): boolean {
  const facilitationPatterns = [
    /your (breakthrough )?summary is ready/i,
    /i've captured everything/i,
    /i've put together/i,
    /you'll see (that|your|the) (summary|next)/i,
    /click below/i,
    /click the button/i,
    /book a call/i,
    /schedule a call/i,
    /take the next step/i,
    /see your personalized/i,
  ]
  return facilitationPatterns.some(pattern => pattern.test(text))
}

/**
 * Check if response contains bracketed placeholder text
 * The LLM sometimes generates [placeholder instructions] that should never appear
 * These are meant to be UI components, not text output
 */
function containsBracketedPlaceholder(text: string): boolean {
  const placeholderPatterns = [
    /\[.*summary.*\]/i,
    /\[.*click.*\]/i,
    /\[.*book.*\]/i,
    /\[.*next steps.*\]/i,
    /\[.*button.*\]/i,
    /\[.*CTA.*\]/i,
    /\[.*call to action.*\]/i,
    /\[Your personalized/i,
    /\[See your/i,
    /\[View your/i,
  ]
  return placeholderPatterns.some(pattern => pattern.test(text))
}

/**
 * Closing turns A-D2 that should NOT contain facilitation content
 * Turn E (closing_facilitate) is the ONLY turn that should mention summaries/booking
 */
const CLOSING_TURNS_BEFORE_FACILITATION = [
  'closing_reflect_implication',
  'closing_reflect_stakes',
  'closing_name_capability_gap',
  'closing_assert_and_align',
  'closing_offer_solution'   // Turn D2 - offer solution but don't facilitate yet
]

/**
 * Get the letter designation for a closing turn (for error messages)
 */
function getClosingTurnLetter(action: string): string {
  switch (action) {
    case 'closing_reflect_implication': return 'A'
    case 'closing_reflect_stakes': return 'B'
    case 'closing_name_capability_gap': return 'C'
    case 'closing_assert_and_align': return 'D'
    case 'closing_offer_solution': return 'D2'
    case 'closing_facilitate': return 'E'
    default: return '?'
  }
}

/**
 * Actions that should NEVER contain CTA language (everything except final closing)
 */
const NO_CTA_ACTIONS = [
  'explore',
  'deepen',
  'reflect_insight',
  'surface_contradiction',
  'validate',
  'diagnose',
  'check_blockers',
  'stress_test',
  'build_criteria',
  'pre_commitment_check',
  'request_diagnosis_consent',
  'explore_readiness',
  'contain',
  'cross_map',
  'closing_reflect_implication',
  'closing_reflect_stakes',
  'closing_name_capability_gap',
  'closing_assert_and_align',
  'closing_offer_solution'  // Turn D2 - offers solution but doesn't contain CTA yet
]

/**
 * Validate response structure against action requirements
 * This is positive validation - checking what SHOULD be present
 */
export function validateResponse(
  response: string,
  decision: OrchestratorDecision
): ValidationResult {
  const violations: string[] = []
  const warnings: string[] = []
  const action = decision.action

  // Get requirements for this action
  const requirements = ACTION_REQUIREMENTS[action]

  // If no requirements defined, response is valid
  if (!requirements) {
    return { valid: true, violations, warnings }
  }

  // Check: Must end with question
  if (requirements.must_end_with_question && !endsWithQuestion(response)) {
    violations.push(`Response must end with a question for ${action} action`)
  }

  // Check: No goodbye language in mid-closing sequence turns
  if (NO_GOODBYE_ACTIONS.includes(action) && containsGoodbyeLanguage(response)) {
    violations.push(`Response contains goodbye language ("good luck", "take care", etc.) but this is not the final turn - there are more turns in the closing sequence`)
  }

  // Check: No CTA language in non-closing actions
  if (NO_CTA_ACTIONS.includes(action) && containsCTALanguage(response)) {
    violations.push(`Response contains CTA language ("book a call", "click below", etc.) but this action is not the final closing turn - CTA language should only appear in complete_with_handoff or closing_facilitate`)
  }

  // Check: Mira should never claim to be the coach/solution during non-closing actions
  // During closing sequence (Turn D, D2, E), referencing "our team" etc. is appropriate
  if (NO_CTA_ACTIONS.includes(action) && containsSelfAsCoachLanguage(response)) {
    violations.push(`Response contains selling/offering language ("someone on our team", "someone who specializes", etc.) but this is not a closing turn - Mira should only diagnose, the system handles next steps`)
  }

  // Check: Closing turns A-D should NOT contain Turn E facilitation content
  // This enforces strict turn boundaries in the closing sequence
  if (CLOSING_TURNS_BEFORE_FACILITATION.includes(action) && containsFacilitationContent(response)) {
    violations.push(`Response contains facilitation/summary content ("summary is ready", "click below", etc.) but this is Turn ${getClosingTurnLetter(action)}, not Turn E - facilitation content should only appear in closing_facilitate`)
  }

  // Check: No bracketed placeholder text in ANY response
  // The LLM should never output [placeholder instructions] - those should be UI components
  if (containsBracketedPlaceholder(response)) {
    violations.push(`Response contains bracketed placeholder text like "[Your summary...]" or "[Click below...]" - the UI handles these components automatically, never include placeholder text in brackets`)
  }

  // Check: Max sentences
  if (requirements.max_sentences) {
    const sentenceCount = countSentences(response)

    // For closing specifically, enforce length as a hard violation
    if (action === 'complete_with_handoff') {
      const closingMaxSentences = 15  // Hard limit for closing
      if (sentenceCount > closingMaxSentences) {
        violations.push(`Closing response too long (${sentenceCount} sentences, max ${closingMaxSentences})`)
      }
    } else if (sentenceCount > requirements.max_sentences + 2) {
      // For other actions, only warn if significantly over
      warnings.push(`Response is ${sentenceCount} sentences (recommended: ${requirements.max_sentences})`)
    }
  }

  // Log violations if any
  if (violations.length > 0) {
    console.warn(`[ResponseValidator] Validation failed for action "${action}":`)
    violations.forEach(v => console.warn(`  - ${v}`))
    console.warn(`  Response preview: "${response.substring(0, 100)}..."`)
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings
  }
}

/**
 * Build a correction prompt when validation fails
 * Focuses on what the response SHOULD contain
 */
export function buildCorrectionPrompt(
  violations: string[],
  action: string
): string {
  const requirements = ACTION_REQUIREMENTS[action]

  const parts: string[] = [
    `Your previous response didn't match the expected structure for ${action}.`,
    '',
    'Issues:',
    ...violations.map(v => `- ${v}`),
    '',
    'Please regenerate your response:',
  ]

  // Add positive guidance based on requirements
  if (requirements?.must_end_with_question) {
    parts.push('- Your response MUST end with a question mark (?)')
  }

  if (requirements?.max_sentences) {
    parts.push(`- Keep your response to ${requirements.max_sentences} sentences or fewer`)
  }

  if (requirements?.purpose) {
    parts.push(`- Remember: ${requirements.purpose}`)
  }

  return parts.join('\n')
}
