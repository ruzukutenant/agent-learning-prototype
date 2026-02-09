/**
 * Signal Session Agent - Creative Brief Generator
 *
 * Generates the final creative brief based on confirmed content from the session.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { SignalSessionState, CreativeBrief, Message } from '../core/types.js';

// Lazy-initialize Anthropic client
let _anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic();
  }
  return _anthropic;
}

/**
 * Build the prompt for brief generation
 */
function buildBriefPrompt(state: SignalSessionState): string {
  return `You are generating a creative brief based on a completed Signal Session conversation.

The user has confirmed the following through the conversation:

<confirmed_content>
<core_insight>${state.confirmed_insight || 'Not captured'}</core_insight>
<narrative_arc>
  <opening_tension>${state.arc_opening || 'Not captured'}</opening_tension>
  <progression>${state.arc_progression || 'Not captured'}</progression>
  <destination>${state.arc_destination || 'Not captured'}</destination>
</narrative_arc>
</confirmed_content>

<user_context>
<audience>${state.user_context.audience_snapshot.who}</audience>
<challenges>${state.user_context.audience_snapshot.challenges.join('; ')}</challenges>
</user_context>

Generate a creative brief with this exact JSON structure:

{
  "working_title": "A clear, resonant title (not clever for its own sake)",
  "core_insight": "The confirmed insight in one sentence",
  "narrative_arc": {
    "opening_tension": "The confirmed opening tension",
    "progression_beats": ["Key beat 1", "Key beat 2"],
    "insight_crystallization": "The moment the insight lands",
    "close": "Where the reader ends up"
  },
  "intended_reader": {
    "who": "Based on user context",
    "struggling_with": "Their core struggle",
    "current_misunderstanding": "What they might be getting wrong (optional)"
  },
  "what_this_clarifies": ["Clarity point 1", "Clarity point 2"],
  "tone_and_guardrails": {
    "qualities": ["tone quality 1", "tone quality 2", "tone quality 3"],
    "do_nots": ["thing to avoid 1", "thing to avoid 2"]
  },
  "key_language_or_metaphors": ["Only if they emerged naturally in conversation"]
}

IMPORTANT:
- Use ONLY what was confirmed in the conversation
- Do not add new ideas or embellishments
- The core insight must match what they confirmed
- The arc elements must match what they confirmed
- Infer tone from how they expressed themselves

Return ONLY valid JSON, no markdown formatting.`;
}

/**
 * Parse the LLM response into a CreativeBrief
 */
export function parseCreativeBrief(
  response: string,
  state: SignalSessionState
): CreativeBrief {
  try {
    // Handle markdown code blocks
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    return {
      working_title: parsed.working_title || 'Untitled',
      core_insight: parsed.core_insight || state.confirmed_insight || '',
      narrative_arc: {
        opening_tension: parsed.narrative_arc?.opening_tension || state.arc_opening || '',
        progression_beats: parsed.narrative_arc?.progression_beats || [],
        insight_crystallization: parsed.narrative_arc?.insight_crystallization || '',
        close: parsed.narrative_arc?.close || state.arc_destination || ''
      },
      intended_reader: {
        who: parsed.intended_reader?.who || state.user_context.audience_snapshot.who,
        struggling_with: parsed.intended_reader?.struggling_with || '',
        current_misunderstanding: parsed.intended_reader?.current_misunderstanding
      },
      what_this_clarifies: parsed.what_this_clarifies || [],
      tone_and_guardrails: {
        qualities: parsed.tone_and_guardrails?.qualities || ['clear', 'direct', 'honest'],
        do_nots: parsed.tone_and_guardrails?.do_nots || ['no hype', 'no jargon']
      },
      key_language_or_metaphors: parsed.key_language_or_metaphors,
      generated_at: new Date(),
      session_id: state.session_id,
      turns_to_complete: state.turns_total
    };
  } catch (error) {
    console.error('Failed to parse brief:', error);
    // Return a fallback brief using state data
    return createFallbackBrief(state);
  }
}

