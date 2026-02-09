-- ============================================
-- Observability Queries for Chat Orchestrator
-- ============================================

-- 1. Recent orchestrator activity (last hour)
SELECT
  event,
  session_id,
  details->>'phase' as phase,
  details->>'duration_ms' as duration_ms,
  details->>'tool_calls' as tool_calls,
  created_at
FROM orchestrator_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 100;

-- 2. Average response times by phase
SELECT
  details->>'phase' as phase,
  COUNT(*) as total_requests,
  AVG((details->>'duration_ms')::int) as avg_duration_ms,
  MIN((details->>'duration_ms')::int) as min_duration_ms,
  MAX((details->>'duration_ms')::int) as max_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (details->>'duration_ms')::int) as p95_duration_ms
FROM orchestrator_logs
WHERE event = 'conversation_complete'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY details->>'phase'
ORDER BY total_requests DESC;

-- 3. Error rate and error messages
SELECT
  error,
  COUNT(*) as error_count,
  MAX(created_at) as last_occurrence
FROM orchestrator_logs
WHERE error IS NOT NULL
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error
ORDER BY error_count DESC;

-- 4. Tool call distribution
SELECT
  details->>'tool_calls' as tool_calls,
  COUNT(*) as occurrences
FROM orchestrator_logs
WHERE event = 'conversation_complete'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY details->>'tool_calls'
ORDER BY occurrences DESC;

-- 5. Session-level performance (specific session)
SELECT
  event,
  details->>'phase' as phase,
  details->>'duration_ms' as duration_ms,
  created_at
FROM orchestrator_logs
WHERE session_id = 'YOUR_SESSION_ID'
ORDER BY created_at;

-- 6. Hourly traffic volume
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as requests,
  AVG((details->>'duration_ms')::int) as avg_duration_ms
FROM orchestrator_logs
WHERE event = 'conversation_complete'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour DESC;

-- 7. Slow requests (>5 seconds)
SELECT
  session_id,
  details->>'phase' as phase,
  details->>'duration_ms' as duration_ms,
  created_at,
  details
FROM orchestrator_logs
WHERE (details->>'duration_ms')::int > 5000
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY (details->>'duration_ms')::int DESC;

-- 8. Health check (success vs error rate)
SELECT
  CASE
    WHEN error IS NULL THEN 'success'
    ELSE 'error'
  END as status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM orchestrator_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY (error IS NULL)
ORDER BY count DESC;
