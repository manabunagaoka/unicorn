-- Check ALL ai_trading_logs, not just today
SELECT 
  DATE(created_at) as trade_date,
  COUNT(*) as total_logs,
  COUNT(DISTINCT display_name) as unique_investors,
  SUM(CASE WHEN execution_success THEN 1 ELSE 0 END) as successful_trades
FROM ai_trading_logs
GROUP BY DATE(created_at)
ORDER BY trade_date DESC;

-- Show logs from last 3 days with details
SELECT 
  created_at,
  display_name,
  decision_action,
  execution_success,
  execution_message
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY created_at DESC;

-- Check when the last reset happened (when everyone was set to $1M)
SELECT 
  user_id,
  display_name,
  available_tokens,
  updated_at
FROM user_token_balances
WHERE is_ai_investor = true
ORDER BY updated_at DESC;
