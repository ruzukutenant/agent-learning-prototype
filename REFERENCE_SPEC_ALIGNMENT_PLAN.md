# Reference Spec Alignment Plan
## Fixing Issues 1-6 to Match advisor-master.xml

---

## Overview

Current implementation has 6 critical gaps compared to the reference spec:
1. Missing `complete_phase_1` tool (CONTEXT)
2. Missing `assess_readiness` tool (READINESS)
3. CONTEXT phase too vague (missing acquisition source)
4. Missing `submit_hypothesis` tool (EXPLORATION)
5. Domain boundaries too loose
6. No acquisition-specific questions

**Estimated time:** 3-4 hours
**Risk level:** Medium (touching core conversation flow)
**Testing:** Required after each phase

---

## Issue 1: Add `complete_phase_1` Tool

### Problem:
CONTEXT phase doesn't collect structured data. We're missing:
- Acquisition source (critical!)
- Volume/revenue indicator
- Structured business type

### Solution:

**Step 1.1: Add database columns**
```sql
ALTER TABLE advisor_sessions
ADD COLUMN acquisition_source TEXT,
ADD COLUMN volume_indicator TEXT;

-- business_type and surface_challenge already exist
```

**Step 1.2: Update CONTEXT phase prompt**
File: `supabase/functions/chat-orchestrator/prompts/context-phase.ts`

```typescript
export const CONTEXT_PHASE_INSTRUCTIONS = `## Your Current Goal: Collect 4 Required Data Points

You are in the CONTEXT phase. You must gather ALL 4 of these before moving forward:

1. **Business Type & Audience** - What they do and who they serve
2. **Acquisition Source** - How clients currently find them (referrals, social, ads, etc.)
3. **Volume Indicator** - How many clients or rough revenue
4. **Surface Challenge** - What feels hard right now

## How to Collect

Ask these conversationally (not as a checklist):
- "Tell me about your coaching business. What do you do and who do you serve?"
- "How are clients finding you right now?"
- "How many clients are you working with? (or what's your monthly revenue ballpark?)"
- "What feels most challenging right now?"

## CRITICAL RULES

❌ DO NOT move forward until you have all 4 data points
❌ DO NOT diagnose yet
❌ DO NOT offer solutions

✅ DO call complete_phase_1 tool once you have all 4
✅ DO keep responses to 2-3 sentences

Once all 4 are collected, IMMEDIATELY call the tool.`

export const CONTEXT_PHASE_TOOLS = [
  {
    name: 'complete_phase_1',
    description: 'Save structured business context data after collecting all 4 required fields',
    input_schema: {
      type: 'object',
      properties: {
        business_type: {
          type: 'string',
          description: 'What they do and who they serve'
        },
        acquisition_source: {
          type: 'string',
          description: 'How clients currently find them (e.g., referrals, social media, paid ads)'
        },
        volume_indicator: {
          type: 'string',
          description: 'Number of clients or revenue range'
        },
        surface_challenge: {
          type: 'string',
          description: 'What feels hard/challenging right now'
        }
      },
      required: ['business_type', 'acquisition_source', 'volume_indicator', 'surface_challenge']
    }
  }
]
```

**Step 1.3: Add tool handler**
File: `supabase/functions/chat-orchestrator/conversation.ts`

Add to `handleToolCall` function:
```typescript
case 'complete_phase_1':
  await supabaseClient
    .from('advisor_sessions')
    .update({
      business_type: input.business_type,
      acquisition_source: input.acquisition_source,
      volume_indicator: input.volume_indicator,
      surface_challenge: input.surface_challenge,
      current_phase: 'exploration'
    })
    .eq('id', sessionId)

  console.log('[Tool] Phase 1 complete - moving to exploration')
  break
```

---

## Issue 2: Add `assess_readiness` Tool

### Problem:
Readiness scores extracted from text are fragile. Often don't save correctly.

### Solution:

**Step 2.1: Database columns already exist**
```sql
-- These already exist in advisor_sessions:
-- clarity_score INTEGER
-- confidence_score INTEGER
-- capacity_score INTEGER
```

**Step 2.2: Update READINESS phase prompt**
File: `supabase/functions/chat-orchestrator/prompts/readiness-phase.ts`

