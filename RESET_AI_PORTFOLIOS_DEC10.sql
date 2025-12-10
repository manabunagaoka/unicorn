-- ============================================
-- RESET AI PORTFOLIOS TO $1M BASELINE - Dec 10, 2025
-- ============================================
-- Cleans up overspending damage from Dec 3-10
-- DO NOT RUN until fixes are deployed and tested!

-- Step 1: Backup current state
CREATE TABLE IF NOT EXISTS ai_portfolios_backup_dec10 AS
SELECT 
  utb.user_id,
  utb.display_name,
  utb.available_tokens,
  (SELECT SUM(current_value) FROM user_investments WHERE user_id = utb.user_id) as total_holdings,
  utb.available_tokens + (SELECT COALESCE(SUM(current_value), 0) FROM user_investments WHERE user_id = utb.user_id) as total_portfolio
FROM user_token_balances utb
WHERE is_ai_investor = true;

-- Verify backup
SELECT 
  'Backup verification' as status,
  COUNT(*) as ai_investors,
  SUM(total_portfolio) as total_value,
  (SUM(total_portfolio) - 11000000) as excess_money
FROM ai_portfolios_backup_dec10;

-- Step 2: Clear all AI holdings (investments)
DELETE FROM user_investments
WHERE user_id IN (
  SELECT user_id FROM user_token_balances WHERE is_ai_investor = true
);

-- Step 3: Archive corrupted trades (keep for analysis)
CREATE TABLE IF NOT EXISTS ai_trades_corrupted_dec3_dec10 AS
SELECT * FROM ai_trading_logs
WHERE created_at >= '2025-12-03'
  AND created_at < '2025-12-11'
  AND display_name IN (
    SELECT display_name FROM user_token_balances WHERE is_ai_investor = true
  );

-- Optional: Delete corrupted trades from main table
-- DELETE FROM ai_trading_logs WHERE id IN (SELECT id FROM ai_trades_corrupted_dec3_dec10);

-- Step 4: Archive corrupted transactions
CREATE TABLE IF NOT EXISTS investment_transactions_corrupted_dec3_dec10 AS
SELECT it.* FROM investment_transactions it
WHERE it.timestamp >= '2025-12-03'
  AND it.timestamp < '2025-12-11'
  AND it.user_id IN (
    SELECT user_id FROM user_token_balances WHERE is_ai_investor = true
  );

-- Optional: Delete corrupted transactions
-- DELETE FROM investment_transactions WHERE id IN (SELECT id FROM investment_transactions_corrupted_dec3_dec10);

-- Step 5: Reset all AI balances to exactly $1,000,000
UPDATE user_token_balances
SET 
  available_tokens = 1000000.00,
  total_tokens = 1000000.00
WHERE is_ai_investor = true;

-- Step 6: Verify reset
SELECT 
  display_name,
  available_tokens as cash,
  (SELECT COUNT(*) FROM user_investments WHERE user_id = utb.user_id AND shares_owned > 0) as positions,
  (SELECT SUM(current_value) FROM user_investments WHERE user_id = utb.user_id) as holdings
FROM user_token_balances utb
WHERE is_ai_investor = true
ORDER BY display_name;

-- Step 7: Verify platform totals
SELECT 
  'After Reset' as status,
  COUNT(*) as total_users,
  SUM(available_tokens) as total_cash,
  (SELECT SUM(current_value) FROM user_investments WHERE shares_owned > 0) as total_holdings,
  SUM(available_tokens) + (SELECT COALESCE(SUM(current_value), 0) FROM user_investments WHERE shares_owned > 0) as platform_total
FROM user_token_balances
WHERE is_ai_investor = true;

-- Expected result: platform_total should be exactly $11,000,000 (11 AIs × $1M each)

-- Step 8: Check if any corrupted data remains
SELECT 
  'Data Integrity Check' as check_name,
  COUNT(*) as issues
FROM user_token_balances utb
WHERE is_ai_investor = true
  AND (available_tokens != 1000000.00 OR total_tokens != 1000000.00)
UNION ALL
SELECT 
  'Lingering Holdings',
  COUNT(*)
FROM user_investments ui
WHERE ui.user_id IN (SELECT user_id FROM user_token_balances WHERE is_ai_investor = true)
  AND ui.shares_owned > 0;

-- If issues = 0 for both checks, reset successful!
