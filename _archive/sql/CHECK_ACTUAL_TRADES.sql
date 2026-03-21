-- Check what's actually in the logs vs what happened

-- 1. Show all logged data
SELECT 
  display_name,
  decision_action,
  decision_pitch_id,
  decision_shares,
  decision_amount,
  decision_reasoning,
  execution_success,
  execution_error,
  execution_message
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE
ORDER BY display_name;

-- 2. Parse the execution_message to see actual trade amounts
SELECT 
  display_name,
  decision_shares,
  decision_amount,
  execution_message,
  -- Extract the dollar amount from message like "bought 8310.00 shares of Moderna (MRNA) for $199938.60 MTK"
  SUBSTRING(execution_message FROM '\$([0-9.]+)') as extracted_amount
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE
ORDER BY display_name;

-- 3. Check actual investments table
SELECT 
  utb.display_name,
  ui.pitch_id,
  pmd.ticker,
  ui.shares_owned,
  pmd.current_price,
  ui.shares_owned * pmd.current_price as current_value
FROM user_investments ui
JOIN user_token_balances utb ON ui.user_id = utb.user_id
LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
WHERE ui.shares_owned > 0
  AND utb.is_ai_investor = true
ORDER BY utb.display_name;
