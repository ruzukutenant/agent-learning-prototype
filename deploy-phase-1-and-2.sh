#!/bin/bash
# Complete Deployment Script for Phase 1 + Phase 2
# Run this script from the project root: ./deploy-phase-1-and-2.sh

set -e

# Colors for pretty output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo ""
echo -e "${BOLD}🚀 CoachMira Advisor - Phase 1 + 2 Deployment${NC}"
echo -e "${BOLD}================================================${NC}"
echo ""
echo "This script will deploy:"
echo "  • Phase 1: Backend Orchestration (Edge Function)"
echo "  • Phase 2: Modular Prompts (63% cost savings)"
echo ""

# Check if we're in the right directory
if [ ! -d "supabase/functions/chat-orchestrator" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root${NC}"
    echo "   cd /Users/abecrystal/Dev/new-advisor"
    echo "   ./deploy-phase-1-and-2.sh"
    exit 1
fi

# Step 1: Check Supabase CLI
echo -e "${BLUE}Step 1: Checking Supabase CLI...${NC}"
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "   Install with: npm install -g supabase"
    exit 1
fi
echo -e "${GREEN}✅ Supabase CLI found${NC}"
echo ""

# Step 2: Login
echo -e "${BLUE}Step 2: Supabase Login${NC}"
if supabase projects list &> /dev/null; then
    echo -e "${GREEN}✅ Already logged in${NC}"
else
    echo "Please login to Supabase..."
    echo "A browser window will open for authentication."
    echo ""
    supabase login
    echo -e "${GREEN}✅ Login successful${NC}"
fi
echo ""

# Step 3: Link Project
echo -e "${BLUE}Step 3: Link to Supabase Project${NC}"
if [ -f ".supabase/config.toml" ]; then
    echo -e "${GREEN}✅ Project already linked${NC}"
else
    echo "Please select your project from the list:"
    echo ""
    supabase link
    echo -e "${GREEN}✅ Project linked${NC}"
fi
echo ""

# Step 4: Set Secrets
echo -e "${BLUE}Step 4: Configure Edge Function Secrets${NC}"
echo ""
echo "You need to provide three secrets:"
echo ""

# ANTHROPIC_API_KEY
echo -e "${YELLOW}1. ANTHROPIC_API_KEY${NC}"
echo "   Get this from: https://console.anthropic.com/"
read -p "   Enter your Anthropic API key: " ANTHROPIC_KEY
if [ -z "$ANTHROPIC_KEY" ]; then
    echo -e "${RED}❌ API key cannot be empty${NC}"
    exit 1
fi
supabase secrets set ANTHROPIC_API_KEY="$ANTHROPIC_KEY"
echo -e "${GREEN}   ✅ ANTHROPIC_API_KEY set${NC}"
echo ""

# SERVICE_ROLE_KEY (can't use SUPABASE_ prefix - reserved by Supabase)
echo -e "${YELLOW}2. SERVICE_ROLE_KEY${NC}"
echo "   Get this from: Supabase Dashboard → Settings → API → service_role (secret)"
read -p "   Enter your service role key: " SERVICE_ROLE_KEY
if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Service role key cannot be empty${NC}"
    exit 1
fi
supabase secrets set SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
echo -e "${GREEN}   ✅ SERVICE_ROLE_KEY set${NC}"
echo ""

# PROJECT_URL (can't use SUPABASE_ prefix - reserved by Supabase)
echo -e "${YELLOW}3. PROJECT_URL${NC}"
echo "   Get this from: Supabase Dashboard → Settings → API → Project URL"
echo "   Format: https://xxxxxxxxxxxxx.supabase.co"
read -p "   Enter your Supabase URL: " PROJECT_URL
if [ -z "$PROJECT_URL" ]; then
    echo -e "${RED}❌ Supabase URL cannot be empty${NC}"
    exit 1
fi
supabase secrets set PROJECT_URL="$PROJECT_URL"
echo -e "${GREEN}   ✅ PROJECT_URL set${NC}"
echo ""

echo -e "${GREEN}✅ All secrets configured${NC}"
echo ""

# Step 5: Deploy Edge Function
echo -e "${BLUE}Step 5: Deploying Edge Function...${NC}"
cd supabase
supabase functions deploy chat-orchestrator

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Edge Function deployed successfully!${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi
cd ..
echo ""

# Step 6: Database Migration
echo -e "${BLUE}Step 6: Database Migration${NC}"
echo ""
echo "You need to run the database migration to create the orchestrator_logs table."
echo ""
echo "Choose your method:"
echo "  1) Run via psql (you'll need database password)"
echo "  2) Copy SQL to Supabase SQL Editor (manual)"
echo "  3) Skip for now (you can do this later)"
echo ""
read -p "Enter your choice (1/2/3): " MIGRATION_CHOICE

case $MIGRATION_CHOICE in
    1)
        echo ""
        echo "Extract your database host from the connection string in:"
        echo "Supabase Dashboard → Settings → Database → Connection string"
        echo ""
        read -p "Enter database host (db.xxxxx.supabase.co): " DB_HOST

        if [ -n "$DB_HOST" ]; then
            echo ""
            echo "Running migration..."
            psql -h "$DB_HOST" -U postgres -d postgres -f supabase/migrations/20241229_create_orchestrator_logs.sql

            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Migration completed${NC}"
            else
                echo -e "${YELLOW}⚠️  Migration failed - you can run it manually later${NC}"
            fi
        fi
        ;;
    2)
        echo ""
        echo -e "${YELLOW}Manual migration steps:${NC}"
        echo "1. Go to: Supabase Dashboard → SQL Editor"
        echo "2. Create a new query"
        echo "3. Copy the contents of: supabase/migrations/20241229_create_orchestrator_logs.sql"
        echo "4. Paste and run"
        echo ""
        read -p "Press Enter when you've completed this..."
        echo -e "${GREEN}✅ Migration noted${NC}"
        ;;
    3)
        echo -e "${YELLOW}⚠️  Skipping migration - remember to run it before testing!${NC}"
        ;;
