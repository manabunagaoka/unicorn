-- Count how many trades each AI made
SELECT 
  display_name,
  COUNT(*) as number_of_trades,
  STRING_AGG(DISTINCT execution_message, ' | ') as all_trades
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE
GROUP BY display_name
ORDER BY number_of_trades DESC, display_name;

-- Show the timestamps to see if they ran at the same time or separately
SELECT 
  display_name,
  execution_message,
  created_at,
  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as est_time
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE
ORDER BY created_at, display_name;

-- Sum up what was ACTUALLY spent (from execution messages)
SELECT 
  display_name,
  SUM(CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC)) as total_spent
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE
  AND execution_success = true
GROUP BY display_name
ORDER BY display_name;

-- Total platform spend
SELECT 
  SUM(CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC)) as total_platform_spent,
  11000000.00 - SUM(CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC)) as expected_cash_remaining,
  (SELECT SUM(available_tokens) FROM user_token_balances) as actual_cash_remaining
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE
  AND execution_success = true;
