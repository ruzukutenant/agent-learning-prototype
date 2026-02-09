// Prompt builder - dynamic composition from modules

import type { ConversationState, OrchestratorDecision } from './types.js'

/**
 * Build system prompt dynamically based on orchestrator decision
 *
 * Architecture:
 * [Base Identity] + [Overlays based on decision] + [Context from state]
 */
export function buildSystemPrompt(
  state: ConversationState,
  decision: OrchestratorDecision,
  baseIdentity: string,
  overlays: Map<string, string>
): string {

  const sections: string[] = []

  // 1. Base identity (always included)
  sections.push(baseIdentity)

  // 2. Add overlays based on decision
  for (const overlayName of decision.prompt_overlays) {
    const overlay = overlays.get(overlayName)
    if (overlay) {
      sections.push(overlay)
    }
  }

  // 3. Add context from state
  sections.push(buildContextSection(state))

  // 4. Add decision-specific guidance
  sections.push(buildDecisionGuidance(decision))

  return sections.join('\n\n---\n\n')
}

/**
 * Build context section from conversation state
 */
function buildContextSection(state: ConversationState): string {
  const parts: string[] = ['## Current Context']

  // Phase
  parts.push(`Phase: ${state.phase.toUpperCase()}`)
  parts.push(`Turn: ${state.turns_total} (${state.turns_in_phase} in current phase)`)

  // Hypothesis (if formed)
  if (state.constraint_hypothesis) {
    parts.push(`\nWorking Hypothesis: ${state.constraint_hypothesis.toUpperCase()}`)
    if (state.sub_dimension) {
      parts.push(`Sub-dimension: ${state.sub_dimension}`)
    }
  }

  // Readiness levels
  parts.push(`\nReadiness:`)
  parts.push(`- Clarity: ${state.readiness.clarity}`)
  parts.push(`- Confidence: ${state.readiness.confidence}`)
  parts.push(`- Capacity: ${state.readiness.capacity}`)

  // Emotional state
  if (state.emotional_charge !== 'neutral') {
    parts.push(`\nEmotional Charge: ${state.emotional_charge.toUpperCase()}`)
  }
  if (state.overwhelm_detected) {
    parts.push(`⚠️ Overwhelm detected`)
  }

  // Complexity
  if (state.complexity_level !== 'simple') {
    parts.push(`\nComplexity: ${state.complexity_level}`)
  }

  return parts.join('\n')
}

/**
 * Build decision-specific guidance
 */
function buildDecisionGuidance(decision: OrchestratorDecision): string {
  const parts: string[] = ['## Orchestrator Decision']

  parts.push(`Action: ${decision.action.toUpperCase()}`)
  parts.push(`Reasoning: ${decision.reasoning}`)

  // Add action-specific instructions
  switch (decision.action) {
    case 'contain':
      parts.push(`\nGuidance: Pause exploration. Validate their feelings. Simplify focus to ONE thing.`)
      break

    case 'validate':
      parts.push(`\nGuidance: Present the hypothesis clearly and ask if it resonates. Don't force it.`)
      if (decision.hypothesis_to_validate) {
        parts.push(`Hypothesis to validate: ${decision.hypothesis_to_validate}`)
      }
      break

    case 'diagnose':
      parts.push(`\nGuidance: The orchestrator will generate the closing message. Just acknowledge their last response naturally.`)
      break

    case 'cross_map':
      parts.push(`\nGuidance: Gently redirect focus to the upstream constraint.`)
      if (decision.redirect_to) {
        parts.push(`Redirect to: ${decision.redirect_to}`)
      }
      break

    case 'deepen':
      parts.push(`\nGuidance: Ask for more specificity or examples.`)
      if (decision.focus_area) {
        parts.push(`Focus area: ${decision.focus_area}`)
      }
      break

    case 'explore':
      parts.push(`\nGuidance: Continue natural exploration. Follow their lead.`)
      break
  }

  return parts.join('\n')
}

/**
 * Load all prompt overlays
 * In practice these would be loaded from files
 */
export function loadPromptOverlays(): Map<string, string> {
  const overlays = new Map<string, string>()

  overlays.set('containment', `## CONTAINMENT MODE ACTIVE

⚠️ The user is experiencing emotional overwhelm.

Your immediate priority:
1. Acknowledge what they're feeling ("I hear you. That's a lot.")
2. Don't add more questions or exploration
3. Simplify focus to ONE thing: "What feels like the biggest issue right now?"
4. Create space, not pressure

DO NOT:
- Push for more information
- Introduce new frameworks or concepts
- Ask multiple questions
- Challenge or reframe yet

Stay with them. Contain before you challenge.`)

  overlays.set('validation', `## VALIDATION MODE

A hypothesis has formed but needs user confirmation.

Your task:
1. State the hypothesis clearly in simple language
2. Ask if it resonates: "Does that land for you?"
3. Be ready to course-correct if they disagree
4. Don't force the hypothesis - hold it lightly

Example:
"I'm hearing that [CONSTRAINT] might be the core issue here—specifically around [EVIDENCE]. Does that resonate?"`)

  overlays.set('cross_map', `## CROSS-MAPPING REDIRECT

Surface symptoms often trace to upstream root causes.

Your task:
1. Acknowledge what they've shared
2. Gently suggest the deeper issue
3. Ask a question that explores the upstream constraint

Example:
"You mentioned [SURFACE SYMPTOM], but I wonder if the real issue is [UPSTREAM CONSTRAINT]. When you think about [SPECIFIC QUESTION], what comes up?"`)

  overlays.set('depth_inquiry', `## DEPTH INQUIRY MODE

The hypothesis is forming but lacks specificity.

Your task:
1. Ask for concrete examples
2. Get them to describe what it LOOKS like day-to-day
3. Listen for sub-dimensions (positioning, capacity, systems, etc.)

Avoid:
- Generic questions
- Multiple questions at once
- Introducing new concepts`)

  overlays.set('exploration', `## EXPLORATION MODE

Continue natural discovery conversation.

Your approach:
1. Follow their lead
2. Ask one specific question at a time
3. Listen for patterns (scattered tactics, overwhelm, unclear positioning)
4. Stay curious, not diagnostic yet

You're gathering context, not diagnosing yet.`)

  overlays.set('hypothesis_forming', `## HYPOTHESIS FORMING

Patterns are emerging—stay alert.

What you're noticing:
- Specific language patterns
- Repeated themes
- Emotional charge around certain topics

Continue exploration but track:
- STRATEGY signals: "not clear who I serve", "messaging unclear", "positioning"
- EXECUTION signals: "no time", "doing everything", "systems breaking"
- ENERGY signals: "burned out", "exhausted", "disconnected"`)

  return overlays
}
