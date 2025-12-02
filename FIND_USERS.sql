-- Find all users to identify which one to keep
SELECT 
  user_id, 
  ai_nickname, 
  is_ai_investor,
  available_tokens,
  created_at
FROM user_token_balances
ORDER BY created_at;

-- This will show you which user_id is your super admin vs ManaMana
-- Then we can delete only the specific ManaMana user_id
