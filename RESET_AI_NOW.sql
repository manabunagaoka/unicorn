-- Reset AI investors to $1M with zero holdings

UPDATE user_token_balances
SET available_tokens = 1000000,
    total_tokens = 1000000,
    total_invested = 0,
    updated_at = NOW()
WHERE is_ai_investor = true;

DELETE FROM user_investments
WHERE user_id IN (
  SELECT user_id 
  FROM user_token_balances 
  WHERE is_ai_investor = true
);

-- Verify reset
SELECT 
  display_name,
  available_tokens as cash,
  is_ai_investor
FROM user_token_balances
WHERE is_ai_investor = true
ORDER BY display_name;
