-- COMPREHENSIVE INVESTIGATION: Dec 3-10 Trading Activity
-- Run each query separately and share results

-- === QUERY 1: Current Platform State ===
-- Shows total damage - how much money exists vs should exist
SELECT 
  'Platform Overview' as report,
  COUNT(*) as total_users,
  SUM(available_tokens) as total_cash,
  (SELECT SUM(current_value) FROM user_investments WHERE shares_owned > 0) as total_holdings,
  SUM(available_tokens) + (SELECT SUM(current_value) FROM user_investments WHERE shares_owned > 0) as platform_total,
  ((SUM(available_tokens) + (SELECT SUM(current_value) FROM user_investments WHERE shares_owned > 0)) - 11000000.00) as money_created,
  ((SUM(available_tokens) + (SELECT SUM(current_value) FROM user_investments WHERE shares_owned > 0)) / 11000000.00 - 1) * 100 as percent_inflation
FROM user_token_balances;

-- === QUERY 2: Individual AI Portfolios ===
-- See who overspent the most
SELECT 
  display_name,
  available_tokens as cash,
  (SELECT SUM(current_value) FROM user_investments ui WHERE ui.user_id = utb.user_id AND ui.shares_owned > 0) as holdings,
  available_tokens + (SELECT SUM(current_value) FROM user_investments ui WHERE ui.user_id = utb.user_id AND ui.shares_owned > 0) as total_portfolio,
  ((available_tokens + (SELECT SUM(current_value) FROM user_investments ui WHERE ui.user_id = utb.user_id AND ui.shares_owned > 0)) - 1000000.00) as excess_money,
  (SELECT COUNT(*) FROM user_investments ui WHERE ui.user_id = utb.user_id AND ui.shares_owned > 0) as num_positions
FROM user_token_balances utb
WHERE is_ai_investor = true
ORDER BY total_portfolio DESC;

-- === QUERY 3: Cron Execution History ===
-- When did crons run and how many trades per run?
SELECT 
  DATE_TRUNC('hour', created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST') as hour_est,
  DATE_TRUNC('minute', created_at) as exact_time_utc,
  COUNT(*) as trades,
  COUNT(DISTINCT display_name) as investors_traded,
  SUM(CASE WHEN execution_success THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN NOT execution_success THEN 1 ELSE 0 END) as failed
FROM ai_trading_logs
WHERE created_at >= '2025-12-03'
GROUP BY DATE_TRUNC('hour', created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST'), DATE_TRUNC('minute', created_at)
ORDER BY exact_time_utc DESC
LIMIT 50;

-- === QUERY 4: Trade Frequency by Day ===
-- How many cron runs per day?
SELECT 
  DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST') as trading_day,
  COUNT(DISTINCT DATE_TRUNC('minute', created_at)) as cron_runs,
  COUNT(*) as total_trades,
  COUNT(DISTINCT display_name) as unique_traders,
  STRING_AGG(DISTINCT TO_CHAR(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST', 'HH24:MI'), ', ' ORDER BY TO_CHAR(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST', 'HH24:MI')) as times_est
FROM ai_trading_logs
WHERE created_at >= '2025-12-03'
GROUP BY DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST')
ORDER BY trading_day DESC;

-- === QUERY 5: Price Data Investigation ===
-- Are all stocks showing $100/share?
SELECT 
  pitch_id,
  current_price,
  updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as last_update_est
FROM pitch_market_data
ORDER BY pitch_id;

-- === QUERY 6: Sample Trades - The Oracle ===
-- What did The Oracle buy and at what prices?
SELECT 
  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as trade_time_est,
  decision_shares as shares,
  execution_message,
  cash_before,
  execution_success
FROM ai_trading_logs
WHERE display_name = 'The Oracle'
  AND created_at >= '2025-12-03'
ORDER BY created_at
LIMIT 20;

-- === QUERY 7: Current Holdings Detail ===
-- What do AIs own and at what prices?
SELECT 
  utb.display_name,
  ui.pitch_id,
  ui.shares_owned,
  ui.avg_purchase_price,
  ui.total_invested,
  ui.current_value,
  ui.current_value / ui.shares_owned as current_price_calc
FROM user_investments ui
JOIN user_token_balances utb ON ui.user_id = utb.user_id
WHERE ui.shares_owned > 0
  AND utb.is_ai_investor = true
ORDER BY utb.display_name, ui.total_invested DESC;

-- === QUERY 8: Overspending Detection ===
-- Trades that exceeded available balance
SELECT 
  display_name,
  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as trade_time,
  cash_before,
  execution_message,
  CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC) as trade_cost,
  CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC) - cash_before as overspend_amount,
  execution_success
FROM ai_trading_logs
WHERE created_at >= '2025-12-03'
  AND execution_success = true
  AND cash_before IS NOT NULL
  AND execution_message LIKE '%bought%'
  AND CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC) > cash_before
ORDER BY overspend_amount DESC
LIMIT 20;

-- === QUERY 9: Trading Behavior Analysis ===
-- Did any AI ever SELL? Or only BUY?
SELECT 
  decision_action,
  COUNT(*) as trades,
  COUNT(DISTINCT display_name) as investors,
  SUM(CASE WHEN execution_success THEN 1 ELSE 0 END) as successful
FROM ai_trading_logs
WHERE created_at >= '2025-12-03'
GROUP BY decision_action
ORDER BY trades DESC;

-- === QUERY 10: Persona Behavior ===
-- What is each AI's trading pattern?
SELECT 
  display_name,
  ai_strategy,
  COUNT(*) as total_trades,
  COUNT(DISTINCT decision_pitch_id) as unique_stocks,
  SUM(CASE WHEN decision_action = 'BUY' THEN 1 ELSE 0 END) as buys,
  SUM(CASE WHEN decision_action = 'SELL' THEN 1 ELSE 0 END) as sells,
  SUM(CASE WHEN decision_action = 'HOLD' THEN 1 ELSE 0 END) as holds,
  STRING_AGG(DISTINCT decision_pitch_id::text, ',' ORDER BY decision_pitch_id::text) as stocks_traded
FROM ai_trading_logs
WHERE created_at >= '2025-12-03'
  AND execution_success = true
GROUP BY display_name, ai_strategy
ORDER BY total_trades DESC;
