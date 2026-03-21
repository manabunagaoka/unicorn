-- Reset balance to exactly $1,000,000.00
-- Current: $1,000,001.35 (Cash: $999,885.03 + Holdings: $116.32)
-- Need to deduct: $1.35 from available_tokens

UPDATE user_token_balances
SET 
  available_tokens = available_tokens - 1.35,
  total_tokens = total_tokens - 1.35,
  updated_at = NOW()
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85';

-- Verify the result
SELECT 
  total_tokens,
  available_tokens,
  total_invested,
  available_tokens + total_invested as portfolio_value
FROM user_token_balances
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85';
