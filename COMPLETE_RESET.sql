-- COMPLETE RESET: Fresh start with $1,000,000
-- This will delete all your investments and transactions, reset balance to $1M

-- 1. Delete all investments
DELETE FROM user_investments
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85';

-- 2. Delete all transaction history
DELETE FROM investment_transactions
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85';

-- 3. Reset balance to exactly $1,000,000
UPDATE user_token_balances
SET 
  total_tokens = 1000000.00,
  available_tokens = 1000000.00,
  total_invested = 0.00,
  updated_at = NOW()
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85';

-- 4. Verify the reset
SELECT 
  total_tokens,
  available_tokens,
  total_invested,
  created_at,
  updated_at
FROM user_token_balances
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85';

-- 5. Confirm no investments remain
SELECT COUNT(*) as remaining_investments
FROM user_investments
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85';

-- 6. Confirm no transactions remain
SELECT COUNT(*) as remaining_transactions
FROM investment_transactions
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85';