```typescript
export const READINESS_PHASE_TOOLS = [
  {
    name: 'assess_readiness',
    description: 'Save the three readiness scores after collecting them from the user',
    input_schema: {
      type: 'object',
      properties: {
        clarity: {
          type: 'integer',
          description: 'Clarity score (1-10): How clear they are on what needs to happen',
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
          description: 'Capacity score (1-10): Whether they have time/bandwidth now',
          minimum: 1,
          maximum: 10
        }
      },
      required: ['clarity', 'confidence', 'capacity']
    }
  }
]
```

Update instructions:
```typescript
export const READINESS_PHASE_INSTRUCTIONS = `## Your Current Goal: Collect 3 Readiness Scores

Ask for three scores (1-10):

1. **Clarity:** "How clear are you on what needs to happen next?"
2. **Confidence:** "How confident are you that you can tackle this?"
3. **Capacity:** "Do you have the time and bandwidth right now?"

## Handling Answers

- If they give a number: Great, use it
- If they say "pretty clear": Estimate (e.g., 7)
- If they say "very confident": Estimate (e.g., 8-9)

## After Collecting All 3

IMMEDIATELY call the \`assess_readiness\` tool with all three scores.

Keep your response to 1 sentence: "Perfect. Let me show you what makes sense as a next step."`
```

**Step 2.3: Add tool handler**
```typescript
case 'assess_readiness':
  await supabaseClient
    .from('advisor_sessions')
    .update({
      clarity_score: input.clarity,
      confidence_score: input.confidence,
      capacity_score: input.capacity,
      current_phase: 'routing'
    })
    .eq('id', sessionId)

  console.log('[Tool] Readiness assessed - moving to routing')
  break
```

---

## Issue 3: Tighten CONTEXT Phase

### Problem:
Too vague, missing acquisition focus

### Solution:
Already addressed in Issue 1 - the new CONTEXT phase explicitly requires acquisition source as one of the 4 mandatory fields.

**Additional:** Update greeting to set expectations
File: `supabase/functions/chat-orchestrator/conversation.ts`

```typescript
const greetingText = `Hey ${session.user_name}! I'm here to help you identify what's really holding your business back.

I'll ask you a few quick questions about your business, and we'll figure out exactly where to focus. Should take about 10 minutes.

Let's start: Tell me about your coaching or consulting business—what do you do and who do you serve?`
```

---

## Issue 4: Add `submit_hypothesis` Tool

### Problem:
No intermediate step between exploration and diagnosis. Hypothesis formation is implicit.

### Solution:

**Step 4.1: Add database column**
```sql
ALTER TABLE advisor_sessions
ADD COLUMN hypothesis_category TEXT CHECK (hypothesis_category IN ('strategy', 'execution', 'energy')),
ADD COLUMN hypothesis_reasoning TEXT;
```

**Step 4.2: Update EXPLORATION phase**
File: `supabase/functions/chat-orchestrator/prompts/exploration-phase.ts`

```typescript
export const EXPLORATION_PHASE_TOOLS = [
  {
    name: 'submit_hypothesis',
    description: 'Submit your hypothesis about which constraint category fits best (call when ~80% sure)',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['strategy', 'execution', 'energy'],
          description: 'The constraint category that best fits the signals'
        },
        reasoning: {
          type: 'string',
          description: 'Brief evidence for this category (1-2 sentences)'
        }
      },
      required: ['category', 'reasoning']
    }
  }
]
```

Update instructions:
```typescript
export const EXPLORATION_PHASE_INSTRUCTIONS = `## Your Current Goal: Form a Hypothesis

You are in the EXPLORATION phase. Listen for signals that map to one of three constraint categories:

**STRATEGY Signals:**
- Low conversion ("people don't get it")
- Pricing confusion
- Wrong audience
- Unclear positioning

**EXECUTION Signals:**
- Overwhelm, inconsistency
- "Messy" backend, dropping balls
- No systems or processes
- Reactive mode

**ENERGY Signals:**
- Burnout, exhaustion
- Resentment, low motivation
- Feast/famine stress
- Isolation

## Probing Questions

- "What's actually happening vs what you want?"
- "What have you tried to fix this?"
- "If there are multiple issues, which one is closest to revenue?"

## When to Submit Hypothesis

When you're ~80% confident which category fits, call the \`submit_hypothesis\` tool.

Do NOT validate with the user yet - that's the next phase.`
```

**Step 4.3: Add tool handler**
```typescript
case 'submit_hypothesis':
  await supabaseClient
    .from('advisor_sessions')
    .update({
      hypothesis_category: input.category,
      hypothesis_reasoning: input.reasoning,
      current_phase: 'diagnosis'
    })
    .eq('id', sessionId)

  console.log(`[Tool] Hypothesis submitted: ${input.category} - moving to diagnosis`)
  break
