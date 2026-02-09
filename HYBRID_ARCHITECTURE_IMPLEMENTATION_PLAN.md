# Hybrid Architecture Implementation Plan
**Incremental Migration to Backend-Orchestrated FSM**

---

## Overview

This plan implements the recommended hybrid approach in 3 phases, each independently valuable and reversible. We prioritize **low-risk, high-value** changes first, with each phase building on the previous one.

**Guiding Principles:**
- ✅ Ship incrementally, validate before proceeding
- ✅ Feature flags for gradual rollout
- ✅ Always maintain rollback capability
- ✅ Measure impact at each phase

---

# Phase 1: Backend Orchestration
**Timeline:** 3-5 days
**Risk Level:** Low
**Value:** High (Security + Observability)

## Objective

Move conversation orchestration from client to server while keeping all existing logic intact. This is a **refactoring**, not a rewrite.

## Architecture

```
BEFORE:
[Client] → [Express API] → [Claude API]
         ↓
    [PostgreSQL]

AFTER:
[Client] → [Supabase Edge Function] → [Claude API]
                    ↓
              [PostgreSQL]
```

The Edge Function wraps our existing conversation logic but runs server-side.

---

## Step 1.1: Set Up Supabase Edge Functions

### Create Edge Function Structure

```bash
# In project root
mkdir -p supabase/functions/chat-orchestrator
```

### File: `supabase/functions/chat-orchestrator/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for local + production
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request
    const { sessionId, message } = await req.json()

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get session
    const { data: session, error: sessionError } = await supabaseClient
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError) throw sessionError

    // Call existing conversation logic
    const result = await processConversation({
      session,
      userMessage: message,
      supabaseClient
    })

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Port existing conversation.ts logic here
async function processConversation({ session, userMessage, supabaseClient }) {
  // TODO: Move conversation.ts logic here
  // For now, this is a stub that will be filled in Step 1.2
  return { message: "Conversation processing..." }
}
```

### File: `supabase/config.toml`

```toml
[functions.chat-orchestrator]
verify_jwt = false # We'll handle auth in the function
```

---

## Step 1.2: Port Existing Conversation Logic

### Extract from `/server/src/services/ai/conversation.ts`

**Current file structure:**
```typescript
// conversation.ts exports:
export async function processMessage(sessionId, messageText) {
  // 1. Get session + messages
  // 2. Build system prompt
  // 3. Call Claude API with tools
  // 4. Handle tool calls in loop
  // 5. Save messages
  // 6. Return response
}
```

**Migration strategy:**
1. **Copy** conversation.ts logic into Edge Function
2. **Adapt** to use Supabase client instead of direct DB queries
3. **Keep** Claude API integration identical
4. **Preserve** tool calling logic exactly as-is

### File: `supabase/functions/chat-orchestrator/conversation.ts`

```typescript
import Anthropic from 'npm:@anthropic-ai/sdk@0.20.0'