esac
echo ""

# Step 7: Feature Flag Instructions
echo -e "${BLUE}Step 7: Enable Feature Flag${NC}"
echo ""
echo "To route traffic to the Edge Function, add this environment variable:"
echo ""
echo -e "${BOLD}VITE_USE_EDGE_FUNCTION=true${NC}"
echo ""
echo "Where to add it:"
echo ""
echo "  • Local testing: Add to .env file"
echo "  • Render: Dashboard → Environment → Add"
echo "  • Vercel: Dashboard → Settings → Environment Variables"
echo "  • Netlify: Dashboard → Site settings → Environment variables"
echo ""
echo "You also need these (should already be set):"
echo "  VITE_SUPABASE_URL=$SUPABASE_URL"
echo "  VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>"
echo ""
read -p "Press Enter when you've added the environment variable..."
echo ""

# Step 8: Summary & Next Steps
echo -e "${GREEN}${BOLD}🎉 Deployment Complete!${NC}"
echo ""
echo -e "${BOLD}What was deployed:${NC}"
echo "  ✅ Edge Function with modular prompts"
echo "  ✅ Secrets configured"
echo "  ✅ Database migration (if completed)"
echo "  ✅ Feature flag documented"
echo ""
echo -e "${BOLD}Next steps:${NC}"
echo ""
echo "1. ${BOLD}Redeploy your client${NC} (so it picks up VITE_USE_EDGE_FUNCTION=true)"
echo ""
echo "2. ${BOLD}Test the deployment:${NC}"
echo "   • Start a new conversation"
echo "   • Check browser console - should see requests to:"
echo "     $SUPABASE_URL/functions/v1/chat-orchestrator"
echo ""
echo "3. ${BOLD}Monitor logs:${NC}"
echo "   supabase functions logs chat-orchestrator --tail"
echo ""
echo "4. ${BOLD}Verify database logs:${NC}"
echo "   SELECT * FROM orchestrator_logs ORDER BY created_at DESC LIMIT 10;"
echo ""
echo "5. ${BOLD}Check cost savings:${NC}"
echo "   • Run a few conversations"
echo "   • Check Anthropic dashboard"
echo "   • Should see ~50% reduction in input tokens"
echo ""
echo -e "${BOLD}Rollback plan:${NC}"
echo "  If anything breaks, set: VITE_USE_EDGE_FUNCTION=false"
echo "  Traffic will instantly route back to Express endpoint"
echo ""
echo -e "${BOLD}Documentation:${NC}"
echo "  • DEPLOY_PHASE_1_AND_2.md - Full deployment guide"
echo "  • PHASE_1_IMPLEMENTATION_SUMMARY.md - What Phase 1 does"
echo "  • PHASE_2_IMPLEMENTATION_SUMMARY.md - What Phase 2 does"
echo ""
echo -e "${GREEN}Happy testing! 🚀${NC}"
echo ""
