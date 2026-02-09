// Modular prompt builder - Strategy Pattern

import { CORE_IDENTITY } from './core.ts'
import { CONTEXT_PHASE_INSTRUCTIONS, CONTEXT_PHASE_TOOLS } from './context-phase.ts'
import { EXPLORATION_PHASE_INSTRUCTIONS, EXPLORATION_PHASE_TOOLS } from './exploration-phase.ts'
import { DIAGNOSIS_PHASE_INSTRUCTIONS, DIAGNOSIS_PHASE_TOOLS } from './diagnosis-phase.ts'
import { READINESS_PHASE_INSTRUCTIONS, READINESS_PHASE_TOOLS } from './readiness-phase.ts'
import { ROUTING_PHASE_INSTRUCTIONS, ROUTING_PHASE_TOOLS } from './routing-phase.ts'

type Phase = 'context' | 'exploration' | 'diagnosis' | 'readiness' | 'routing' | 'complete'

interface Session {
  user_name: string
  current_phase: Phase
  total_turns: number
  business_type?: string
  business_stage?: string
  surface_challenge?: string
  constraint_category?: string
  constraint_summary?: string
  clarity_score?: number
  confidence_score?: number
  capacity_score?: number
}

/**
 * Get phase-specific instructions
 */
function getPhaseInstructions(phase: Phase, session?: Session): string {
  switch (phase) {
    case 'context':
      return CONTEXT_PHASE_INSTRUCTIONS
    case 'exploration':
      return EXPLORATION_PHASE_INSTRUCTIONS
    case 'diagnosis':
      return DIAGNOSIS_PHASE_INSTRUCTIONS
    case 'readiness':
      return READINESS_PHASE_INSTRUCTIONS
    case 'routing':
      return ROUTING_PHASE_INSTRUCTIONS
    case 'complete':
      const category = session?.constraint_category || 'strategy'
      const summary = session?.constraint_summary || 'your constraint'
      return `CRITICAL: The constraint has been identified. You MUST now generate text content (your final closing message to the user).

**The identified constraint:**
- Category: ${category.toUpperCase()}
- Summary: ${summary}

Generate a complete closing message with these three parts:

1. **Name the constraint:** "Based on everything you've shared, your core constraint is ${category}—${summary}"

2. **Acknowledge the discovery:** Reflect on what makes this the real blocker (1 sentence).

3. **Bridge to assessment:** "I'm going to have you do a quick check-in on where you are with this—it'll help us figure out the best way forward. Takes about 60 seconds."

REQUIREMENTS:
- You MUST generate text content (this is NOT optional)
- NO tools available
- NO questions
- This is your FINAL message before the user continues to assessment

Write the complete closing message now.`
    default:
      throw new Error(`Unknown phase: ${phase}`)
  }
}

/**
 * Get phase-specific tools
 * This is the KEY to preventing hallucinated tool calls
 */
export function getPhaseTools(phase: Phase): any[] {
  switch (phase) {
    case 'context':
      return CONTEXT_PHASE_TOOLS
    case 'exploration':
      return EXPLORATION_PHASE_TOOLS
    case 'diagnosis':
      return DIAGNOSIS_PHASE_TOOLS
    case 'readiness':
      return READINESS_PHASE_TOOLS
    case 'routing':
      return ROUTING_PHASE_TOOLS
    case 'complete':
      return [] // No tools available - conversation is complete
    default:
      return []
  }
}

/**
 * Build context data from session
 * Injects structured DB data as FACTS, not suggestions
 */
function buildContextData(session: Session): string {
  const parts = [
    `## Session Context`,
    `- User Name: ${session.user_name}`,
    `- Current Phase: ${session.current_phase.toUpperCase()}`,
    `- Turn Number: ${session.total_turns}`,
  ]

  // Business context (if available)
  if (session.business_type) {
    parts.push(`- Business Type: ${session.business_type}`)
  }
  if (session.business_stage) {
    parts.push(`- Business Stage: ${session.business_stage}`)
  }
  if (session.surface_challenge) {
    parts.push(`- Surface Challenge: ${session.surface_challenge}`)
  }

  // Hypothesis (if formed during exploration)
  if (session.hypothesis_category) {
    parts.push(`\n## Working Hypothesis (From Exploration)`)
    parts.push(`- Category: ${session.hypothesis_category.toUpperCase()}`)
    if (session.hypothesis_reasoning) {
      parts.push(`- Reasoning: ${session.hypothesis_reasoning}`)
    }
  }

  // Constraint diagnosis (if validated)
  if (session.constraint_category) {
    parts.push(`\n## Validated Constraint`)
    parts.push(`- Category: ${session.constraint_category.toUpperCase()}`)
    if (session.constraint_summary) {
      parts.push(`- Summary: ${session.constraint_summary}`)
    }
  }

  // Readiness scores (if collected)
  if (session.clarity_score || session.confidence_score || session.capacity_score) {
    parts.push(`\n## Readiness Scores`)
    if (session.clarity_score) {
      parts.push(`- Clarity: ${session.clarity_score}/10`)
    }
    if (session.confidence_score) {
      parts.push(`- Confidence: ${session.confidence_score}/10`)
    }
    if (session.capacity_score) {
      parts.push(`- Capacity: ${session.capacity_score}/10`)
    }
  }

  return parts.join('\n')
}

/**
 * Build the complete system prompt for the current phase
 *
 * Architecture:
 * [Core Identity] + [Phase Instructions] + [Context Data]
 *
 * Only includes what's needed for THIS phase.
 * Tools are filtered separately by getPhaseTools().
 */
export function buildSystemPrompt(session: Session): string {
  const coreIdentity = CORE_IDENTITY
  const phaseInstructions = getPhaseInstructions(session.current_phase as Phase, session)
  const contextData = buildContextData(session)

  return `${coreIdentity}

${phaseInstructions}

${contextData}`
}

/**
 * Get the count of tokens saved by modular prompts
 * (For observability/cost tracking)
 */
export function getTokensSaved(phase: Phase): number {
  // Rough estimate: monolithic prompt ~1400 tokens
  // Phase-specific prompts ~300-500 tokens each
  // Savings: ~900-1100 tokens per request (63% reduction)
  const MONOLITHIC_SIZE = 1400
  const MODULAR_SIZES: Record<Phase, number> = {
    context: 300,
    exploration: 400,
    diagnosis: 500,
    readiness: 350,
    routing: 450,
    complete: 100,
  }

  return MONOLITHIC_SIZE - MODULAR_SIZES[phase]
}