export async function processConversation({
  session,
  userMessage,
  supabaseClient
}) {
  // Initialize Claude
  const anthropic = new Anthropic({
    apiKey: Deno.env.get('ANTHROPIC_API_KEY')
  })

  // Save user message
  await supabaseClient
    .from('messages')
    .insert({
      session_id: session.id,
      speaker: 'user',
      message_text: userMessage,
      phase: session.current_phase,
    })

  // Get conversation history
  const { data: messages } = await supabaseClient
    .from('messages')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true })

  // Build system prompt (existing logic)
  const systemPrompt = await buildSystemPrompt(session, supabaseClient)

  // Format messages for Claude
  const conversationHistory = messages.map(msg => ({
    role: msg.speaker === 'user' ? 'user' : 'assistant',
    content: msg.message_text
  }))

  // Add new user message
  conversationHistory.push({
    role: 'user',
    content: userMessage
  })

  // Get tools (existing logic)
  const tools = getToolsForPhase(session.current_phase)

  // Call Claude API (existing agentic loop)
  let response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 8192,
    system: systemPrompt,
    messages: conversationHistory,
    tools: tools,
  })

  // Agentic loop for tool handling
  while (response.stop_reason === 'tool_use') {
    const toolUses = response.content.filter(block => block.type === 'tool_use')
    const toolResults = []

    for (const toolUse of toolUses) {
      const result = await handleToolCall(
        session.id,
        toolUse.name,
        toolUse.input,
        supabaseClient
      )

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result)
      })
    }

    // Continue conversation
    conversationHistory.push({ role: 'assistant', content: response.content })
    conversationHistory.push({ role: 'user', content: toolResults })

    // Get updated session state
    const { data: updatedSession } = await supabaseClient
      .from('sessions')
      .select('*')
      .eq('id', session.id)
      .single()

    session = updatedSession

    // Call Claude again
    response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
      system: await buildSystemPrompt(session, supabaseClient),
      messages: conversationHistory,
      tools: getToolsForPhase(session.current_phase),
    })
  }

  // Extract final message
  const textBlock = response.content.find(block => block.type === 'text')
  const finalMessage = textBlock?.text || ''

  // Save advisor message
  const { data: advisorMessage } = await supabaseClient
    .from('messages')
    .insert({
      session_id: session.id,
      speaker: 'advisor',
      message_text: finalMessage,
      phase: session.current_phase,
    })
    .select()
    .single()

  // Get updated session
  const { data: finalSession } = await supabaseClient
    .from('sessions')
    .select('*')
    .eq('id', session.id)
    .single()

  return {
    advisorMessage,
    session: finalSession,
    toolCalls: response.content.filter(b => b.type === 'tool_use')
  }
}

// Helper functions (port from existing codebase)
async function buildSystemPrompt(session, supabaseClient) {
  // Port from server/src/services/ai/conversation.ts
  // Load system-prompt.txt and inject session data
  const promptTemplate = await Deno.readTextFile('./system-prompt.txt')

  // Inject session data
  let prompt = promptTemplate
    .replace('{{user_name}}', session.user_name)
    .replace('{{current_phase}}', session.current_phase)

  if (session.constraint_category) {
    prompt += `\n\nCurrent Constraint Category: ${session.constraint_category}`
  }

  return prompt
}

function getToolsForPhase(phase: string) {
  // Port from server/src/services/ai/tools.ts
  // For Phase 1, keep all tools available (no changes)
  return [{
    name: 'identify_constraint',
    description: 'Record the identified business constraint',
    input_schema: {
      type: 'object',
      properties: {
        constraint: { type: 'string' },
        category: { type: 'string', enum: ['strategy', 'execution', 'energy'] }
      },
      required: ['constraint', 'category']
    }
  }]
}

async function handleToolCall(sessionId, toolName, input, supabaseClient) {
  // Port from server/src/services/ai/tools.ts
  switch (toolName) {
    case 'identify_constraint':
      await supabaseClient
        .from('sessions')
        .update({
          constraint_summary: input.constraint,
          constraint_category: input.category,
          constraint_validated: true,
          current_phase: 'readiness'
        })
        .eq('id', sessionId)

      return { status: 'success', message: 'Constraint identified' }

    default:
      console.warn(`Unknown tool: ${toolName}`)
      return { status: 'error', message: 'Unknown tool' }
  }
}
```

---

## Step 1.3: Add Feature Flag

### Environment Variables

```bash
# .env (local) and Render (production)
FEATURE_USE_EDGE_FUNCTION=false  # Start disabled

# Supabase environment (edge function)
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Client-Side Routing Logic

Update `/client/src/lib/api.ts`:

```typescript
const USE_EDGE_FUNCTION = import.meta.env.VITE_USE_EDGE_FUNCTION === 'true'

export const api = {
  sendMessage: async (sessionId: string, message: string) => {
    if (USE_EDGE_FUNCTION) {
      // Call Supabase Edge Function
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/chat-orchestrator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ sessionId, message })
        }
      )

      if (!response.ok) throw new Error('Edge function failed')
      return await response.json()
    } else {
      // Call existing Express API
      return fetchAPI<SendMessageResponse>(`/sessions/${sessionId}/messages`, {
        method: 'POST',
        body: { message },
      })
    }
  },

  // ... rest of API methods unchanged
}
```

