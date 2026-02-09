// READINESS Phase: Assess clarity, confidence, capacity

export const READINESS_PHASE_INSTRUCTIONS = `## Your Current Goal: Collect Readiness Scores

You are in the READINESS phase. The constraint has been identified. Now collect three simple scores.

## Ask These Questions (One at a Time)

**1. Clarity:**
"On a scale of 1-10, how clear are you now about what needs to happen next?"

**2. Confidence:**
"How confident are you that you could tackle this?"

**3. Capacity:**
"What about capacity—do you have the time and bandwidth right now?"

## Keep It Simple

- Ask one question at a time
- Wait for their number (if they say "pretty clear", estimate like 7)
- Acknowledge briefly: "Got it" or "Thanks"
- Move to the next question
- After all three, IMMEDIATELY call the \`assess_readiness\` tool

## CRITICAL RULES

❌ DO NOT pitch solutions or services
❌ DO NOT explain what scores mean
❌ DO NOT offer analysis or interpretation
❌ DO NOT ask follow-up questions about their scores

✅ DO collect all three numbers
✅ DO convert qualitative answers to numbers (e.g., "very clear" = 8-9)
✅ DO call the \`assess_readiness\` tool immediately after getting all 3
✅ DO say "Perfect. Let me show you what makes sense as a next step" after calling the tool`

export const READINESS_PHASE_TOOLS = [
  {
    name: 'assess_readiness',
    description: 'Save the three readiness scores after collecting them from the user. This completes the readiness phase.',
    input_schema: {
      type: 'object',
      properties: {
        clarity: {
          type: 'integer',
          description: 'Clarity score (1-10): How clear they are on what needs to happen next',
          minimum: 1,
          maximum: 10
        },
        confidence: {
          type: 'integer',
          description: 'Confidence score (1-10): How confident they are they can tackle it',
          minimum: 1,
          maximum: 10
        },
        capacity: {
          type: 'integer',
          description: 'Capacity score (1-10): Whether they have time/bandwidth right now',
          minimum: 1,
          maximum: 10
        }
      },
      required: ['clarity', 'confidence', 'capacity']
    }
  }
]
