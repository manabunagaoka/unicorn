-- COMPLETE PORTFOLIO RESET - December 1, 2025
-- Resets ALL investors (AI + humans) to $1M MTK, zero positions
-- Use this to start fresh and test AI cron trading naturally

BEGIN;

-- Step 1: Delete ALL investment transactions (AI + humans)
DELETE FROM investment_transactions;

-- Step 2: Delete ALL holdings (AI + humans)
DELETE FROM user_investments;

-- Step 3: Delete ALL AI trading logs (clean slate)
DELETE FROM ai_trading_logs;

-- Step 4: Reset ALL user balances to $1M
UPDATE user_token_balances
SET 
  available_tokens = 1000000,
  total_tokens = 1000000,
  updated_at = NOW()
WHERE user_id IS NOT NULL;

-- Step 5: Ensure all AIs are active (ready for cron)
UPDATE user_token_balances
SET is_active = true
WHERE is_ai_investor = true;

COMMIT;

-- Verification queries (run after reset):
-- Check all balances are $1M
SELECT 
  user_id,
  COALESCE(ai_nickname, 'ManaMana (human)') as investor_name,
  is_ai_investor,
  is_active,
  available_tokens as cash,
  total_tokens - available_tokens as invested,
  total_tokens as total
FROM user_token_balances
ORDER BY is_ai_investor DESC, ai_nickname;

-- Verify zero holdings
SELECT COUNT(*) as holdings_count FROM user_investments;
-- Should return: 0

-- Verify zero transactions
SELECT COUNT(*) as transaction_count FROM investment_transactions;
-- Should return: 0

-- Verify zero AI logs
SELECT COUNT(*) as ai_log_count FROM ai_trading_logs;
-- Should return: 0

-- Next AI cron runs (EST):
-- Tomorrow (Dec 2): 9:30 AM EST (14:30 UTC)
-- Tomorrow (Dec 2): 3:30 PM EST (20:30 UTC)
