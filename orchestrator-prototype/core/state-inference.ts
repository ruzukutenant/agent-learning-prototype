// State inference - extract constraint hypothesis and readiness from conversation

import Anthropic from '@anthropic-ai/sdk'
import type { Message, ConversationState, StateInference } from './types.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function inferStateFromConversation(
  history: Message[],
  currentState: ConversationState
): Promise<StateInference> {

  const conversationSummary = buildConversationSummary(history)

  const analysis = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 800,
    system: `Extract state from this conversation. Return ONLY valid JSON with NO other text.

{
  "constraint_hypothesis": {"category": "strategy" | "execution" | "energy" | null, "confidence": 0.0-1.0, "evidence": ["quote"]},
  "sub_dimension": {"dimension": "offer_clarity" | "positioning" | "delegation" | "capacity" | "systems" | "energy_drain" | null, "confidence": 0.0-1.0},
  "diagnosis_ready": {"ready": true | false, "reasons": ["reason"], "blockers": ["blocker"]},
  "validation_needed": true | false,
  "hypothesis_validated": true | false
}

Constraint categories:
- STRATEGY: unclear WHAT to do - don't know which offer, who to serve, what to say, which path to choose
- EXECUTION: know WHAT but won't launch/sell - have offer ready, fear of visibility, overbuilding to avoid launching
- ENERGY: depleted from current work - burnout from over-giving, can't sustain pace, boundary issues, exhaustion

Key distinction:
- "which offer should I build?" = STRATEGY
- "won't launch offer I built" = EXECUTION
- "exhausted from serving clients" = ENERGY

diagnosis_ready.ready = true when user says:
- "Yes, exactly" or "That's it" → ready: true
- "When you put it that way..." → ready: true
- "I could..." or "The real issue is..." → ready: true
- Clear articulation → ready: true

diagnosis_ready.ready = false when:
- "I don't know" or hedging → ready: false
- Generic "yeah" without details → ready: false
- Still vague → ready: false

Example: If user says "Yes. Exactly. The constraint isn't that I don't know HOW..." → diagnosis_ready.ready = true

Return ONLY JSON.`,

    messages: [{ role: 'user', content: conversationSummary }]
  })

  try {
    let text = analysis.content[0].type === 'text' ? analysis.content[0].text : '{}'

    // Strip markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    const parsed = JSON.parse(text)

    return parsed as StateInference
  } catch (error) {
    console.error('[State Inference] Failed to parse:', error)

    // Retry with ultra-simple prompt
    try {
      const retry = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 500,
        system: 'Return ONLY a valid JSON object with no other text. Format: {"constraint_hypothesis": {"category": null, "confidence": 0, "evidence": []}, "sub_dimension": {"dimension": null, "confidence": 0}, "diagnosis_ready": {"ready": false, "reasons": [], "blockers": []}, "validation_needed": false, "hypothesis_validated": false}',
        messages: [{ role: 'user', content: conversationSummary }]
      })

      let retryText = retry.content[0].type === 'text' ? retry.content[0].text : '{}'
      retryText = retryText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

      return JSON.parse(retryText) as StateInference
    } catch (retryError) {
      console.error('[State Inference] Retry also failed, using defaults')
      // Return default state
      return {
        constraint_hypothesis: { category: null, confidence: 0, evidence: [] },
        sub_dimension: { dimension: null, confidence: 0 },
        diagnosis_ready: { ready: false, reasons: [], blockers: ['Analysis failed'] },
        validation_needed: false,
        hypothesis_validated: false
      }
    }
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
