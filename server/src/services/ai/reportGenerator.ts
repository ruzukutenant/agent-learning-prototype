import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '../../config/supabase.js'
import type { Message } from '../../types/index.js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface ReportSections {
  opportunityStatement: string
  situationOverview: string
  keyInsights: string[]
  primaryConstraint: string
  readinessAssessment: string
  recommendedNextSteps: string[]
}

interface ReadinessScores {
  clarity: number | null
  confidence: number | null
  capacity: number | null
}

export async function generateAssessmentReport(
  sessionId: string,
  scores?: ReadinessScores
): Promise<ReportSections> {
  // Fetch conversation messages
  const { data: messages, error } = await supabase
    .from('advisor_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('turn_number', { ascending: true })

  if (error || !messages) {
    throw new Error('Failed to fetch conversation messages')
  }

  // Format conversation for AI
  const conversationText = messages
    .map((msg: Message) => `${msg.speaker.toUpperCase()}: ${msg.message_text}`)
    .join('\n\n')

  // Generate report using Claude Haiku
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: `You are a warm, supportive business advisor writing a personal assessment report directly to the coach you just spoke with.

Write the report in SECOND PERSON (you, your, you're) as if speaking directly to them. The tone should be:
- Warm and friendly (like a trusted mentor)
- Conversational and natural (not stiff or formal)
- Supportive and encouraging (celebrate their insights and readiness)
- Direct and honest (but always kind)

Format your response as JSON with these sections:

{
  "opportunityStatement": "A single compelling sentence (15-25 words) that captures the POSITIVE opportunity ahead of them. This should be inspiring and forward-looking—what's possible for them, not what's wrong. Write it as a direct statement to them. Examples: 'You have the clarity and talent to build a thriving teaching business—the only missing piece is freeing yourself from the operational grind.' or 'Your vision is clear, your confidence is real, and with the right support, there's nothing stopping you from making this work.'",
  "situationOverview": "2-4 SHORT paragraphs (1-2 sentences each, separated by \\n\\n) speaking directly to them about their business and situation. Use 'you' and 'your'. Break up long text into digestible chunks.",
  "keyInsights": ["3-5 bullet points written as 'You...' statements about what you noticed in your conversation"],
  "primaryConstraint": "2-3 SHORT paragraphs (1-2 sentences each, separated by \\n\\n) about what's holding them back. Be specific and compassionate. Break up long text.",
  "readinessAssessment": "A structured assessment with emoji indicators. Format as: '✓ Clarity: [1-2 sentences about their clarity]\\n\\n✓ Confidence: [1-2 sentences about their confidence]\\n\\n⚠️ Capacity: [1-2 sentences about their capacity - use ✓ if strong, ⚠️ if it's the issue]\\n\\n[1-2 sentence summary of what this means for them]'. See READINESS SCORES below.",
  "recommendedNextSteps": ["2-3 specific next steps written as direct suggestions: 'Focus on...', 'Start by...', 'Consider...'"]
}

${scores && (scores.clarity !== null || scores.confidence !== null || scores.capacity !== null) ? `
READINESS SCORES (use these to inform the readinessAssessment section):
${scores.clarity !== null ? `- Clarity: ${scores.clarity}/10 (how clear they are on their direction and who they serve)` : ''}
${scores.confidence !== null ? `- Confidence: ${scores.confidence}/10 (their belief in their ability to deliver results)` : ''}
${scores.capacity !== null ? `- Capacity: ${scores.capacity}/10 (their bandwidth and resources to take action)` : ''}

For the readinessAssessment, translate these scores into helpful narrative:
- High scores (8-10): Acknowledge as strengths ("You're really clear on..." or "Your confidence is solid...")
- Medium scores (5-7): Note as areas with potential ("You have a good foundation in..." or "Your capacity is manageable...")
- Low scores (1-4): Frame as the key opportunity ("The main thing holding you back is..." or "Building more capacity will be crucial...")

Focus especially on the LOWEST score as it often reveals what's blocking progress. Don't just list the scores—interpret what they mean for this person's specific situation.
` : ''}

CRITICAL FORMATTING RULES:
- Break long text into SHORT paragraphs (1-2 sentences each) separated by \\n\\n
- Never write a paragraph longer than 3 sentences
- The readinessAssessment MUST use the emoji format (✓ or ⚠️ prefix for each dimension)

Examples of tone:
❌ "The entrepreneur demonstrates strong clarity..." (too formal, third person)
✅ "You have really strong clarity about..." (warm, direct, second person)

❌ "Key constraint identified: unclear positioning" (stiff, clinical)
✅ "What's holding you back right now is that your positioning isn't quite clear yet..." (conversational, supportive)

❌ Long wall of text without breaks
✅ "You've built something real over 25 years.\n\nSix weeks ago, you made a bold move to a new space. But right now, you're trapped—the store still demands everything from you."

❌ "Clarity: 9/10, Confidence: 9/10, Capacity: 6/10" (just restating scores)
✅ "✓ Clarity: You know exactly what you want to build and who you serve—that's a real strength.\n\n✓ Confidence: Your belief in your ability to deliver is solid. You've proven you can fill classes.\n\n⚠️ Capacity: This is where you're stuck. You're stretched thin, working 70 hours a week.\n\nThe good news? Outside support can solve exactly this."

Use specific details from the conversation. Keep it concise but personal.

CONVERSATION:
${conversationText}

Return only valid JSON, no other text.`,
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response format from AI')
  }

  try {
    // Strip markdown code block delimiters if present
    let jsonText = content.text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7)
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3)
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3)
    }
    jsonText = jsonText.trim()

    const report = JSON.parse(jsonText) as ReportSections
    return report
  } catch (err) {
    console.error('Failed to parse AI response:', content.text)
    throw new Error('Failed to parse report from AI')
  }
}
