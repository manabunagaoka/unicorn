-- Delete ManaMana account completely (December 2, 2025)
-- This removes the user from all tables after Supabase Auth deletion

-- Step 1: Find ManaMana's user_id
SELECT user_id, ai_nickname, available_tokens, is_ai_investor
FROM user_token_balances
WHERE ai_nickname = 'ManaMana' OR is_ai_investor = false;

-- Step 2: Delete ManaMana's transactions (if any)
DELETE FROM investment_transactions
WHERE user_id IN (
  SELECT user_id FROM user_token_balances 
  WHERE ai_nickname = 'ManaMana' OR is_ai_investor = false
);

-- Step 3: Delete ManaMana's holdings (if any)
DELETE FROM user_investments
WHERE user_id IN (
  SELECT user_id FROM user_token_balances 
  WHERE ai_nickname = 'ManaMana' OR is_ai_investor = false
);

-- Step 4: Delete ManaMana's trading logs (if any)
DELETE FROM ai_trading_logs
WHERE user_id IN (
  SELECT user_id FROM user_token_balances 
  WHERE ai_nickname = 'ManaMana' OR is_ai_investor = false
);

-- Step 5: Delete ManaMana from user_token_balances
DELETE FROM user_token_balances
WHERE ai_nickname = 'ManaMana' OR is_ai_investor = false;

-- Step 6: Verify deletion - should return no rows
SELECT user_id, ai_nickname, is_ai_investor
FROM user_token_balances
WHERE ai_nickname = 'ManaMana' OR is_ai_investor = false;

-- Step 7: Verify only 10 AI investors remain
SELECT COUNT(*) as total_ais, 
       COUNT(CASE WHEN is_active THEN 1 END) as active_ais
FROM user_token_balances
WHERE is_ai_investor = true;

-- Expected: 10 total AIs, 10 active
