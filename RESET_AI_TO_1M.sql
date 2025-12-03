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

-- Verify all AI investors reset to $1M
SELECT 
  display_name,
  available_tokens as cash,
  total_tokens,
  (SELECT COUNT(*) FROM user_investments WHERE user_id = utb.user_id AND shares_owned > 0) as positions
FROM user_token_balances utb
WHERE is_ai_investor = true
ORDER BY display_name;