---

## Step 1.4: Deploy & Test

### Deploy Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy function
supabase functions deploy chat-orchestrator

# Test function
supabase functions invoke chat-orchestrator \
  --body '{"sessionId":"test-123","message":"Hello"}'
```

### Testing Strategy

**1. Local Testing (Before Deployment):**
```bash
# Run edge function locally
supabase start
supabase functions serve chat-orchestrator

# Test with curl
curl -X POST http://localhost:54321/functions/v1/chat-orchestrator \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"existing-session-id","message":"Test message"}'
```

**2. Staging Rollout:**
- Enable `VITE_USE_EDGE_FUNCTION=true` for internal testing only
- Test complete conversation flow (chat → assessment → summary)
- Verify tool calls work identically
- Check database state is identical to Express version

**3. Production Rollout:**
- Start with 10% of traffic (random sampling)
- Monitor error rates, latency, tool call success
- Gradually increase to 50%, then 100%
- Keep Express endpoint running for rollback

---

## Step 1.5: Observability

### Add Logging

```typescript
// In edge function
const logEvent = async (event: string, data: any) => {
  await supabaseClient
    .from('orchestrator_logs')
    .insert({
      event,
      session_id: data.sessionId,
      timestamp: new Date().toISOString(),
      details: data
    })
}

// Log key events
await logEvent('conversation_start', { sessionId, message })
await logEvent('claude_request', { model, tokenCount: messages.length })
await logEvent('tool_execution', { toolName, success: true })
await logEvent('conversation_complete', { sessionId, duration: elapsed })
```

### Create Logs Table

```sql
CREATE TABLE orchestrator_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  event TEXT NOT NULL,
  session_id UUID REFERENCES sessions(id),
  details JSONB,
  INDEX idx_logs_session (session_id),
  INDEX idx_logs_event (event)
);
```

### Monitoring Dashboard

Track these metrics:
- Request count (edge function vs. Express)
- Average latency (should be similar)
- Error rate (should be <1%)
- Tool call success rate (should be 100%)
- Token usage (should be identical)

---

## Phase 1 Success Criteria ✅

**Functional:**
- ✅ Edge function handles 100% of conversations without errors
- ✅ Tool calls work identically to Express version
- ✅ Database state identical between old and new paths
- ✅ No user-visible UX changes

**Performance:**
- ✅ Latency within 10% of current (< 3s for most turns)
- ✅ No increase in error rate
- ✅ Cost per conversation within 10% of current

**Rollback:**
- ✅ Can disable edge function with single env var change
- ✅ Express endpoint remains functional

---

# Phase 2: Modular Prompts
**Timeline:** 4-6 days
**Risk Level:** Medium
**Value:** High (Eliminates hallucinated tool calls)

## Objective

Split the monolithic system prompt into phase-specific modules, each containing only the tools and instructions relevant to that phase.

**Current Problem:**
All tools are always available, allowing the LLM to call `identify_constraint` during the `readiness` phase (phase bleeding).

**Solution:**
Dynamic prompt assembly based on current phase.

---

## Step 2.1: Audit Current System Prompt

### Analysis of `/server/data/system-prompt.txt`

**Current Structure:**
```
[Core Identity] (500 lines)
  - Persona definition
  - Conversation style
  - Core principles

[Phase 1: Context] (200 lines)
  - Goals
  - Questions to ask
  - When to transition

[Phase 2: Exploration] (300 lines)
  ...

[Phase 3: Diagnosis] (400 lines)
  ...

[Phase 4: Deprecated] (crossed out)
[Phase 5: Deprecated] (crossed out)

[Tool Definitions] (100 lines)
  - identify_constraint
  - (deprecated tools removed)
