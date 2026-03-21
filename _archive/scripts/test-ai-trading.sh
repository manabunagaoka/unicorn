#!/bin/bash

# Test AI Trading System
# This script manually triggers the AI trading endpoint

# Load environment variables
source .env.local 2>/dev/null || echo "Warning: .env.local not found"

# Get CRON_SECRET from environment or use a test value
CRON_SECRET=${CRON_SECRET:-"test-secret-123"}
API_URL=${API_URL:-"http://localhost:3000"}

echo "🤖 Testing AI Trading System..."
echo "📡 Endpoint: ${API_URL}/api/ai-trading/execute"
echo ""

# Make the request
response=$(curl -s -X POST \
  "${API_URL}/api/ai-trading/execute" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json")

# Pretty print the response
echo "📊 Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"

echo ""
echo "✅ Test complete!"
