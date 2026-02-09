#!/bin/bash
# Deployment script for Supabase Edge Functions

set -e

echo "🚀 Deploying CoachMira Advisor Edge Function..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install with: npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Run: supabase login"
    exit 1
fi

# Deploy the function
echo "📦 Deploying chat-orchestrator function..."
supabase functions deploy chat-orchestrator

# Check deployment status
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Run the database migration: psql -h db.YOUR_PROJECT.supabase.co -U postgres -d postgres -f migrations/20241229_create_orchestrator_logs.sql"
echo "2. Set VITE_USE_EDGE_FUNCTION=true in your environment"
echo "3. Monitor logs: supabase functions logs chat-orchestrator"
echo ""
echo "Rollback: Set VITE_USE_EDGE_FUNCTION=false to route back to Express"
