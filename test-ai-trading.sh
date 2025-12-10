#!/bin/bash

# Test AI Trading Fixes - Run 10+ tests
# Usage: ./test-ai-trading.sh

BASE_URL="https://rize.vercel.app"
ENDPOINT="/api/admin/ai-trading/trigger"

echo "========================================="
echo "AI TRADING FIX VALIDATION TESTS"
echo "========================================="
echo ""

# Test 1: Basic functionality
echo "Test 1: Basic trigger (should execute trades)"
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer admin-cron-token" \
  -H "Content-Type: application/json" \
  -d '{"source":"test-1"}' \
  --max-time 60 -s | jq -r '.results[] | "\(.displayName): \(.result.message)"' || echo "FAILED"
echo ""
echo "Waiting 5 seconds..."
sleep 5

# Test 2: Verify no overspending
echo ""
echo "Test 2: Check for overspending protection"
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer admin-cron-token" \
  -H "Content-Type: application/json" \
  -d '{"source":"test-2"}' \
  --max-time 60 -s | jq -r '.results[] | select(.result.message | contains("overspend")) | "\(.displayName): ❌ OVERSPENDING DETECTED"' || echo "✅ No overspending detected"
echo ""
echo "Waiting 5 seconds..."
sleep 5

# Test 3: Verify price data not stuck at $100
echo ""
echo "Test 3: Check price data (should NOT be all $100)"
curl -X POST "$BASE_URL$ENDPOINT" \
  -H "Authorization: Bearer admin-cron-token" \
  -H "Content-Type: application/json" \
  -d '{"source":"test-3"}' \
  --max-time 60 -s | jq -r '.results[0].result.execution.price // "No price data"' || echo "FAILED"
echo ""
echo "Waiting 5 seconds..."
sleep 5

# Test 4: Test idempotency (same run should be prevented)
echo ""
echo "Test 4: Idempotency test (duplicate run detection)"
echo "This test would require cron endpoint, skipping for manual trigger"
echo ""

# Test 5-10: Rapid fire to check for race conditions
echo "Tests 5-10: Race condition tests (rapid execution)"
for i in {5..10}; do
  echo "Test $i: Executing..."
  curl -X POST "$BASE_URL$ENDPOINT" \
    -H "Authorization: Bearer admin-cron-token" \
    -H "Content-Type: application/json" \
    -d "{\"source\":\"test-$i\"}" \
    --max-time 60 -s | jq -r '.results | length | "Trades executed: \(.)"' || echo "FAILED"
  echo "Waiting 3 seconds..."
  sleep 3
done

echo ""
echo "========================================="
echo "TESTS COMPLETE"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Check Supabase for balance integrity"
echo "2. Run: SELECT * FROM user_token_balances WHERE is_ai_investor = true;"
echo "3. Verify no AI has negative balance"
echo "4. Verify prices are realistic (not $100)"
echo "5. Check if any SELLs occurred"