```

**Observation:**
- Phases are already somewhat separated
- But all phases visible at once = 1400+ lines every turn
- Tools section is global (should be phase-specific)

---

## Step 2.2: Create Modular Prompt Structure

### New Directory Structure

```
supabase/functions/chat-orchestrator/
  prompts/
    00-core.txt           # Always included (identity + style)
    01-context.txt        # Phase 1 instructions
    02-exploration.txt    # Phase 2 instructions
    03-diagnosis.txt      # Phase 3 instructions
    04-readiness.txt      # Phase 4 instructions (NEW - for assessment)
    tools/
      context.json        # Tools available in context phase
      exploration.json    # Tools available in exploration phase
      diagnosis.json      # Tools available in diagnosis phase
      readiness.json      # Tools available in readiness phase
```

### File: `prompts/00-core.txt`

```
You are the CoachMira Advisor, an expert in diagnosing growth constraints for coaching businesses. Your role is to conduct a strategic diagnostic interview.

## Core Principles
- Ask one powerful question at a time
- Listen deeply to what's beneath the surface
- Pattern match across three constraint categories: Strategy, Execution, Energy
- Be warm, direct, and insightful

## Conversation Style
- Use natural, conversational language
- Mirror the user's communication style
- Avoid jargon unless the user uses it first
- Be genuinely curious, not interrogative

