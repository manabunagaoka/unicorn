-- Complete 48-hour analysis

-- 1. Show ALL trades by The Oracle (with extracted amounts)
SELECT 
  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as trade_time,
  execution_success,
  CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC) as trade_amount,
  cash_before,
  execution_message
FROM ai_trading_logs
WHERE display_name = 'The Oracle'
  AND created_at >= NOW() - INTERVAL '48 hours'
ORDER BY created_at;

-- 2. Sum of what The Oracle actually spent (successful trades only)
SELECT 
  'The Oracle Total Spending' as report,
  COUNT(*) as total_trades,
  SUM(CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC)) as total_logged_spend,
  1000000.00 - (SELECT available_tokens FROM user_token_balances WHERE display_name = 'The Oracle') as actual_cash_spent
FROM ai_trading_logs
WHERE display_name = 'The Oracle'
  AND created_at >= NOW() - INTERVAL '48 hours'
  AND execution_success = true;

-- 3. Platform-wide: When did crons run?
SELECT 
  DATE_TRUNC('minute', created_at) AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as est_time,
  COUNT(*) as trades,
  COUNT(DISTINCT display_name) as investors,
  STRING_AGG(DISTINCT display_name, ', ' ORDER BY display_name) as who_traded
FROM ai_trading_logs
WHERE created_at >= NOW() - INTERVAL '48 hours'
GROUP BY DATE_TRUNC('minute', created_at)
ORDER BY DATE_TRUNC('minute', created_at) DESC;

-- 4. Current state summary - all AIs
SELECT 
  display_name,
  available_tokens as cash,
  (SELECT COALESCE(SUM(current_value), 0)
   FROM user_investments ui
   WHERE ui.user_id = utb.user_id) as holdings,
  available_tokens + (SELECT COALESCE(SUM(current_value), 0)
   FROM user_investments ui
   WHERE ui.user_id = utb.user_id) as total,
  CASE 
    WHEN available_tokens + (SELECT COALESCE(SUM(current_value), 0) FROM user_investments ui WHERE ui.user_id = utb.user_id) > 1000000 
    THEN 'GAINED'
    WHEN available_tokens + (SELECT COALESCE(SUM(current_value), 0) FROM user_investments ui WHERE ui.user_id = utb.user_id) < 1000000
    THEN 'LOST'
    ELSE 'FLAT'
  END as status
FROM user_token_balances utb
WHERE is_ai_investor = true
ORDER BY total DESC;
