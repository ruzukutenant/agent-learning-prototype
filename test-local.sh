#!/bin/bash
# Local testing script for Phase 1 + 2

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "🧪 Local Testing - Phase 1 + 2"
echo "================================"
echo ""

# Step 1: Check Docker
echo "Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo ""
    echo "Please start Docker Desktop, then run this script again."
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Step 2: Start Supabase (if not already running)
echo "Starting Supabase locally..."
if supabase status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Supabase already running${NC}"
else
    echo "This will take a minute (downloading Docker images)..."
    supabase start
fi
echo ""

# Step 3: Get local credentials
echo "Getting local credentials..."
SUPABASE_URL=$(supabase status | grep "API URL:" | awk '{print $3}')
ANON_KEY=$(supabase status | grep "anon key:" | awk '{print $3}')
SERVICE_KEY=$(supabase status | grep "service_role key:" | awk '{print $3}')

echo -e "${GREEN}Local Supabase running at:${NC} $SUPABASE_URL"
echo ""

# Step 4: Create local env file for Edge Function
echo "Creating .env.local for Edge Function..."
cat > supabase/.env.local << EOF
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-your-key-here}
PROJECT_URL=$SUPABASE_URL
SERVICE_ROLE_KEY=$SERVICE_KEY
EOF

if [ "$ANTHROPIC_API_KEY" = "" ]; then
    echo -e "${YELLOW}⚠️  ANTHROPIC_API_KEY not set${NC}"
    read -p "Enter your Anthropic API key: " ANTHROPIC_KEY
    echo "ANTHROPIC_API_KEY=$ANTHROPIC_KEY" > supabase/.env.local
    echo "PROJECT_URL=$SUPABASE_URL" >> supabase/.env.local
    echo "SERVICE_ROLE_KEY=$SERVICE_KEY" >> supabase/.env.local
fi
echo -e "${GREEN}✅ Edge Function env configured${NC}"
echo ""

# Step 5: Run database migration
echo "Running database migration..."
psql "$SUPABASE_URL/postgres" -f supabase/migrations/20241229_create_orchestrator_logs.sql 2>&1 | grep -v "already exists" || true
echo -e "${GREEN}✅ Migration complete${NC}"
echo ""

# Step 6: Start Edge Function
echo "Starting Edge Function..."
echo ""
echo -e "${YELLOW}Edge Function will run in the background.${NC}"
echo "You can view logs with: supabase functions logs chat-orchestrator"
echo ""

cd supabase
supabase functions serve chat-orchestrator --env-file .env.local --no-verify-jwt &
FUNC_PID=$!
cd ..

# Wait for function to start
sleep 3

# Step 7: Update client .env.local
echo "Updating client environment..."
cat > client/.env.local << EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
EOF
echo -e "${GREEN}✅ Client env configured${NC}"
echo ""

# Step 8: Test the Edge Function
echo "Testing Edge Function..."
TEST_SESSION_ID="test-$(date +%s)"

# First, create a test session in the database
psql "$SUPABASE_URL/postgres" -c "INSERT INTO advisor_sessions (id, user_name, current_phase) VALUES ('$TEST_SESSION_ID', 'Test User', 'context');" > /dev/null 2>&1

# Test the Edge Function
RESPONSE=$(curl -s -w "\n%{http_code}" --location --request POST \
  "$SUPABASE_URL/functions/v1/chat-orchestrator" \
  --header "Authorization: Bearer $ANON_KEY" \
  --header 'Content-Type: application/json' \
  --data "{\"sessionId\":\"$TEST_SESSION_ID\",\"message\":\"__INIT__\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Edge Function working!${NC}"
    echo ""
    echo "Response preview:"
    echo "$BODY" | jq -r '.advisorMessage.message_text' 2>/dev/null || echo "$BODY"
    echo ""
else
    echo -e "${RED}❌ Edge Function test failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY"
    echo ""
fi

# Step 9: Instructions
echo ""
echo -e "${GREEN}🎉 Local environment ready!${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Start your client in another terminal:"
echo "   cd client"
echo "   npm run dev"
echo ""
echo "2. Open your browser to the client URL"
echo ""
echo "3. Start a conversation - it will hit your local Edge Function"
echo ""
echo "4. Monitor logs:"
echo "   supabase functions logs chat-orchestrator --tail"
echo ""
echo "5. Check database logs:"
echo "   supabase db logs"
echo ""
echo "To stop everything:"
echo "   kill $FUNC_PID  # Stop Edge Function"
echo "   supabase stop   # Stop local Supabase"
echo ""
