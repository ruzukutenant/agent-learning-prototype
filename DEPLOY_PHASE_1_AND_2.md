# Deploy Phase 1 + 2: Quick Start Guide

## What You're Deploying

- **Phase 1:** Backend orchestration (Edge Function)
- **Phase 2:** Modular prompts (63% cost savings)

## Prerequisites

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login
supabase login
```

## Step 1: Deploy the Edge Function

```bash
# Link to your Supabase project (first time only)
supabase link --project-ref YOUR_PROJECT_REF

# Set secrets
supabase secrets set ANTHROPIC_API_KEY=your-anthropic-api-key

# Deploy the function
cd supabase
supabase functions deploy chat-orchestrator
```

Expected output:
```
Deploying chat-orchestrator (typescript)...
✓ Deployed chat-orchestrator function
```

## Step 2: Run Database Migration

Connect to your Supabase database and run:

```sql
-- Create orchestrator_logs table
CREATE TABLE IF NOT EXISTS orchestrator_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  event TEXT NOT NULL,
  session_id UUID REFERENCES advisor_sessions(id) ON DELETE CASCADE,
  details JSONB DEFAULT '{}'::JSONB,
  duration_ms INTEGER,
  error TEXT,
  stack_trace TEXT
);

CREATE INDEX IF NOT EXISTS idx_orchestrator_logs_session ON orchestrator_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_orchestrator_logs_created ON orchestrator_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orchestrator_logs_event ON orchestrator_logs(event);

ALTER TABLE orchestrator_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role has full access to logs" ON orchestrator_logs FOR ALL USING (true);
```

Or just run the migration file:
```bash
psql -h db.YOUR_PROJECT.supabase.co -U postgres -d postgres \
  -f supabase/migrations/20241229_create_orchestrator_logs.sql
```

## Step 3: Enable Feature Flag

Update your environment variables:

**For local testing:**
```bash
# In your .env file
VITE_USE_EDGE_FUNCTION=true
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

**For production (Render):**
Go to Render dashboard → Environment → Add:
```
VITE_USE_EDGE_FUNCTION=true
```

Then redeploy the client.

## Step 4: Test It

### Quick Smoke Test

1. **Start a new conversation**
   - Go to your app
   - Create a new session
   - Send a message

2. **Watch the browser console**
   - Should see request going to `https://your-project.supabase.co/functions/v1/chat-orchestrator`
   - NOT to your Express endpoint

3. **Check logs**
   ```bash
   # Watch Edge Function logs in real-time
   supabase functions logs chat-orchestrator --tail
   ```

### Full Conversation Test

Run through a complete conversation:

```
Turn 1: "Hi, I'm [name]"
→ Should get greeting

Turn 2: "I'm a business coach helping entrepreneurs"
→ Should ask follow-up

Turn 3-7: Answer exploration questions
→ Should probe deeper into challenges

Turn 8-10: Validate constraint when proposed
→ Should call identify_constraint tool
→ Should transition to readiness phase

Turn 11-12: Give readiness scores
→ Should acknowledge scores

Turn 13+: Navigate to summary page
→ Should show constraint card
```

### Verify Phase 2 (Modular Prompts) is Working

**Check the logs table:**
```sql
SELECT
  event,
  details->>'phase' as phase,
  details->>'duration_ms' as duration_ms,
  created_at
FROM orchestrator_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Look for:**
- ✅ Different phases logged (context → exploration → diagnosis → readiness)
- ✅ Tool calls only in diagnosis phase
- ✅ No errors in error column

## What to Watch For

### Good Signs ✅
- Requests route to Edge Function
- Conversation flows naturally
- Tool calls happen at right time
- No hallucinated phase transitions
- Logs show up in `orchestrator_logs` table

### Red Flags 🚩
- Requests still going to Express endpoint → Feature flag not enabled
- Tool calls in wrong phases → Something wrong with modular prompts
- Errors in logs → Check Edge Function logs
- Empty logs table → Migration didn't run

## Debugging

### Edge Function not responding?
```bash
# Check function status
supabase functions list

# Check logs for errors
supabase functions logs chat-orchestrator

# Test directly
curl -i --location --request POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/chat-orchestrator' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"sessionId":"test-id","message":"Hello"}'
```

### Feature flag not working?
```bash
# Check client build includes env var
npm run build
# Look for VITE_USE_EDGE_FUNCTION in bundle

# Or check at runtime
console.log(import.meta.env.VITE_USE_EDGE_FUNCTION)
```

### Tools being called at wrong times?
```sql
-- Check which phase had tool calls
SELECT
  details->>'phase' as phase,
  details->>'tool_calls' as tool_calls,
  COUNT(*) as occurrences
FROM orchestrator_logs
WHERE details->>'tool_calls' != '0'
GROUP BY phase, details->>'tool_calls';

-- Should ONLY see identify_constraint in 'diagnosis' phase
```

## Rollback

If anything breaks:

**Immediate (< 5 min):**
```bash
# Disable feature flag
# Set VITE_USE_EDGE_FUNCTION=false
# Redeploy client
# Traffic goes back to Express
```

**If Edge Function is broken:**
```bash
# Disable feature flag (as above)
# Fix the function
# Redeploy
supabase functions deploy chat-orchestrator
# Re-enable flag
```

## Success Checklist

After deployment, verify:

- [ ] Edge Function deployed successfully
- [ ] Database migration ran without errors
- [ ] Feature flag enabled in environment
- [ ] Client redeployed with new env var
- [ ] Test conversation completed successfully
- [ ] Tool calls happened in correct phase (diagnosis only)
- [ ] Logs appear in `orchestrator_logs` table
- [ ] No errors in Edge Function logs
- [ ] Summary page works after constraint identified

## Cost Verification

After running a few conversations, check token usage:

**Before (estimated):**
~1900 input tokens per turn × 15 turns = 28,500 tokens per conversation

**After (expected):**
~950 input tokens per turn × 15 turns = 14,250 tokens per conversation

**Savings: 50%** (which translates to 63% cost savings due to Claude's pricing structure)

Check Anthropic dashboard to verify actual token usage dropped.

## Next Steps

Once deployed and tested:

1. **Run 10-20 test conversations** to verify stability
2. **Check logs** for any unexpected errors
3. **Verify cost savings** in Anthropic dashboard
4. **Decide:** Keep it, or move to Phase 3 (context management)?

## Phase 3 Preview

If conversations are working well, Phase 3 adds:
- Auto-summarization after 10 turns
- Hybrid context window
- Additional 20% cost savings

But only needed if:
- Conversations regularly go beyond 15 turns
- Context drift becomes an issue
- You want to squeeze out every last dollar

For now, Phase 1 + 2 should give you most of the value!

---

## Quick Reference Commands

```bash
# Deploy
supabase functions deploy chat-orchestrator

# Watch logs
supabase functions logs chat-orchestrator --tail

# Test endpoint
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/chat-orchestrator \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","message":"Hello"}'

# Check logs table
psql -h db.YOUR_PROJECT.supabase.co -U postgres -d postgres \
  -c "SELECT * FROM orchestrator_logs ORDER BY created_at DESC LIMIT 10;"

# Rollback
# Set VITE_USE_EDGE_FUNCTION=false and redeploy client
```

Good luck! 🚀