/**
 * Create a fallback brief from state data when parsing fails
 */
function createFallbackBrief(state: SignalSessionState): CreativeBrief {
  return {
    working_title: 'Your Creative Brief',
    core_insight: state.confirmed_insight || 'Insight not captured',
    narrative_arc: {
      opening_tension: state.arc_opening || 'Opening tension not captured',
      progression_beats: state.arc_progression ? [state.arc_progression] : [],
      insight_crystallization: state.confirmed_insight || '',
      close: state.arc_destination || 'Destination not captured'
    },
    intended_reader: {
      who: state.user_context.audience_snapshot.who,
      struggling_with: state.user_context.audience_snapshot.challenges[0] || 'Unknown'
    },
    what_this_clarifies: ['To be determined based on the insight'],
    tone_and_guardrails: {
      qualities: ['clear', 'direct', 'honest'],
      do_nots: ['no hype', 'no jargon']
    },
    generated_at: new Date(),
    session_id: state.session_id,
    turns_to_complete: state.turns_total
  };
}

/**
 * Generate a creative brief from the session
 */
export async function generateCreativeBrief(
  state: SignalSessionState,
  conversationHistory: Message[]
): Promise<CreativeBrief> {
  // Build the brief generation prompt
  const systemPrompt = buildBriefPrompt(state);

  // Include conversation summary for context
  const conversationSummary = conversationHistory
    .slice(-10) // Last 10 messages for context
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const userPrompt = `<recent_conversation>
${conversationSummary}
</recent_conversation>

Generate the creative brief as JSON.`;

  try {
    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0.3, // Lower temperature for structured output
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return parseCreativeBrief(content.text, state);
  } catch (error) {
    console.error('Brief generation failed:', error);
    return createFallbackBrief(state);
  }
}

/**
 * Export brief as markdown
 */
export function exportBriefAsMarkdown(brief: CreativeBrief): string {
  const lines: string[] = [
    `# ${brief.working_title}`,
    '',
    '## Core Insight',
    brief.core_insight,
    '',
    '## Narrative Arc',
    '',
    '### Opening Tension',
    brief.narrative_arc.opening_tension,
    '',
    '### Progression',
    ...brief.narrative_arc.progression_beats.map(b => `- ${b}`),
    '',
    '### Insight Crystallization',
    brief.narrative_arc.insight_crystallization,
    '',
    '### Close',
    brief.narrative_arc.close,
    '',
    '## Intended Reader',
    `**Who:** ${brief.intended_reader.who}`,
    `**Struggling with:** ${brief.intended_reader.struggling_with}`,
  ];

  if (brief.intended_reader.current_misunderstanding) {
    lines.push(`**Misunderstanding:** ${brief.intended_reader.current_misunderstanding}`);
  }

  lines.push(
    '',
    '## What This Clarifies',
    ...brief.what_this_clarifies.map(c => `- ${c}`),
    '',
    '## Tone & Guardrails',
    `**Qualities:** ${brief.tone_and_guardrails.qualities.join(', ')}`,
    `**Avoid:** ${brief.tone_and_guardrails.do_nots.join(', ')}`
  );

  if (brief.key_language_or_metaphors && brief.key_language_or_metaphors.length > 0) {
    lines.push(
      '',
      '## Key Language/Metaphors',
      ...brief.key_language_or_metaphors.map(m => `- ${m}`)
    );
  }

  lines.push(
    '',
    '---',
    `*Generated: ${brief.generated_at.toISOString()}*`,
    `*Session: ${brief.session_id}*`,
    `*Turns: ${brief.turns_to_complete}*`
  );

  return lines.join('\n');
}

/**
 * Export brief as JSON
 */
export function exportBriefAsJson(brief: CreativeBrief): string {
  return JSON.stringify(brief, null, 2);
}
