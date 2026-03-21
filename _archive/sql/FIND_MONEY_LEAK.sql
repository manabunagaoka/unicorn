-- Detailed investigation: Where did the extra $5,015.37 come from?

-- 1. Show each AI investor's trade with balance changes
SELECT 
  display_name,
  decision_action,
  cash_before,
  decision_shares,
  decision_amount as cost_calculated,
  cash_after,
  (cash_before - cash_after) as actual_deducted,
  (decision_amount - (cash_before - cash_after)) as discrepancy,
  execution_success,
  execution_message
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE
ORDER BY display_name;

-- 2. Check if cash_after was properly updated in user_token_balances
SELECT 
  utb.display_name,
  utb.available_tokens as current_cash,
  atl.cash_after as logged_cash_after,
  (utb.available_tokens - atl.cash_after) as difference
FROM user_token_balances utb
JOIN ai_trading_logs atl ON utb.user_id = atl.user_id
WHERE atl.created_at >= CURRENT_DATE
  AND utb.is_ai_investor = true
ORDER BY difference DESC;

-- 3. Sum up all the discrepancies
SELECT 
  SUM(cash_before - decision_amount) as expected_total_cash_after,
  SUM(cash_after) as actual_total_cash_after,
  SUM(cash_after) - SUM(cash_before - decision_amount) as total_discrepancy
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE
  AND execution_success = true;

-- 4. Check individual user balances vs what they should be
SELECT 
  utb.display_name,
  utb.available_tokens as current_cash,
  1000000 - COALESCE(atl.decision_amount, 0) as expected_cash,
  utb.available_tokens - (1000000 - COALESCE(atl.decision_amount, 0)) as overpaid
FROM user_token_balances utb
LEFT JOIN ai_trading_logs atl ON utb.user_id = atl.user_id AND atl.created_at >= CURRENT_DATE
WHERE utb.is_ai_investor = true
ORDER BY overpaid DESC;
