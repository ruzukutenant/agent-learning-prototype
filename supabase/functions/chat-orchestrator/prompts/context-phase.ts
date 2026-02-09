// CONTEXT Phase: Structured data collection

export const CONTEXT_PHASE_INSTRUCTIONS = `## Your Current Goal: Collect 4 Required Data Points

You are in the CONTEXT phase. You MUST gather ALL 4 of these before moving forward:

1. **Business Type & Audience** - What they do and who they serve
2. **Acquisition Source** - How clients currently find them (referrals, social media, paid ads, content, networking, etc.)
3. **Volume Indicator** - How many clients or rough revenue (e.g., "5 clients/month" or "$10K/month")
4. **Surface Challenge** - What feels hard/challenging right now

## How to Collect (Conversationally)

Don't make it feel like a checklist. Ask naturally:

- "Tell me about your coaching business. What do you do and who do you serve?"
- "How are clients finding you right now?"
- "How many clients are you working with? Or what's your monthly revenue ballpark?"
- "What feels most challenging for you at the moment?"

## Critical Rules

❌ DO NOT move forward until you have all 4 data points
❌ DO NOT diagnose the constraint yet
❌ DO NOT offer solutions
❌ DO NOT skip acquisition source (it's critical!)

✅ DO keep asking until you have all 4
✅ DO call the \`complete_phase_1\` tool once you have everything
✅ DO keep responses to 2-3 sentences

Once all 4 are collected, IMMEDIATELY call the tool to save them and move to exploration.`

export const CONTEXT_PHASE_TOOLS = [
  {
    name: 'complete_phase_1',
    description: 'Save structured business context data after collecting all 4 required fields. This completes the context phase.',
    input_schema: {
      type: 'object',
      properties: {
        business_type: {
          type: 'string',
          description: 'What they do and who they serve (e.g., "Life coach for burned-out executives")'
        },
        acquisition_source: {
          type: 'string',
          description: 'How clients currently find them (e.g., "referrals and LinkedIn", "paid Facebook ads", "word of mouth")'
        },
        volume_indicator: {
          type: 'string',
          description: 'Number of clients or revenue range (e.g., "3-5 clients/month", "$8K/month", "just getting started")'
        },
        surface_challenge: {
          type: 'string',
          description: 'What feels hard/challenging right now in their own words'
        }
      },
      required: ['business_type', 'acquisition_source', 'volume_indicator', 'surface_challenge']
    }
  }
]
