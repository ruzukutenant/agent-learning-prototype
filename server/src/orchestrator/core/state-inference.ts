// State inference - extract constraint hypothesis and readiness from conversation
// Uses Gemini Flash for speed with Sonnet fallback

import { geminiJSON, isGeminiAvailable } from './gemini-client.js'
import Anthropic from '@anthropic-ai/sdk'
import type { Message, ConversationState, StateInference } from './types.js'
import { validateStateInference } from './validation-schemas.js'
import { mapConstraintCategory } from './constraint-mapper.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const STATE_INFERENCE_SYSTEM = `Extract state from this conversation by looking at PATTERNS across all messages.

IMPORTANT: Build cumulative understanding with learner-centered lens:
- What themes keep appearing across multiple turns?
- How has their understanding evolved? (novice → developing → expert)
- What evidence accumulates across the conversation?
- Are they getting clearer or more confused over time?
- Are they building their own insights or just receiving diagnosis?
- Do they show ownership of the discovery process?
- Is the hypothesis co-created WITH them or imposed ON them?

Return ONLY valid JSON with NO other text:

{
  "constraint_hypothesis": {"category": "strategy" | "execution" | "psychology" | null, "confidence": 0.0-1.0, "evidence": ["quote from conversation"]},
  "sub_dimension": {"dimension": "offer_clarity" | "positioning" | "delegation" | "capacity" | "systems" | "internal_blocks" | null, "confidence": 0.0-1.0},
  "diagnosis_ready": {"ready": true | false, "reasons": ["reason"], "blockers": ["blocker"]},
  "validation_needed": true | false,
  "hypothesis_validated": true | false
}

Constraint categories:
- STRATEGY: unclear WHAT to do - don't know which offer, who to serve, what to say, which path to choose
- EXECUTION: need systems/help - doing everything themselves, can't delegate, no team, need operational support to scale
- PSYCHOLOGY: internal blocks - fear of judgment, imposter syndrome, self-doubt, burnout, exhaustion, permission issues, avoidance driven by emotion

CRITICAL: If someone KNOWS what to do but doesn't do it due to FEAR or SELF-DOUBT, that is PSYCHOLOGY.
EXECUTION is about needing systems/help/delegation. PSYCHOLOGY is about internal emotional blocks.

Key distinction:
- "which offer should I build?" = STRATEGY
- "I'm doing everything myself, need help" = EXECUTION
- "I know what to do but I'm afraid of being judged" = PSYCHOLOGY
- "exhausted and burned out" = PSYCHOLOGY

CRITICAL DISAMBIGUATION:

- "Can't decide WHICH offer to build" → STRATEGY (direction unclear)
- "Doing everything, need systems" → EXECUTION (operational bottleneck)
- "Know what to do but afraid to put myself out there" → PSYCHOLOGY (fear block)
- "Burned out, can't sustain" → PSYCHOLOGY (depletion)
- "Perfectionism about WHAT to build" → STRATEGY (need clarity first)
- "Perfectionism because afraid of judgment" → PSYCHOLOGY (fear-driven avoidance)
- "Won't launch because afraid of criticism" → PSYCHOLOGY (fear block)
- "Won't launch because no system to handle clients" → EXECUTION (operational)

The key questions:
1. Is the user unclear about WHAT to do? → STRATEGY
2. Do they need systems/help to do it? → EXECUTION
3. Are they blocked by fear/self-doubt/exhaustion? → PSYCHOLOGY

Evidence clues:
- "I could launch this tomorrow if I chose to" → likely STRATEGY (know HOW, unclear on WHICH)
- "I'm afraid of being judged" or "who am I to..." → PSYCHOLOGY
- "I don't know what to include" → STRATEGY
- "I'm doing everything myself, drowning in tasks" → EXECUTION
- "I'm exhausted, burned out" → PSYCHOLOGY

evidence array: Pull actual quotes from user messages that support the hypothesis. Build this across turns.

hypothesis_validated = true when user OWNS the insight:
- "Yes, exactly" or "That's it" with elaboration → validated: true
- "I see now..." with their own words → validated: true
- "The real issue is..." stating it themselves → validated: true
- They articulate the constraint in their own language → validated: true
- CRITICAL: Look for co-creation, not just agreement

hypothesis_validated = false when:
- Simple "yeah" without elaboration → validated: false
- Passive agreement without ownership → validated: false
- Still questioning or uncertain → validated: false

diagnosis_ready.ready = true when:
- hypothesis_validated is true AND
- User shows clear understanding AND
- They can articulate it in their own words AND
- No major contradictions or blockers

diagnosis_ready.ready = false when:
- Hypothesis not yet validated
- "I don't know" or hedging persists
- Still vague or exploring
- Contradictions present

Example co-created validation: "Yes. Exactly. The constraint isn't that I don't know HOW to build the offer, it's that I don't know WHICH offer to build because I'm unclear on my positioning." → hypothesis_validated: true, diagnosis_ready.ready: true

Return ONLY JSON.`

export async function inferStateFromConversation(
  history: Message[],
  currentState: ConversationState
): Promise<StateInference> {
  const conversationSummary = buildConversationSummary(history)

  try {
    let parsed: any

    // Try Gemini Flash first (faster)
    if (isGeminiAvailable()) {
      try {
        parsed = await geminiJSON<any>(conversationSummary, {
          systemPrompt: STATE_INFERENCE_SYSTEM,
          maxTokens: 800
        })
      } catch (geminiError) {
        console.warn('[State Inference] Gemini failed, falling back to Sonnet:', geminiError)
        // Fall through to Sonnet
        const analysis = await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 800,
          system: STATE_INFERENCE_SYSTEM,
          messages: [{ role: 'user', content: conversationSummary }]
        })
        let text = analysis.content[0].type === 'text' ? analysis.content[0].text : '{}'
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        parsed = JSON.parse(text)
      }
    } else {
      // Sonnet fallback
      const analysis = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 800,
        system: STATE_INFERENCE_SYSTEM,
        messages: [{ role: 'user', content: conversationSummary }]
      })
      let text = analysis.content[0].type === 'text' ? analysis.content[0].text : '{}'
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(text)
    }

    // Map constraint category using LLM if free text was returned
    if (parsed.constraint_hypothesis?.category) {
      const mapped = await mapConstraintCategory(parsed.constraint_hypothesis.category)
      parsed.constraint_hypothesis.category = mapped
      console.log('[State Inference] Constraint category mapped:', mapped)
    }

    // Validate structure with Zod
    const validated = validateStateInference(parsed)

    return validated
  } catch (error) {
    console.error('[State Inference] Failed to parse:', error)

    // Return validated default state (uses Zod fallback)
    return validateStateInference({})
  }
}

function buildConversationSummary(history: Message[]): string {
  const recentMessages = history.slice(-10) // Last 10 messages for context

  const summary = recentMessages.map(m => {
    const prefix = m.role === 'user' ? 'USER' : 'ADVISOR'
    return `${prefix}: ${m.content}`
  }).join('\n\n')

  return `Analyze this conversation:

${summary}

Extract the state as JSON.`
}
