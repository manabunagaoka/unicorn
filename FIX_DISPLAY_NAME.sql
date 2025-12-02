-- Update the newly created "registration" account to "Super ManaMana"
-- and delete the old manually created one

-- Step 1: Find the new account (should be most recent)
SELECT user_id, user_email, display_name, available_tokens, created_at
FROM user_token_balances
WHERE user_email = 'registration@manaboodle.com'
ORDER BY created_at DESC;

-- Step 2: Update the NEW account's display_name to "Super ManaMana"
UPDATE user_token_balances
SET display_name = 'Super ManaMana'
WHERE user_email = 'registration@manaboodle.com'
  AND display_name = 'registration';

-- Delete the OLD unused account (a674a31b - no trades, still at 1M)
DELETE FROM user_token_balances
WHERE user_id = 'a674a31b-d598-4fea-a755-d07c7c3f850b';

-- Verify only one account remains (274aa684 - the active one)
SELECT user_id, user_email, display_name, available_tokens
FROM user_token_balances
WHERE user_email = 'registration@manaboodle.com';

-- Expected: Only 274aa684-ece0-48c5-b54b-92da6e3ca306 with Super ManaMana
