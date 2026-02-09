#!/bin/bash

set -e

API_URL="http://localhost:3001/api"
SUPABASE_URL="https://gqelaotedbyvysatnnsx.supabase.co"
ANON_KEY="sb_publishable_0G13irtPirWIqIcRmXOp4A_p97KsHyq"

send_message() {
  local SESSION_ID=$1
  local MESSAGE=$2
  curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"$MESSAGE\"}"
}

echo "=== Test: High Readiness → Wants Implementation → MIST ==="
echo ""

# Create session
SESSION_RESPONSE=$(curl -s -X POST "${API_URL}/sessions" -H "Content-Type: application/json" -d '{"userName": "MIST Test"}')
SESSION_ID=$(echo $SESSION_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['session']['id'])")
echo "Session: $SESSION_ID"
echo ""

# Init
send_message "$SESSION_ID" "__INIT__" > /dev/null
sleep 1

# CONTEXT - Business basics
send_message "$SESSION_ID" "I'm a life coach for executives." > /dev/null
sleep 1
send_message "$SESSION_ID" "Referrals mostly." > /dev/null
sleep 1
send_message "$SESSION_ID" "4-5 clients per month, around 12K monthly." > /dev/null
sleep 1
send_message "$SESSION_ID" "Can't scale because everything is manual." > /dev/null
sleep 2

# EXPLORATION - Signal gathering  
send_message "$SESSION_ID" "No systems for onboarding, scheduling, or follow-up. All manual." > /dev/null
sleep 2
send_message "$SESSION_ID" "I spend hours each week on admin work instead of growing the business." > /dev/null
sleep 3

# DIAGNOSIS - Validation
send_message "$SESSION_ID" "Yes, that's exactly my problem." > /dev/null
sleep 3

# READINESS - Collect scores
echo "Collecting readiness scores..."
send_message "$SESSION_ID" "9" > /dev/null  # Clarity
sleep 1
send_message "$SESSION_ID" "8" > /dev/null  # Confidence
sleep 1
CAPACITY_RESPONSE=$(send_message "$SESSION_ID" "8")  # Capacity
sleep 2

# Check if moved to routing
PHASE=$(curl -s "${API_URL}/sessions/${SESSION_ID}" | python3 -c "import sys, json; print(json.load(sys.stdin)['session']['current_phase'])")

if [ "$PHASE" = "routing" ]; then
  echo "✓ Moved to ROUTING phase"
  echo ""
  
  # ROUTING - Answer preference
  echo "Answering routing preference question..."
  ROUTING_RESPONSE=$(send_message "$SESSION_ID" "I want help implementing this. I don't have time to build it myself.")
  sleep 2
  
  echo "AI Response:"
  echo "$ROUTING_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('advisorMessage', {}).get('message_text', 'No message'))"
  echo ""
  
  # Check endpoint
  ENDPOINT=$(curl -s "${API_URL}/sessions/${SESSION_ID}" | python3 -c "import sys, json; print(json.load(sys.stdin)['session'].get('endpoint_selected', 'NOT SET'))")
  echo "Selected endpoint: $ENDPOINT"
  
  if [ "$ENDPOINT" = "MIST" ]; then
    echo "✅ SUCCESS! Correctly routed to MIST"
  elif [ "$ENDPOINT" = "NOT SET" ]; then
    echo "⚠️  Endpoint not set yet - may need one more message"
  else
    echo "⚠️  Expected MIST, got $ENDPOINT"
  fi
else
  echo "⚠️  Still in $PHASE phase, expected routing"
fi

echo ""
echo "Summary: http://localhost:5173/summary/$SESSION_ID"
