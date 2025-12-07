-- SYSTEMATIC INVESTIGATION: Dec 3-4 Trading Activity

-- 1. All cron runs in last 48 hours
SELECT 
  DATE_TRUNC('minute', created_at) as cron_time,
  DATE_TRUNC('minute', created_at) AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as est_time,
  COUNT(*) as trades_executed,
  COUNT(DISTINCT display_name) as unique_traders,
  SUM(CASE WHEN execution_success THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN NOT execution_success THEN 1 ELSE 0 END) as failed
FROM ai_trading_logs
WHERE created_at >= NOW() - INTERVAL '48 hours'
GROUP BY DATE_TRUNC('minute', created_at)
ORDER BY cron_time DESC;

-- 2. The Oracle's complete trading history (last 48 hours)
SELECT 
  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as trade_time,
  execution_success,
  execution_message,
  decision_shares,
  cash_before,
  cash_after
FROM ai_trading_logs
WHERE display_name = 'The Oracle'
  AND created_at >= NOW() - INTERVAL '48 hours'
ORDER BY created_at;

-- 3. Current state of all AI investors
SELECT 
  display_name,
  available_tokens as cash,
  (SELECT COALESCE(SUM(current_value), 0)
   FROM user_investments ui
   WHERE ui.user_id = utb.user_id AND ui.shares_owned > 0) as holdings,
  available_tokens + (SELECT COALESCE(SUM(current_value), 0)
   FROM user_investments ui
   WHERE ui.user_id = utb.user_id AND ui.shares_owned > 0) as total_portfolio,
  1000000.00 - available_tokens as total_spent_from_1m
FROM user_token_balances utb
WHERE is_ai_investor = true
ORDER BY display_name;

-- 4. The Oracle's current holdings breakdown
SELECT 
  ui.pitch_id,
  ui.shares_owned,
  ui.avg_purchase_price,
  ui.total_invested,
  ui.current_value,
  ui.updated_at
FROM user_investments ui
JOIN user_token_balances utb ON ui.user_id = utb.user_id
WHERE utb.display_name = 'The Oracle'
  AND ui.shares_owned > 0
ORDER BY ui.pitch_id;

-- 5. Check for overspending - trades that exceeded balance
SELECT 
  display_name,
  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as trade_time,
  cash_before,
  CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC) as attempted_amount,
  CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC) - cash_before as overspend_amount,
  execution_success,
  execution_message
FROM ai_trading_logs
WHERE created_at >= NOW() - INTERVAL '48 hours'
  AND execution_success = true
  AND cash_before IS NOT NULL
  AND CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC) > cash_before
ORDER BY overspend_amount DESC;
