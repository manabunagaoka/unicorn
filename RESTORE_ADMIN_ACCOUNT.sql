-- Restore super admin to compete leaderboard (December 2, 2025)
-- This adds your logged-in auth user back to user_token_balances

-- First, check Supabase Auth to get your user_id
-- Go to: Authentication > Users in Supabase Dashboard
-- Copy your user_id (UUID format)

-- Then run this, replacing the placeholders:
-- YOUR_USER_ID_HERE = your UUID from Supabase Auth > Users
-- YOUR_EMAIL_HERE = your email address from Supabase Auth > Users

INSERT INTO user_token_balances (
  user_id,
  user_email,
  ai_nickname,
  available_tokens,
  total_tokens,
  total_invested,
  is_ai_investor,
  is_active,
  ai_strategy,
  ai_catchphrase,
  created_at
) VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with your actual user_id from Auth
  'YOUR_EMAIL_HERE',    -- Replace with your email from Auth
  'Admin',              -- Or whatever nickname you want
  1000000.00,           -- Starting balance
  1000000.00,           -- Total tokens
  0.00,                 -- No investments yet
  false,                -- Not an AI investor
  true,                 -- Active account
  NULL,                 -- No AI strategy (human)
  NULL,                 -- No AI catchphrase (human)
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  user_email = 'YOUR_EMAIL_HERE',
  available_tokens = 1000000.00,
  total_tokens = 1000000.00,
  total_invested = 0.00,
  is_active = true;

-- Verify your account is back
SELECT user_id, ai_nickname, available_tokens, is_ai_investor
FROM user_token_balances
WHERE is_ai_investor = false;

-- Expected: 1 row showing your admin account
