-- Get actual holdings with proper columns
SELECT 
  utb.display_name,
  ui.pitch_id,
  ui.shares_owned,
  ui.avg_purchase_price,
  ui.current_value
FROM user_investments ui
JOIN user_token_balances utb ON ui.user_id = utb.user_id
WHERE ui.shares_owned > 0
  AND utb.is_ai_investor = true
ORDER BY utb.display_name;

-- Sum total holdings value
SELECT 
  SUM(current_value) as total_holdings_value
FROM user_investments
WHERE shares_owned > 0;

-- Check extracted amounts from execution messages
SELECT 
  display_name,
  execution_message,
  CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC) as trade_amount
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE
  AND execution_success = true
ORDER BY display_name;
