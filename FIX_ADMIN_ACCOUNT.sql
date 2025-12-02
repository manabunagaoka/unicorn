-- Fix: Delete bad placeholder row and insert correct admin account

-- Step 1: Delete the placeholder row
DELETE FROM user_token_balances 
WHERE user_id = 'YOUR_USER_ID_HERE';

-- Step 2: Get your real user_id from Supabase Auth
-- Go to: Supabase Dashboard > Authentication > Users
-- Find your logged-in account and copy the user_id (UUID) and email

-- Step 3: Insert with REAL values (replace both placeholders below):
INSERT INTO user_token_balances (
  user_id,
  user_email,
  ai_nickname,
  available_tokens,
  total_tokens,
  total_invested,
  is_ai_investor,
  is_active,
  created_at
) VALUES (
  'PASTE_YOUR_REAL_UUID_HERE',      -- Example: 'a84d04e3-aa31-4f3d-8cfc-e8630d7108b6'
  'PASTE_YOUR_REAL_EMAIL_HERE',     -- Example: 'your@email.com'
  'Admin',
  1000000.00,
  1000000.00,
  0.00,
  false,
  true,
  NOW()
);

-- Step 4: Verify
SELECT user_id, user_email, ai_nickname, available_tokens, is_ai_investor
FROM user_token_balances
WHERE is_ai_investor = false;
