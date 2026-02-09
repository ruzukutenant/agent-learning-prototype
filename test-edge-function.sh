#!/bin/bash

# Test the deployed Edge Function

SUPABASE_URL="https://gqelaotedbyvysatnnsx.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZWxhb3RlZGJ5dnlzYXRubnN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0MDg4MTAsImV4cCI6MjA1MDk4NDgxMH0.sb_publishable_0G13irtPirWIqIcRmXOp4A_p97KsHyq"

# First, create a test session
echo "Creating test session..."
SESSION_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/advisor_sessions" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "user_name": "Test User",
    "current_phase": "context",
    "total_turns": 0
  }')

SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  echo "Failed to create session"
  echo "Response: $SESSION_RESPONSE"
  exit 1
fi

echo "✓ Created session: $SESSION_ID"

# Test the Edge Function with initial greeting
echo ""
echo "Testing Edge Function with __INIT__ message..."
INIT_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"message\": \"__INIT__\"
  }")

echo "Response:"
echo "$INIT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$INIT_RESPONSE"

echo ""
echo "✓ Edge Function test complete"
echo "Session ID: $SESSION_ID"
