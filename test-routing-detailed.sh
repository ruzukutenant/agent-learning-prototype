#!/bin/bash

set -e

API_URL="http://localhost:3001/api"
SUPABASE_URL="https://gqelaotedbyvysatnnsx.supabase.co"
ANON_KEY="sb_publishable_0G13irtPirWIqIcRmXOp4A_p97KsHyq"

send_message() {
  local SESSION_ID=$1
  local MESSAGE=$2
  local RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"$MESSAGE\"}")
  
  echo "$RESPONSE"
}

check_phase() {
  local SESSION_ID=$1
  local PHASE=$(curl -s "${API_URL}/sessions/${SESSION_ID}" | python3 -c "import sys, json; print(json.load(sys.stdin)['session']['current_phase'])" 2>/dev/null)
  echo "$PHASE"
}

echo "=== Testing Routing with High Readiness → MIST ==="
echo ""

# Create session
SESSION_RESPONSE=$(curl -s -X POST "${API_URL}/sessions" -H "Content-Type: application/json" -d '{"userName": "High Readiness Test"}')
SESSION_ID=$(echo $SESSION_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['session']['id'])")

echo "Session: $SESSION_ID"
echo ""

# Init
send_message "$SESSION_ID" "__INIT__" > /dev/null
sleep 1

# CONTEXT phase (4 required fields)
echo "CONTEXT phase..."
send_message "$SESSION_ID" "I coach executives on leadership." > /dev/null
sleep 1
send_message "$SESSION_ID" "LinkedIn and referrals." > /dev/null
sleep 1
send_message "$SESSION_ID" "5 clients per month, $15K monthly." > /dev/null
sleep 1
send_message "$SESSION_ID" "Overwhelmed with manual processes." > /dev/null
sleep 2

PHASE=$(check_phase "$SESSION_ID")
echo "✓ Phase after CONTEXT: $PHASE"
echo ""

# EXPLORATION phase
echo "EXPLORATION phase..."
send_message "$SESSION_ID" "Everything is manual. Scheduling, invoicing, follow-ups - all in my head." > /dev/null
sleep 2
send_message "$SESSION_ID" "I know what to do, I just can't keep up with it all." > /dev/null
sleep 3

PHASE=$(check_phase "$SESSION_ID")
echo "✓ Phase after EXPLORATION: $PHASE"
echo ""

# DIAGNOSIS phase
echo "DIAGNOSIS phase..."
send_message "$SESSION_ID" "Yes, exactly. That's my biggest bottleneck." > /dev/null
sleep 3

PHASE=$(check_phase "$SESSION_ID")
echo "✓ Phase after DIAGNOSIS: $PHASE"
echo ""

# READINESS phase
echo "READINESS phase..."
send_message "$SESSION_ID" "9" > /dev/null
sleep 1
send_message "$SESSION_ID" "8" > /dev/null
sleep 1
send_message "$SESSION_ID" "9" > /dev/null
sleep 2

PHASE=$(check_phase "$SESSION_ID")
echo "✓ Phase after READINESS: $PHASE"
echo ""

# ROUTING phase
echo "ROUTING phase..."
ROUTING_RESPONSE=$(send_message "$SESSION_ID" "I'd rather have someone build it for me.")
sleep 2

echo "AI Response:"
echo "$ROUTING_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('advisorMessage', {}).get('message_text', 'No message'))"
echo ""

TOOL_CALLS=$(echo "$ROUTING_RESPONSE" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin).get('toolCalls', [])))")

if echo "$TOOL_CALLS" | grep -q "select_endpoint"; then
  ENDPOINT=$(echo "$TOOL_CALLS" | python3 -c "import sys, json; tools = json.load(sys.stdin); endpoint_tool = next((t for t in tools if t['name'] == 'select_endpoint'), None); print(endpoint_tool['input']['endpoint'])")
  echo "✅ Endpoint selected: $ENDPOINT"
  
  if [ "$ENDPOINT" = "MIST" ]; then
    echo "✅ CORRECT! High readiness + wants implementation = MIST"
  fi
else
  echo "⚠️  No endpoint selected"
fi

echo ""
echo "Summary: http://localhost:5173/summary/$SESSION_ID"
