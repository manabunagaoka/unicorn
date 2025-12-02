-- Rename ai_nickname to display_name for clarity (December 2, 2025)
-- This makes it clear the field is for public display, not just AI nicknames

-- Step 1: Rename the column in user_token_balances
ALTER TABLE user_token_balances 
RENAME COLUMN ai_nickname TO display_name;

-- Step 2: Rename in ai_trading_logs
ALTER TABLE ai_trading_logs 
RENAME COLUMN ai_nickname TO display_name;

-- Step 3: Update any views that reference ai_nickname
-- Check if ai_readable_pitches or other views use this field
-- (Run SELECT queries to find any dependencies first)

-- Step 4: Verify the rename worked
SELECT 
  user_id,
  display_name,
  user_email,
  is_ai_investor,
  available_tokens
FROM user_token_balances
ORDER BY is_ai_investor DESC, display_name;

-- Step 5: Check AI trading logs
SELECT 
  display_name,
  decision_action,
  success
FROM ai_trading_logs
ORDER BY execution_timestamp DESC
LIMIT 5;

-- Expected: All queries work with display_name instead of ai_nickname
