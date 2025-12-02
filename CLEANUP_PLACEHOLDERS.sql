-- Clean up all placeholder rows
DELETE FROM user_token_balances 
WHERE user_id IN ('YOUR_USER_ID_HERE', 'PASTE_YOUR_REAL_UUID_HERE');

-- STEP 1: Rename ai_nickname to display_name (do this BEFORE inserting new data)
ALTER TABLE user_token_balances RENAME COLUMN ai_nickname TO display_name;
ALTER TABLE ai_trading_logs RENAME COLUMN ai_nickname TO display_name;

-- STEP 2: Add your admin account with correct credentials
INSERT INTO user_token_balances (
  user_id,
  user_email,
  display_name,
  available_tokens,
  total_tokens,
  total_invested,
  is_ai_investor,
  is_active,
  created_at
) VALUES (
  'a674a31b-d598-4fea-a755-d07c7c3f850b',
  'registration@manaboodle.com',
  'Super ManaMana',
  1000000.00,
  1000000.00,
  0.00,
  false,
  true,
  NOW()
);

-- Verify: should show 11 total (10 AIs + 1 admin)
SELECT COUNT(*) as total_users FROM user_token_balances;

-- Verify your admin account
SELECT user_id, user_email, display_name, available_tokens, is_ai_investor
FROM user_token_balances
WHERE is_ai_investor = false;
