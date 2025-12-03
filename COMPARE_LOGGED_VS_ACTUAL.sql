-- Compare actual holdings to logged trades

-- 1. What trades were logged (by investor)
WITH logged_trades AS (
  SELECT 
    display_name,
    COUNT(*) as trades_logged,
    SUM(CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC)) as total_logged
  FROM ai_trading_logs
  WHERE created_at >= CURRENT_DATE
    AND execution_success = true
  GROUP BY display_name
),
-- 2. What's actually in their accounts
actual_state AS (
  SELECT 
    utb.display_name,
    utb.available_tokens as cash,
    COALESCE(SUM(ui.current_value), 0) as holdings_value,
    1000000.00 - utb.available_tokens as actual_spent
  FROM user_token_balances utb
  LEFT JOIN user_investments ui ON utb.user_id = ui.user_id AND ui.shares_owned > 0
  WHERE utb.is_ai_investor = true
  GROUP BY utb.user_id, utb.display_name, utb.available_tokens
)
SELECT 
  COALESCE(l.display_name, a.display_name) as investor,
  l.trades_logged,
  l.total_logged as logged_spent,
  a.actual_spent,
  a.cash as remaining_cash,
  a.holdings_value as current_holdings,
  (l.total_logged - a.actual_spent) as discrepancy
FROM logged_trades l
FULL OUTER JOIN actual_state a ON l.display_name = a.display_name
ORDER BY discrepancy DESC NULLS LAST;

-- 2. Check for duplicate timestamps (did cron run multiple times?)
SELECT 
  DATE_TRUNC('minute', created_at) as minute_bucket,
  COUNT(*) as trades_in_minute,
  COUNT(DISTINCT display_name) as unique_investors
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE
GROUP BY DATE_TRUNC('minute', created_at)
ORDER BY minute_bucket;
