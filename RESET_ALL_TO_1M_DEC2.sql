-- Reset all users to $1,000,000 MTK (December 2, 2025)
-- Clean slate before next cron runs

-- Step 1: Delete all transactions
DELETE FROM investment_transactions;

-- Step 2: Delete all holdings
DELETE FROM user_investments;

-- Step 3: Delete all AI trading logs
DELETE FROM ai_trading_logs;

-- Step 4: Reset all balances to $1M
UPDATE user_token_balances
SET 
  available_tokens = 1000000,
  total_tokens = 1000000,
  total_invested = 0
WHERE user_id IS NOT NULL;

-- Step 5: Ensure all AIs are active
UPDATE user_token_balances
SET is_active = true
WHERE is_ai_investor = true;

-- Step 6: Verify reset
SELECT 
  ai_nickname,
  available_tokens as cash,
  total_tokens - available_tokens as invested,
  total_tokens as total,
  is_active
FROM user_token_balances
WHERE is_ai_investor = true
ORDER BY ai_nickname;

-- Step 7: Verify ManaMana (human user)
SELECT 
  ai_nickname,
  available_tokens as cash,
  total_tokens as total,
  is_active
FROM user_token_balances
WHERE is_ai_investor = false;

-- Expected results: Everyone at $1,000,000, zero positions, zero logs
