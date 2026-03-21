-- Find all non-AI users to see the duplicate
SELECT 
  user_id, 
  user_email, 
  display_name,
  available_tokens,
  is_ai_investor,
  created_at
FROM user_token_balances
WHERE is_ai_investor = false
ORDER BY created_at;

-- This will show which user_id is which
