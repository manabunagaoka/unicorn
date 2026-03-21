#!/bin/bash

# AI Investor Testing Script
# Tests the manual trigger endpoint and displays results

echo "🤖 AI INVESTOR TESTING SYSTEM"
echo "================================"
echo ""

# Load environment
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check required env vars
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL not set"
    exit 1
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Get admin token (in production, use proper JWT)
ADMIN_TOKEN="test-admin-token-$(date +%s)"

echo "🎯 Step 1: Create ai_trading_logs table"
echo "   Please run this SQL in Supabase SQL Editor:"
echo "   File: /workspaces/rize/supabase/create_ai_trading_logs.sql"
echo ""
read -p "   Press Enter after running the SQL..."
echo ""

echo "🚀 Step 2: Testing AI Trading Trigger API"
echo ""

# Test with all AIs
echo "   Testing ALL AI investors..."
RESPONSE=$(curl -s -X POST \
  http://localhost:3000/api/admin/ai-trading/trigger \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

if [ $? -eq 0 ]; then
    echo "✅ API call successful"
    echo ""
    echo "📊 Results:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo "❌ API call failed"
    exit 1
fi

echo ""
echo "✅ Testing complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Review the results above"
echo "   2. Check ai_trading_logs table in Supabase"
echo "   3. Open admin panel to view AI details"
echo "   4. Test individual AIs if needed"
echo ""
