# Chat Orchestrator Edge Function

Server-side conversation orchestrator for CoachMira Advisor.

## Purpose

This Edge Function moves conversation orchestration from the client to the server, providing:
- **Security**: No prompt injection via browser devtools
- **Observability**: Centralized logging and debugging
- **Reliability**: Single source of truth in database
- **Flexibility**: Can change logic without client deploys

## Architecture

```
Client → Edge Function → Claude API → Database
         ↓
    Orchestrator Logs
```

## Files

- `index.ts` - Entry point, CORS, error handling, logging
- `conversation.ts` - Core conversation logic (ported from Express)

## Environment Variables

Required in Supabase Edge Function secrets:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key
```

## Deployment

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Link to your project

```bash
supabase link --project-ref your-project-ref
```

### 3. Set secrets

```bash
supabase secrets set ANTHROPIC_API_KEY=your-key
supabase secrets set SUPABASE_URL=your-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
```

### 4. Deploy function

```bash
supabase functions deploy chat-orchestrator
```

### 5. Run migration

```bash
psql -h db.your-project.supabase.co -U postgres -d postgres -f ../migrations/20241229_create_orchestrator_logs.sql
```

## Testing Locally

```bash
# Start local Supabase
supabase start

# Serve function locally
supabase functions serve chat-orchestrator --env-file .env.local

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/chat-orchestrator' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"sessionId":"test-session-id","message":"Hello"}'
```

## Feature Flag

The client uses `VITE_USE_EDGE_FUNCTION=true` to route traffic here instead of the Express endpoint.

Rollout plan:
1. Deploy Edge Function
2. Test with `VITE_USE_EDGE_FUNCTION=true` locally
3. Enable for 10% of production traffic
4. Monitor `orchestrator_logs` table
5. Gradually increase to 100%
6. Deprecate Express endpoint

## Monitoring

Query logs:

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

## Rollback

Set `VITE_USE_EDGE_FUNCTION=false` to route back to Express endpoint immediately.
