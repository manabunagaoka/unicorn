-- ============================================
-- RESET AI PORTFOLIOS - December 11, 2025
-- ============================================
-- Resets all 11 AI investors to $1M cash, 0 holdings
-- Run this in Supabase SQL Editor

-- Step 1: Delete all AI holdings
DELETE FROM user_investments
WHERE user_id IN (
  SELECT user_id FROM user_token_balances WHERE is_ai_investor = true
);

-- Step 2: Reset all AI balances to $1,000,000
UPDATE user_token_balances
SET 
  available_tokens = 1000000.00,
  total_tokens = 1000000.00,
  total_invested = 0.00
WHERE is_ai_investor = true;

-- Step 3: Clear trading logs (optional - keeps history clean)
-- Uncomment if you want fresh logs:
-- DELETE FROM ai_trading_logs WHERE display_name IN (
--   SELECT display_name FROM user_token_balances WHERE is_ai_investor = true
-- );

-- Step 4: Clear AI transaction history (optional)
-- Uncomment if you want fresh transaction history:
-- DELETE FROM investment_transactions WHERE user_id IN (
--   SELECT user_id FROM user_token_balances WHERE is_ai_investor = true
-- );

-- Step 5: Verify reset worked
SELECT 
  display_name,
  available_tokens as cash,
  total_invested,
  (SELECT COUNT(*) FROM user_investments ui WHERE ui.user_id = utb.user_id AND ui.shares_owned > 0) as positions,
  (SELECT COALESCE(SUM(shares_owned), 0) FROM user_investments ui WHERE ui.user_id = utb.user_id) as total_shares
FROM user_token_balances utb
WHERE is_ai_investor = true
ORDER BY display_name;

-- Step 6: Platform totals check (AI only)
SELECT 
  'AI RESET COMPLETE' as status,
  COUNT(*) as ai_investors,
  SUM(available_tokens) as total_cash,
  11000000.00 as expected_total,
  CASE 
    WHEN SUM(available_tokens) = 11000000.00 THEN '✅ CORRECT'
    ELSE '❌ MISMATCH'
  END as verification
FROM user_token_balances
WHERE is_ai_investor = true;
