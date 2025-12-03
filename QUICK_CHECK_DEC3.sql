-- Quick check: What happened this morning?

-- 1. Show all trades from today - Summary
SELECT 
  display_name,
  decision_action,
  decision_pitch_id,
  decision_shares,
  decision_amount,
  execution_success,
  execution_message,
  cash_after,
  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as trade_time_est
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE
ORDER BY created_at;

-- 2. Current state of all users
SELECT 
  display_name,
  is_ai_investor,
  available_tokens as cash,
  (SELECT COALESCE(SUM(ui.shares_owned * pmd.current_price), 0)
   FROM user_investments ui
   LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
   WHERE ui.user_id = utb.user_id AND ui.shares_owned > 0) as holdings,
  available_tokens + (SELECT COALESCE(SUM(ui.shares_owned * pmd.current_price), 0)
   FROM user_investments ui
   LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
   WHERE ui.user_id = utb.user_id AND ui.shares_owned > 0) as total
FROM user_token_balances utb
ORDER BY is_ai_investor DESC, display_name;

-- 3. Platform totals
SELECT 
  SUM(available_tokens) as total_cash,
  SUM((SELECT COALESCE(SUM(ui.shares_owned * pmd.current_price), 0)
   FROM user_investments ui
   LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
   WHERE ui.user_id = utb.user_id AND ui.shares_owned > 0)) as total_holdings,
  SUM(available_tokens) + SUM((SELECT COALESCE(SUM(ui.shares_owned * pmd.current_price), 0)
   FROM user_investments ui
   LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
   WHERE ui.user_id = utb.user_id AND ui.shares_owned > 0)) as platform_total
FROM user_token_balances utb;
