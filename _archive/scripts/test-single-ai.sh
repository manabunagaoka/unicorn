#!/bin/bash
# Test a single AI investor trade

echo "🧪 Testing Cloud Surfer AI trade..."
echo ""

curl -X POST http://localhost:3000/api/admin/ai-trading/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "ai_cloud",
    "adminToken": "admin_secret_manaboodle_2025"
  }' | jq '.'

echo ""
echo "✅ Test complete. Check output above for decision and result."
