#!/bin/bash
# Local testing script for Edge Function

set -e

echo "🧪 Testing Chat Orchestrator Edge Function locally..."

# Check if supabase is running
if ! curl -s http://localhost:54321/rest/v1/ > /dev/null 2>&1; then
    echo "❌ Supabase not running locally. Start with: supabase start"
    exit 1
fi

# Get the anon key from local Supabase
ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')

if [ -z "$ANON_KEY" ]; then
    echo "❌ Could not get anon key. Make sure Supabase is running."
    exit 1
fi

echo "📡 Found anon key: ${ANON_KEY:0:20}..."

# Start the function in the background
echo "🚀 Starting Edge Function..."
supabase functions serve chat-orchestrator --env-file .env.local &
FUNC_PID=$!

# Wait for function to be ready
sleep 5

# Test the function
echo "📨 Sending test request..."
RESPONSE=$(curl -s -w "\n%{http_code}" --location --request POST 'http://localhost:54321/functions/v1/chat-orchestrator' \
  --header "Authorization: Bearer $ANON_KEY" \
  --header 'Content-Type: application/json' \
  --data '{"sessionId":"test-session-id","message":"__INIT__"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo ""
echo "📊 Response:"
echo "Status: $HTTP_CODE"
echo "Body: $BODY"

# Cleanup
kill $FUNC_PID 2>/dev/null || true

if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "✅ Test passed!"
else
    echo ""
    echo "❌ Test failed with status $HTTP_CODE"
    exit 1
fi