```

**Step 4.4: Update DIAGNOSIS phase to use hypothesis**
Update builder.ts to inject hypothesis:
```typescript
if (session.hypothesis_category) {
  parts.push(`\n## Working Hypothesis`)
  parts.push(`- Category: ${session.hypothesis_category.toUpperCase()}`)
  parts.push(`- Reasoning: ${session.hypothesis_reasoning}`)
}
```

---

## Issue 5: Strengthen Domain Boundaries

### Problem:
AI might get pulled into methodology discussions instead of business growth.

### Solution:

**Step 5.1: Update core identity**
File: `supabase/functions/chat-orchestrator/prompts/core.ts`

```typescript
export const CORE_IDENTITY = `You are CoachMira Advisor, an experienced business strategist focused on identifying growth constraints.

## Your Scope: Business Growth ONLY

You diagnose BUSINESS GROWTH constraints:
- Client acquisition (how they get clients)
- Sales conversion (how they close deals)
- Scaling operations (how they deliver)
- Systems and processes

You do NOT diagnose:
- Coaching methodology
- Client transformation issues
- Pedagogy or teaching approach
- Personal development

## Redirect Protocol

If the user discusses methodology (e.g., "My clients won't change their habits"):

1. **Acknowledge briefly:** "That sounds like a methodology challenge."
2. **Pivot immediately:** "My focus is on your business growth. Let's talk about how you're acquiring these clients in the first place."

Stay curious, patient, concise, and committed to finding their ONE highest-leverage business constraint.

## Conversation Guidelines
- Keep responses to 2-3 sentences maximum
- Use natural, conversational language with contractions
- Acknowledge what they share before asking follow-ups ("Got it," "That makes sense")
- Ask one question at a time
- Mirror their energy level

## Response Format
Respond naturally as CoachMira would speak. Do not include any metadata, phase labels, or internal notes in your response. Just the conversational message.`
```

**Step 5.2: Add boundary examples to phases**

Add to each phase prompt:
```typescript
## Domain Boundary Reminder

If user goes off-topic (methodology, client issues, personal development):
- Acknowledge: "That's a deep [methodology/personal] challenge"
- Redirect: "For this assessment, let's focus on your business growth: [relevant business question]"
```

---

## Issue 6: Add Acquisition Questions

### Problem:
Not explicitly asking about acquisition, which is critical for diagnosis.

### Solution:
Already addressed in Issue 1 - acquisition_source is now a required field in CONTEXT phase.

**Additional refinement:** Make acquisition questioning more explicit in EXPLORATION.

File: `supabase/functions/chat-orchestrator/prompts/exploration-phase.ts`

Add to investigative questions:
```typescript
## Key Probing Questions

**About Acquisition:**
- "Walk me through how a typical client finds and hires you"
- "What's working well in how people discover you?"
- "What's NOT working in your acquisition process?"

**About Operations:**
- "What is actually happening vs what you want to happen?"
- "What have you tried to fix this?"

**Revenue Focus:**
- "If you had multiple issues, which one is closest to revenue?"
```

---

## Implementation Order

### Phase 1: Database & Core (30 min)
1. Run database migration (add new columns)
2. Update core.ts with domain boundaries
3. Deploy and test boundaries

### Phase 2: CONTEXT Phase (45 min)
4. Update context-phase.ts with 4 required fields
5. Add complete_phase_1 tool definition
6. Add tool handler
7. Update greeting message
8. Deploy and test CONTEXT → EXPLORATION flow

### Phase 3: EXPLORATION Phase (30 min)
9. Add hypothesis_category columns to DB
10. Update exploration-phase.ts with submit_hypothesis tool
11. Add tool handler
12. Deploy and test EXPLORATION → DIAGNOSIS flow

### Phase 4: READINESS Phase (30 min)
13. Update readiness-phase.ts with assess_readiness tool
14. Add tool handler
15. Deploy and test READINESS → ROUTING flow

### Phase 5: Integration & Testing (45 min)
16. Update prompt builder to inject hypothesis
17. Test full flow end-to-end
18. Verify all data saves to DB correctly
19. Check summary page displays all data

**Total: ~3 hours**

---

## Database Migration Script

File: `supabase/migrations/20241230_reference_spec_alignment.sql`

```sql
-- Add missing columns for structured data collection

