-- Delete the duplicate account without display_name
-- Keep the Super ManaMana account (a674a31b-d598-4fea-a755-d07c7c3f850b)

-- Step 1: Delete any transactions from the duplicate
DELETE FROM investment_transactions
WHERE user_id = '274aa684-ece0-48c5-b54b-92da6e3ca306';

-- Step 2: Delete any holdings from the duplicate
DELETE FROM user_investments
WHERE user_id = '274aa684-ece0-48c5-b54b-92da6e3ca306';

-- Step 3: Delete any trading logs from the duplicate
DELETE FROM ai_trading_logs
WHERE user_id = '274aa684-ece0-48c5-b54b-92da6e3ca306';

-- Step 4: Delete the duplicate account
DELETE FROM user_token_balances
WHERE user_id = '274aa684-ece0-48c5-b54b-92da6e3ca306';

-- Step 5: Verify only one account remains
SELECT user_id, user_email, display_name, available_tokens
FROM user_token_balances
WHERE user_email = 'registration@manaboodle.com';

-- Expected: Only Super ManaMana account (a674a31b...)
