-- FINAL SUMMARY: Current platform state (Dec 3 morning)

-- 1. Platform totals (should be $11M if everything is correct)
SELECT 
  'Platform Totals' as report,
  COUNT(*) as total_users,
  SUM(available_tokens) as total_cash,
  (SELECT SUM(current_value) FROM user_investments WHERE shares_owned > 0) as total_holdings_at_current_prices,
  SUM(available_tokens) + (SELECT SUM(current_value) FROM user_investments WHERE shares_owned > 0) as grand_total,
  (SUM(available_tokens) + (SELECT SUM(current_value) FROM user_investments WHERE shares_owned > 0)) - 11000000.00 as variance_from_11M
FROM user_token_balances;

-- 2. Each user's complete state
SELECT 
  utb.display_name,
  utb.is_ai_investor,
  utb.available_tokens as cash,
  COALESCE(SUM(ui.current_value), 0) as holdings_value,
  utb.available_tokens + COALESCE(SUM(ui.current_value), 0) as total_portfolio,
  (utb.available_tokens + COALESCE(SUM(ui.current_value), 0)) - 1000000.00 as variance_from_1M
FROM user_token_balances utb
LEFT JOIN user_investments ui ON utb.user_id = ui.user_id AND ui.shares_owned > 0
GROUP BY utb.user_id, utb.display_name, utb.is_ai_investor, utb.available_tokens
ORDER BY utb.is_ai_investor DESC, utb.display_name;

-- 3. Breakdown of holdings showing price movement risk
SELECT 
  utb.display_name,
  ui.pitch_id,
  ui.shares_owned,
  ui.avg_purchase_price as bought_at,
  ui.current_value / ui.shares_owned as current_price_in_db,
  ui.current_value as value_in_db,
  ui.shares_owned * ui.avg_purchase_price as cost_basis,
  ui.current_value - (ui.shares_owned * ui.avg_purchase_price) as unrealized_gain_loss
FROM user_investments ui
JOIN user_token_balances utb ON ui.user_id = utb.user_id
WHERE ui.shares_owned > 0
ORDER BY utb.display_name, ui.pitch_id;

-- 4. What the morning cron actually did
SELECT 
  display_name,
  execution_message,
  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as est_time
FROM ai_trading_logs
WHERE created_at >= '2025-12-03 14:30:00'::timestamp
  AND created_at < '2025-12-03 14:31:00'::timestamp
  AND execution_success = true
ORDER BY display_name;