ALTER TABLE advisor_sessions
ADD COLUMN IF NOT EXISTS acquisition_source TEXT,
ADD COLUMN IF NOT EXISTS volume_indicator TEXT,
ADD COLUMN IF NOT EXISTS hypothesis_category TEXT CHECK (hypothesis_category IN ('strategy', 'execution', 'energy')),
ADD COLUMN IF NOT EXISTS hypothesis_reasoning TEXT;

-- Add indexes for querying
CREATE INDEX IF NOT EXISTS idx_sessions_acquisition ON advisor_sessions(acquisition_source);
CREATE INDEX IF NOT EXISTS idx_sessions_hypothesis ON advisor_sessions(hypothesis_category);

-- Add comments
COMMENT ON COLUMN advisor_sessions.acquisition_source IS 'How clients currently find them (referrals, social, ads, etc.)';
COMMENT ON COLUMN advisor_sessions.volume_indicator IS 'Number of clients or revenue range';
COMMENT ON COLUMN advisor_sessions.hypothesis_category IS 'Initial hypothesis before validation (exploration phase)';
COMMENT ON COLUMN advisor_sessions.hypothesis_reasoning IS 'Evidence supporting the hypothesis';
```

---

## Testing Checklist

### CONTEXT Phase:
- [ ] AI asks for business type
- [ ] AI asks for acquisition source (how clients find them)
- [ ] AI asks for volume/revenue
- [ ] AI asks for surface challenge
- [ ] `complete_phase_1` tool called with all 4 fields
- [ ] Data saves to database correctly
- [ ] Phase transitions to EXPLORATION

### EXPLORATION Phase:
- [ ] AI probes for constraint signals
- [ ] AI asks acquisition-specific questions
- [ ] `submit_hypothesis` tool called when ~80% sure
- [ ] Hypothesis saves to database
- [ ] Phase transitions to DIAGNOSIS

### DIAGNOSIS Phase:
- [ ] AI states hypothesis from previous phase
- [ ] AI validates with user
- [ ] `identify_constraint` tool called on confirmation
- [ ] Phase transitions to READINESS

### READINESS Phase:
- [ ] AI collects 3 scores (clarity, confidence, capacity)
- [ ] `assess_readiness` tool called with scores
- [ ] Scores save to database correctly
- [ ] Phase transitions to ROUTING

### Domain Boundaries:
- [ ] If user discusses methodology, AI redirects
- [ ] If user discusses client transformation, AI pivots to business growth
- [ ] AI stays focused on acquisition, sales, scaling, operations

### Data Integrity:
- [ ] All fields save to database during conversation
- [ ] Summary page can display all collected data
- [ ] No data lost between phases

---

## Rollback Plan

If issues arise:

**Immediate rollback:**
1. Revert to previous Edge Function deployment
2. Database columns are nullable, so old code still works

**Selective rollback:**
- Keep new columns, revert individual phase prompts
- Each issue is isolated to its own phase/tool

---

## Success Metrics

After implementation:
- ✅ 100% of sessions collect acquisition_source
- ✅ 100% of sessions save readiness scores to DB
- ✅ Clear hypothesis → validation flow
- ✅ AI stays on business growth topics
- ✅ No data loss between phases
- ✅ Summary page displays complete structured data

---

## Notes

- Issues 3 and 6 are subsumed by Issue 1 (structured CONTEXT phase)
- All tools follow Anthropic's native tool calling (not JSON mode)
- Database schema changes are backward compatible
- Each phase can be tested independently
- Migration is safe to run multiple times (uses IF NOT EXISTS)
