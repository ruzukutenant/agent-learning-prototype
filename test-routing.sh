#!/bin/bash

set -e

API_URL="http://localhost:3001/api"
SUPABASE_URL="https://gqelaotedbyvysatnnsx.supabase.co"
ANON_KEY="sb_publishable_0G13irtPirWIqIcRmXOp4A_p97KsHyq"

echo "=== Testing Complete Routing Flow ==="
echo ""

# Create session
echo "1. Creating new session..."
SESSION_RESPONSE=$(curl -s -X POST "${API_URL}/sessions" \
  -H "Content-Type: application/json" \
  -d '{"userName": "Routing Test"}')

SESSION_ID=$(echo $SESSION_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['session']['id'])" 2>/dev/null)

if [ -z "$SESSION_ID" ]; then
  echo "Failed to create session"
  exit 1
fi

echo "✓ Session created: $SESSION_ID"
echo ""

# Go through phases quickly
echo "2. Speed-running through phases..."

curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"__INIT__\"}" > /dev/null

sleep 1

curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"I'm a business coach for small business owners.\"}" > /dev/null

sleep 1

curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"Mostly referrals.\"}" > /dev/null

sleep 1

curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"About 10K per month.\"}" > /dev/null

sleep 1

curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"I'm drowning in client work and can't grow.\"}" > /dev/null

sleep 2

curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"I have no systems. Everything is manual and takes forever.\"}" > /dev/null

sleep 2

curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"Yes, that's exactly it.\"}" > /dev/null

sleep 2

# READINESS phase
echo "3. READINESS Phase..."
curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"8\"}" > /dev/null

sleep 1

curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"8\"}" > /dev/null

sleep 1

curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"9\"}" > /dev/null

sleep 2

# ROUTING phase - should ask preference question
echo "4. ROUTING Phase - Testing preference question..."
ROUTING_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"I want help implementing this, I don't have time to do it myself.\"}")

echo ""
echo "AI Response:"
echo "$ROUTING_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['advisorMessage']['message_text'])" 2>/dev/null

# Check if select_endpoint tool was called
TOOL_CALLS=$(echo "$ROUTING_RESPONSE" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin).get('toolCalls', []), indent=2))" 2>/dev/null)
echo ""
echo "Tool Calls:"
echo "$TOOL_CALLS"

if echo "$TOOL_CALLS" | grep -q "select_endpoint"; then
  ENDPOINT=$(echo "$TOOL_CALLS" | python3 -c "import sys, json; tools = json.load(sys.stdin); endpoint_tool = next((t for t in tools if t['name'] == 'select_endpoint'), None); print(endpoint_tool['input']['endpoint'] if endpoint_tool else 'NOT FOUND')" 2>/dev/null)
  echo ""
  echo "✅ select_endpoint tool was called!"
  echo "   Selected endpoint: $ENDPOINT"
  
  if [ "$ENDPOINT" = "MIST" ]; then
    echo "   ✅ CORRECT! High readiness (8/8/9) + wants implementation = MIST"
  else
    echo "   ⚠️  Expected MIST, got $ENDPOINT"
  fi
else
  echo ""
  echo "⚠️  select_endpoint tool not called"
fi

echo ""
echo "5. Checking final session state..."
SESSION_DATA=$(curl -s -X GET "${API_URL}/sessions/${SESSION_ID}")
FINAL_ENDPOINT=$(echo "$SESSION_DATA" | python3 -c "import sys, json; print(json.load(sys.stdin)['session'].get('endpoint_selected', 'NOT SET'))" 2>/dev/null)
COMPLETION_STATUS=$(echo "$SESSION_DATA" | python3 -c "import sys, json; print(json.load(sys.stdin)['session'].get('completion_status', 'NOT SET'))" 2>/dev/null)

echo "   Final endpoint_selected: $FINAL_ENDPOINT"
echo "   Completion status: $COMPLETION_STATUS"

if [ "$FINAL_ENDPOINT" = "MIST" ] && [ "$COMPLETION_STATUS" = "completed" ]; then
  echo "   ✅ Session properly completed and routed!"
else
  echo "   ⚠️  Session state unexpected"
fi

echo ""
echo "=== Test Complete ==="
echo "View session at: http://localhost:5173/chat/$SESSION_ID"
echo "View summary at: http://localhost:5173/summary/$SESSION_ID"