## Current Context
User: {{user_name}}
Current Phase: {{current_phase}}
{{#if constraint_category}}
Identified Constraint: {{constraint_category}}
{{/if}}

---
```

### File: `prompts/03-diagnosis.txt`

```
# PHASE 3: DIAGNOSIS

You have identified potential constraint patterns. Now validate and refine the diagnosis.

## Your Goal
Confirm the PRIMARY growth constraint through validation questions.

## Available Data
{{#if exploration_notes}}
Exploration Notes: {{exploration_notes}}
{{/if}}

## Your Task
1. Ask 2-3 validation questions to confirm the constraint
2. Test if this constraint is truly PRIMARY (vs. downstream symptom)
3. When confident, call the `identify_constraint` tool

## Validation Rubric
Only call `identify_constraint` when:
- ✅ You've asked clarifying questions
- ✅ User has confirmed the pattern resonates
- ✅ You can articulate the constraint in 3-4 bullet points
- ✅ You're confident this is PRIMARY (not a symptom)

## Important
- Do NOT rush to diagnosis
- Do NOT call tools from other phases
- The ONLY tool you can use is `identify_constraint`
```

### File: `tools/diagnosis.json`

```json
[
  {
    "name": "identify_constraint",
    "description": "Record the validated primary growth constraint. Only call this after validation questions confirm the diagnosis.",
    "input_schema": {
      "type": "object",
      "properties": {
        "constraint": {
          "type": "string",
          "description": "The constraint articulated in 3-4 bullet points with ✅ what's working, ⚠️ the gap, 🤔 the problem, 📉 the impact"
        },
        "category": {
          "type": "string",
          "enum": ["strategy", "execution", "energy"],
          "description": "The primary constraint category"
        }
      },
      "required": ["constraint", "category"]
    }
  }
]
```

---

## Step 2.3: Dynamic Prompt Assembly

### Update `buildSystemPrompt()` Function

```typescript
async function buildSystemPrompt(session, supabaseClient) {
  const phase = session.current_phase

  // 1. Always include core
  let prompt = await Deno.readTextFile('./prompts/00-core.txt')

  // 2. Add phase-specific overlay
  const phaseMap = {
    'context': '01-context.txt',
    'exploration': '02-exploration.txt',
    'diagnosis': '03-diagnosis.txt',
    'readiness': '04-readiness.txt',
  }

  const phaseFile = phaseMap[phase] || '01-context.txt'
  const phasePrompt = await Deno.readTextFile(`./prompts/${phaseFile}`)
  prompt += '\n\n' + phasePrompt

  // 3. Inject session data (template replacement)
  prompt = prompt
    .replace(/\{\{user_name\}\}/g, session.user_name)
    .replace(/\{\{current_phase\}\}/g, session.current_phase)

  // Conditional injections
  if (session.constraint_category) {
    prompt = prompt.replace(
      '{{#if constraint_category}}',
      `Identified Constraint: ${session.constraint_category}\n`
    ).replace('{{/if}}', '')
  } else {
    // Remove conditional blocks
    prompt = prompt.replace(/\{\{#if constraint_category\}\}[\s\S]*?\{\{\/if\}\}/g, '')
  }

  return prompt
}
```

### Update `getToolsForPhase()` Function

```typescript
function getToolsForPhase(phase: string): any[] {
  const toolFiles = {
    'context': './tools/context.json',
    'exploration': './tools/exploration.json',
    'diagnosis': './tools/diagnosis.json',
    'readiness': './tools/readiness.json',
  }

  const toolFile = toolFiles[phase] || './tools/context.json'
  const tools = JSON.parse(Deno.readTextFileSync(toolFile))

  console.log(`[Phase: ${phase}] Loaded ${tools.length} tools:`, tools.map(t => t.name))

  return tools
}
```

---

## Step 2.4: Phase Transition Guard

### Server-Side Validation

Add validation to ensure tools are only called in correct phases:

```typescript
async function handleToolCall(sessionId, toolName, input, supabaseClient) {
  // Get current session to check phase
  const { data: session } = await supabaseClient
    .from('sessions')
    .select('current_phase')
    .eq('id', sessionId)
    .single()

  // Define allowed tools per phase
  const phaseTools = {
    'context': ['complete_profile'],
    'exploration': ['submit_hypothesis'],
    'diagnosis': ['identify_constraint'],
    'readiness': ['submit_scores'],
  }

  const allowedTools = phaseTools[session.current_phase] || []

  // Security check: Prevent phase bleeding
  if (!allowedTools.includes(toolName)) {
    console.error(`[Security] Illegal tool call: ${toolName} in phase ${session.current_phase}`)
    throw new Error(`Tool ${toolName} not allowed in phase ${session.current_phase}`)
  }

  // Execute tool
  switch (toolName) {
    case 'identify_constraint':
      // ... existing logic
      break

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}
```

---

## Step 2.5: Create Missing Phase Tools

Currently we only have `identify_constraint`. We need to add tools for other phases.

### File: `tools/context.json`

```json
[
  {
    "name": "complete_profile",
    "description": "Record the user's basic business context when you have enough information to proceed",
    "input_schema": {
      "type": "object",
      "properties": {
        "business_type": {
          "type": "string",
          "description": "Type of coaching business"
        },
        "business_stage": {
          "type": "string",
          "description": "Current stage of the business"
        },
        "surface_challenge": {
          "type": "string",
          "description": "The initial challenge the user described"
        }
      },
      "required": ["business_type", "surface_challenge"]
    }
  }
]
```

### Tool Handler

```typescript
case 'complete_profile':
  await supabaseClient
    .from('sessions')
    .update({
      business_type: input.business_type,
      business_stage: input.business_stage,
      surface_challenge: input.surface_challenge,
      current_phase: 'exploration' // Transition to next phase
    })
    .eq('id', sessionId)

  return { status: 'success', phase_changed: true, new_phase: 'exploration' }
```

---

## Step 2.6: Token Usage Analysis

### Before Modular Prompts:
```
System Prompt: 1,400 tokens (full prompt every turn)
Conversation: ~500 tokens (avg)
Total Input: ~1,900 tokens per turn
```

### After Modular Prompts:
```
Core: 200 tokens
Phase Overlay: 300 tokens (avg)
Conversation: ~500 tokens
Total Input: ~1,000 tokens per turn
```

**Savings: ~47% reduction in prompt tokens**

For a 15-turn conversation:
- Before: 28,500 input tokens
- After: 15,000 input tokens
- **Cost savings: ~$0.40 per conversation** (at GPT-4 pricing)

---

## Step 2.7: Testing Strategy

### 1. Unit Tests for Prompt Assembly

```typescript
// Test that correct prompts load
Deno.test("buildSystemPrompt includes core + phase overlay", async () => {
  const session = {
    current_phase: 'diagnosis',
    user_name: 'John',
    constraint_category: null
  }

  const prompt = await buildSystemPrompt(session, mockClient)

  assert(prompt.includes("CoachMira Advisor"))  // Core
  assert(prompt.includes("PHASE 3: DIAGNOSIS")) // Phase overlay
  assert(!prompt.includes("PHASE 1"))           // Other phases excluded
})
```

### 2. Integration Tests for Tool Restrictions

```typescript
Deno.test("prevents phase bleeding", async () => {
  // Session in context phase
  const session = { id: 'test', current_phase: 'context' }

  // Try to call diagnosis tool
  await assertRejects(
    () => handleToolCall('test', 'identify_constraint', {}, mockClient),
    Error,
    "not allowed in phase context"
  )
})
```

### 3. End-to-End Conversation Test

```typescript
// Simulate full conversation
const conversation = [
  { phase: 'context', expected_tools: ['complete_profile'] },
  { phase: 'exploration', expected_tools: ['submit_hypothesis'] },
  { phase: 'diagnosis', expected_tools: ['identify_constraint'] },
]

for (const step of conversation) {
  const tools = getToolsForPhase(step.phase)
  assertEqual(tools.map(t => t.name), step.expected_tools)
}
```

---

## Phase 2 Success Criteria ✅

**Functional:**
- ✅ Each phase only exposes relevant tools
- ✅ Tool calls in wrong phase are blocked (server-side validation)
- ✅ Prompt size reduced by ~47%
- ✅ Phase transitions work smoothly

**Quality:**
- ✅ Zero hallucinated tool calls in 100 test conversations
- ✅ LLM stays focused on current phase objectives
- ✅ Conversation flow feels natural (not robotic)

**Performance:**
- ✅ Response latency reduced by ~15% (smaller prompts)
- ✅ Cost per conversation reduced by ~40%

---

# Phase 3: Smart Context Management
**Timeline:** 3-5 days
**Risk Level:** Medium
**Value:** Medium (Cost savings for long conversations)

## Objective

Implement intelligent context windowing with summarization to handle very long conversations (20+ turns) while preserving conversation coherence.

**⚠️ WARNING:** Only implement this if:
1. We observe conversations consistently exceeding 20 turns
2. We measure actual context drift causing problems
3. Cost savings justify the added complexity

---

## Step 3.1: Add Conversation Metrics

Before implementing, measure if we need this:

```sql
-- Add analytics table
CREATE TABLE conversation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  turn_count INT,
  total_tokens INT,
  context_drift_score FLOAT, -- TBD: How to measure?
  user_repeated_info BOOLEAN  -- Did user re-state something?
);

-- Track turn counts
SELECT
  COUNT(*) as session_count,
  AVG(total_turns) as avg_turns,
  MAX(total_turns) as max_turns,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_turns) as p95_turns
FROM sessions
WHERE completion_status = 'completed';
```

**Decision Gate:**
- If avg turns < 15: Skip Phase 3
- If p95 turns < 20: Skip Phase 3
- If max turns < 30: Skip Phase 3

---

## Step 3.2: Implement Conversation Summarization

### Summarize Every 10 Turns

```typescript
async function summarizeConversation(sessionId, supabaseClient) {
  // Get all messages
  const { data: messages } = await supabaseClient
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (messages.length < 10) return null

  // Take messages 0-N-5 (leave recent 5 for context window)
  const toSummarize = messages.slice(0, -5)

  // Call Claude for summarization
  const summary = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307', // Cheap model for summarization
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Summarize this coaching diagnostic conversation in 3-4 sentences. Focus on:
      - What business the user is in
      - What challenge they're facing
      - What patterns have emerged

      Conversation:
      ${toSummarize.map(m => `${m.speaker}: ${m.message_text}`).join('\n')}`
    }]
  })

  const summaryText = summary.content[0].text

  // Store in session
  await supabaseClient
    .from('sessions')
    .update({ conversation_summary: summaryText })
    .eq('id', sessionId)

  return summaryText
}
```

---

## Step 3.3: Hybrid Context Window

```typescript
async function buildContextWindow(sessionId, supabaseClient) {
  const { data: session } = await supabaseClient
    .from('sessions')
    .select('conversation_summary')
    .eq('id', sessionId)
    .single()

  const { data: messages } = await supabaseClient
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(6) // Last 6 messages

  // Reverse to chronological order
  const recentMessages = messages.reverse()

  // Build context
  const context = []

  // 1. If we have a summary, inject it as system context
  if (session.conversation_summary) {
    context.push({
      role: 'assistant',
      content: `[Earlier conversation summary: ${session.conversation_summary}]`
    })
  }

  // 2. Add recent messages
  context.push(...recentMessages.map(m => ({
    role: m.speaker === 'user' ? 'user' : 'assistant',
    content: m.message_text
  })))

  return context
}
```

---

## Step 3.4: Trigger Summarization

```typescript
async function processConversation({ session, userMessage, supabaseClient }) {
  // ... existing logic

  // After saving user message, check if we need to summarize
  const { count } = await supabaseClient
    .from('messages')
    .select('id', { count: 'exact' })
    .eq('session_id', session.id)

  // Summarize every 10 turns
  if (count > 0 && count % 10 === 0 && !session.conversation_summary) {
    console.log(`[Summarization] Triggering at turn ${count}`)
    await summarizeConversation(session.id, supabaseClient)
  }

  // Use hybrid context window instead of full history
  const conversationHistory = await buildContextWindow(session.id, supabaseClient)

  // ... rest of conversation logic
}
```

---

## Step 3.5: Measure Impact

### Before/After Comparison

```typescript
// A/B test: 50% use windowing, 50% use full context
const useContextWindowing = Math.random() < 0.5

// Track metrics
await supabaseClient
  .from('conversation_metrics')
  .insert({
    session_id: sessionId,
    turn_count: count,
    used_windowing: useContextWindowing,
    total_tokens: tokenCount,
    user_repeated_info: detectRepetition(messages) // TBD
  })
```

### Success Metrics

Compare windowed vs. full context:
- **Conversation quality:** User satisfaction, completion rate
- **Coherence:** Does bot "forget" important details?
- **Cost:** Token usage reduction
- **Latency:** Response time improvement

**Go/No-Go Decision:**
- If quality drops: Rollback, don't use windowing
- If quality same + cost savings > 30%: Keep windowing
- If quality same + cost savings < 30%: Skip, not worth complexity

---

## Phase 3 Success Criteria ✅

**Only proceed if:**
- ✅ We have data showing conversations regularly exceed 20 turns
- ✅ Cost analysis shows meaningful savings (>30%)
- ✅ A/B test shows no drop in conversation quality

**If successful:**
- ✅ Token usage reduced by 40-60% for long conversations
- ✅ Latency improved by 20-30%
- ✅ No increase in user confusion or repetition

---

# Rollout Strategy

## Feature Flags

```typescript
// Environment variables for gradual rollout
const CONFIG = {
  PHASE_1_ENABLED: Deno.env.get('PHASE_1_ENABLED') === 'true',
  PHASE_2_ENABLED: Deno.env.get('PHASE_2_ENABLED') === 'true',
  PHASE_3_ENABLED: Deno.env.get('PHASE_3_ENABLED') === 'true',
  PHASE_1_ROLLOUT_PERCENT: parseInt(Deno.env.get('PHASE_1_ROLLOUT_PERCENT') || '0'),
  PHASE_2_ROLLOUT_PERCENT: parseInt(Deno.env.get('PHASE_2_ROLLOUT_PERCENT') || '0'),
}

// Gradual rollout
function shouldUsePhase1(sessionId: string): boolean {
  if (!CONFIG.PHASE_1_ENABLED) return false
  const hash = hashSessionId(sessionId)
  return (hash % 100) < CONFIG.PHASE_1_ROLLOUT_PERCENT
}
```

## Deployment Schedule

### Week 1: Phase 1 Development
- Days 1-2: Edge function setup + conversation logic port
- Day 3: Feature flag + client routing
- Days 4-5: Testing + observability

### Week 2: Phase 1 Rollout
- Day 1: Deploy to staging, internal testing
- Day 2: 10% rollout, monitor closely
- Day 3: 25% rollout
- Day 4: 50% rollout
- Day 5: 100% rollout (if all metrics green)

### Week 3: Phase 2 Development
- Days 1-2: Prompt modularization
- Day 3: Phase-specific tools
- Days 4-5: Testing + validation

### Week 4: Phase 2 Rollout
- Day 1: Deploy to staging
- Day 2: 25% rollout (we're more confident now)
- Day 3: 50% rollout
- Day 4: 75% rollout
- Day 5: 100% rollout

### Week 5+: Phase 3 (Optional)
- Only if data justifies it
- Follow same rollout pattern

---

# Risk Mitigation

## Rollback Plan

### Instant Rollback (< 1 minute)
```bash
# Set environment variable
PHASE_1_ENABLED=false

# Or: Set rollout to 0%
PHASE_1_ROLLOUT_PERCENT=0
```

### Database Rollback
No schema changes in Phase 1 or 2, so rollback is clean.

Phase 3 adds `conversation_summary` column:
```sql
-- Can be nullable, so safe to add/remove
ALTER TABLE sessions DROP COLUMN IF EXISTS conversation_summary;
```

## Monitoring & Alerts

### Set up alerts for:
- Error rate > 1%
- Latency p95 > 5s
- Tool call failure rate > 5%
- Database connection failures
- Edge function timeout rate > 2%

### Dashboard Metrics:
- Requests per minute (edge vs. express)
- Average latency by phase
- Tool call distribution
- Token usage trends
- Cost per conversation

---

# Cost Analysis

## Current State (Estimated)
- Avg conversation: 15 turns
- Avg prompt: 1,400 tokens
- Total input: 21,000 tokens per conversation
- Claude Sonnet: $3/1M input tokens
- **Cost per conversation: $0.063**

## After Phase 1
- Same token usage (no optimization yet)
- **Cost per conversation: $0.063** (unchanged)
- Benefit: Security + observability

## After Phase 2
- Avg prompt: 500 tokens (modular)
- Total input: 7,500 tokens per conversation
- **Cost per conversation: $0.023**
- **Savings: $0.040 per conversation (63% reduction)**

## After Phase 3 (if implemented)
- Context windowing: 30% fewer tokens
- Total input: 5,250 tokens per conversation
- **Cost per conversation: $0.016**
- **Savings: $0.047 per conversation (75% reduction)**

## ROI Calculation
At 1,000 conversations/month:
- Phase 1: $0 savings, priceless observability
- Phase 2: $40/month savings + eliminates bug class
- Phase 3: $47/month savings (marginal gain)

**Conclusion:** Phase 2 is a no-brainer. Phase 3 only worth it if we scale to 10K+ conversations/month.

---

# Summary

## Phase 1: Backend Orchestration
✅ **DO NOW**
- Low risk, high value
- Security + observability
- No UX changes
- Clean rollback

## Phase 2: Modular Prompts
✅ **DO NEXT**
- Medium risk, high value
- Eliminates hallucinated tool calls
- 63% cost reduction
- Better conversation focus

## Phase 3: Smart Context
⏸️ **EVALUATE FIRST**
- Medium risk, medium value
- Only if conversations exceed 20 turns
- Measure before building
- Marginal gains vs. complexity

---

**Next Steps:**
1. Review this plan with the team
2. Get stakeholder buy-in on incremental approach
3. Set up development environment (Supabase CLI)
4. Begin Phase 1 implementation
5. Establish success metrics before each phase

**Remember:** We can stop at any phase if ROI doesn't justify the next step. Each phase provides independent value.
