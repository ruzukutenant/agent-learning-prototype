#!/bin/bash

set -e

SESSION_ID=$1
if [ -z "$SESSION_ID" ]; then
  echo "Usage: $0 <session_id>"
  exit 1
fi

SUPABASE_URL="https://gqelaotedbyvysatnnsx.supabase.co"
ANON_KEY="sb_publishable_0G13irtPirWIqIcRmXOp4A_p97KsHyq"
API_URL="http://localhost:3001/api"

echo "=== Testing Remaining Phases ==="
echo "Session ID: $SESSION_ID"
echo ""

# EXPLORATION Phase
echo "5. EXPLORATION Phase - Probing for signals..."
echo ""

echo "   Simulating exploration questions..."
MSG5=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"People seem interested when they hear about my services, but converting them into paying clients is tough. I feel like I'm not positioning things clearly enough.\"}")
echo "   ✓ Response received"
echo ""

sleep 3

echo "   Continuing exploration..."
MSG6=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"When people ask about pricing, I get nervous and sometimes undersell myself. I'm not totally clear on my value prop.\"}")
echo "   ✓ Response received"

# Check if submit_hypothesis tool was called
TOOL_CALLS=$(echo "$MSG6" | python3 -c "import sys, json; data = json.load(sys.stdin); print(json.dumps(data.get('toolCalls', []), indent=2))" 2>/dev/null)
if echo "$TOOL_CALLS" | grep -q "submit_hypothesis"; then
  echo "   ✅ submit_hypothesis tool was called!"
else
  echo "   ⚠️  submit_hypothesis tool not detected (may need more turns)"
fi

echo ""

# Check phase
SESSION_DATA=$(curl -s -X GET "${API_URL}/sessions/${SESSION_ID}")
CURRENT_PHASE=$(echo "$SESSION_DATA" | python3 -c "import sys, json; print(json.load(sys.stdin)['session']['current_phase'])" 2>/dev/null)
echo "   Current phase: $CURRENT_PHASE"

# DIAGNOSIS Phase (if we moved to it)
if [ "$CURRENT_PHASE" = "diagnosis" ]; then
  echo ""
  echo "6. DIAGNOSIS Phase - Validating constraint..."
  echo ""
  
  MSG7=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"Yes, that really resonates. I think that's exactly what's been holding me back.\"}")
  echo "   ✓ Response received"
  
  TOOL_CALLS=$(echo "$MSG7" | python3 -c "import sys, json; data = json.load(sys.stdin); print(json.dumps(data.get('toolCalls', []), indent=2))" 2>/dev/null)
  if echo "$TOOL_CALLS" | grep -q "identify_constraint"; then
    echo "   ✅ identify_constraint tool was called!"
  fi
  
  echo ""
  
  # Check phase again
  SESSION_DATA=$(curl -s -X GET "${API_URL}/sessions/${SESSION_ID}")
  CURRENT_PHASE=$(echo "$SESSION_DATA" | python3 -c "import sys, json; print(json.load(sys.stdin)['session']['current_phase'])" 2>/dev/null)
  echo "   Current phase: $CURRENT_PHASE"
fi

# READINESS Phase (if we moved to it)
if [ "$CURRENT_PHASE" = "readiness" ]; then
  echo ""
  echo "7. READINESS Phase - Collecting scores..."
  echo ""
  
  echo "   Q: Clarity score?"
  MSG8=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"7\"}")
  echo "   ✓ Response received"
  sleep 2
  
  echo "   Q: Confidence score?"
  MSG9=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"6\"}")
  echo "   ✓ Response received"
  sleep 2
  
  echo "   Q: Capacity score?"
  MSG10=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/chat-orchestrator" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\": \"$SESSION_ID\", \"message\": \"8\"}")
  echo "   ✓ Response received"
  
  TOOL_CALLS=$(echo "$MSG10" | python3 -c "import sys, json; data = json.load(sys.stdin); print(json.dumps(data.get('toolCalls', []), indent=2))" 2>/dev/null)
  if echo "$TOOL_CALLS" | grep -q "assess_readiness"; then
    echo "   ✅ assess_readiness tool was called!"
  fi
  
  echo ""
  
  # Final phase check
  SESSION_DATA=$(curl -s -X GET "${API_URL}/sessions/${SESSION_ID}")
  CURRENT_PHASE=$(echo "$SESSION_DATA" | python3 -c "import sys, json; print(json.load(sys.stdin)['session']['current_phase'])" 2>/dev/null)
  echo "   Final phase: $CURRENT_PHASE"
  
  if [ "$CURRENT_PHASE" = "routing" ]; then
    echo "   ✅ All phases completed successfully!"
  fi
fi

echo ""
echo "=== Test Complete ==="
echo "View full session at: http://localhost:5173/chat/$SESSION_ID"
