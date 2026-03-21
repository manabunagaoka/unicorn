-- Simplified check: Find the exact discrepancy

-- 1. Show each trade's math
SELECT 
  display_name,
  decision_shares,
  decision_amount as ai_calculated_cost,
  cash_before,
  cash_after,
  (cash_before - cash_after) as actual_charged,
  ROUND(decision_amount - (cash_before - cash_after), 2) as leak_per_trade,
  execution_message
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE
ORDER BY display_name;

-- 2. Sum the total leak
SELECT 
  COUNT(*) as total_trades,
  SUM(decision_amount) as total_ai_calculated,
  SUM(cash_before - cash_after) as total_actually_charged,
  SUM(decision_amount - (cash_before - cash_after)) as total_leak
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE
  AND execution_success = true;

-- 3. Expected vs actual platform state
SELECT 
  'Expected (AI calculated)' as scenario,
  SUM(decision_amount) as total_invested,
  11000000.00 - SUM(decision_amount) as expected_cash_remaining
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE

UNION ALL

SELECT 
  'Actual (Database)' as scenario,
  (SELECT SUM(
    (SELECT COALESCE(SUM(ui.shares_owned * pmd.current_price), 0)
     FROM user_investments ui
     LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
     WHERE ui.user_id = utb.user_id AND ui.shares_owned > 0)
  ) FROM user_token_balances utb) as total_invested,
  (SELECT SUM(available_tokens) FROM user_token_balances) as actual_cash_remaining;
