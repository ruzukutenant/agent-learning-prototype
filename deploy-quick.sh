#!/bin/bash
# Quick deployment script for Phase 1 + 2

set -e

echo "🚀 Deploying Phase 1 + 2 (Backend Orchestration + Modular Prompts)"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "Install with: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"

# Check if logged in
if ! supabase projects list &> /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Not logged in to Supabase${NC}"
    echo "Running: supabase login"
    supabase login
fi

echo -e "${GREEN}✅ Logged in to Supabase${NC}"
echo ""

# Check for required secrets
echo "📋 Checking required secrets..."
echo ""
echo "You'll need:"
echo "  - ANTHROPIC_API_KEY"
echo "  - SUPABASE_SERVICE_ROLE_KEY (from your Supabase project settings)"
echo ""

read -p "Do you want to set secrets now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter ANTHROPIC_API_KEY: " ANTHROPIC_KEY
    supabase secrets set ANTHROPIC_API_KEY="$ANTHROPIC_KEY"

    read -p "Enter SUPABASE_SERVICE_ROLE_KEY: " SERVICE_ROLE_KEY
    supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"

    # Get SUPABASE_URL
    PROJECT_URL=$(supabase status 2>/dev/null | grep "API URL" | awk '{print $3}')
    if [ -z "$PROJECT_URL" ]; then
        read -p "Enter SUPABASE_URL (https://xxx.supabase.co): " PROJECT_URL
    fi
    supabase secrets set SUPABASE_URL="$PROJECT_URL"

    echo -e "${GREEN}✅ Secrets set${NC}"
fi

echo ""
echo "🔨 Deploying Edge Function..."
cd supabase
supabase functions deploy chat-orchestrator

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Edge Function deployed successfully!${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo ""
echo "📊 Next steps:"
echo ""
echo "1. Run database migration:"
echo "   psql -h db.YOUR_PROJECT.supabase.co -U postgres -d postgres \\"
echo "     -f supabase/migrations/20241229_create_orchestrator_logs.sql"
echo ""
echo "2. Enable feature flag in your environment:"
echo "   VITE_USE_EDGE_FUNCTION=true"
echo ""
echo "3. Test the deployment:"
echo "   - Start your app"
echo "   - Create a new conversation"
echo "   - Watch browser network tab (should hit Edge Function)"
echo ""
echo "4. Monitor logs:"
echo "   supabase functions logs chat-orchestrator --tail"
echo ""
echo "5. Verify cost savings:"
echo "   - Check Anthropic dashboard after a few conversations"
echo "   - Should see ~50% reduction in input tokens"
echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Rollback: Set VITE_USE_EDGE_FUNCTION=false if anything breaks"
