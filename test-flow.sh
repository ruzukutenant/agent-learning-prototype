#!/bin/bash

set -e

API_URL="http://localhost:3001/api"
SUPABASE_URL="https://gqelaotedbyvysatnnsx.supabase.co"
ANON_KEY="sb_publishable_0G13irtPirWIqIcRmXOp4A_p97KsHyq"

echo "=== Testing Complete Conversation Flow ==="
echo ""

# Create session
echo "1. Creating new session..."
SESSION_RESPONSE=$(curl -s -X POST "${API_URL}/sessions" \
  -H "Content-Type: application/json" \
  -d '{"userName": "Test Coach"}')

SESSION_ID=$(echo $SESSION_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['session']['id'])" 2>/dev/null)

if [ -z "$SESSION_ID" ]; then
  echo "Failed to create session"
  echo "Response: $SESSION_RESPONSE"
  exit 1
fi

echo "✓ Session created: $SESSION_ID"
echo ""

# Send initial message
echo "2. Sending __INIT__ message..."
INIT_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"__INIT__\"}")

echo "Response:"
echo "$INIT_RESPONSE" | python3 -m json.tool 2>/dev/null | head -30
echo ""

# Simulate CONTEXT phase responses
echo "3. CONTEXT Phase - Answering business questions..."
echo ""

echo "   Q: Tell me about your business..."
echo "   A: I'm a life coach for burned-out executives."
MSG1=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"I'm a life coach for burned-out executives.\"}")
echo "   ✓ Response received"
echo ""

sleep 2

echo "   Q: How are clients finding you?"
echo "   A: Mostly referrals and some LinkedIn posts."
MSG2=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"Mostly referrals and some LinkedIn posts.\"}")
echo "   ✓ Response received"
echo ""

sleep 2

echo "   Q: Volume indicator?"
echo "   A: About 3-5 clients per month, around $8K monthly."
MSG3=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"About 3-5 clients per month, around 8K monthly.\"}")
echo "   ✓ Response received"
echo ""

sleep 2

echo "   Q: What's challenging?"
echo "   A: Inconsistent lead flow. Some months are great, others are slow."
MSG4=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"Inconsistent lead flow. Some months are great, others are slow.\"}")
echo "   ✓ Response received"

# Check if complete_phase_1 tool was called
TOOL_CALLS=$(echo "$MSG4" | python3 -c "import sys, json; data = json.load(sys.stdin); print(json.dumps(data.get('toolCalls', []), indent=2))" 2>/dev/null)
if echo "$TOOL_CALLS" | grep -q "complete_phase_1"; then
  echo "   ✅ complete_phase_1 tool was called!"
else
  echo "   ⚠️  complete_phase_1 tool not detected in response"
fi

echo ""
echo "4. Checking session data..."
SESSION_DATA=$(curl -s -X GET "${API_URL}/sessions/${SESSION_ID}")
CURRENT_PHASE=$(echo "$SESSION_DATA" | python3 -c "import sys, json; print(json.load(sys.stdin)['session']['current_phase'])" 2>/dev/null)
echo "   Current phase: $CURRENT_PHASE"
if [ "$CURRENT_PHASE" = "exploration" ]; then
  echo "   ✅ Phase transition successful!"
else
  echo "   ⚠️  Expected 'exploration', got '$CURRENT_PHASE'"
fi

echo ""
echo "=== Test Summary ==="
echo "Session ID: $SESSION_ID"
echo "You can continue testing this session in the UI at:"
echo "http://localhost:5173/chat/$SESSION_ID"
