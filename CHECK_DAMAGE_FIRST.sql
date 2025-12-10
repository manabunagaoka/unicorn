-- Quick Status Check - What's the damage?
-- Run this first to see current state before reset

-- 1. How much money exists vs should exist?
SELECT 
  'PLATFORM DAMAGE REPORT' as report,
  COUNT(*) as ai_investors,
  SUM(available_tokens) as total_cash,
  (SELECT SUM(current_value) FROM user_investments WHERE user_id IN (SELECT user_id FROM user_token_balances WHERE is_ai_investor = true)) as total_holdings,
  SUM(available_tokens) + (SELECT COALESCE(SUM(current_value), 0) FROM user_investments WHERE user_id IN (SELECT user_id FROM user_token_balances WHERE is_ai_investor = true)) as platform_total,
  11000000.00 as should_be,
  (SUM(available_tokens) + (SELECT COALESCE(SUM(current_value), 0) FROM user_investments WHERE user_id IN (SELECT user_id FROM user_token_balances WHERE is_ai_investor = true))) - 11000000.00 as excess_money,
  ((SUM(available_tokens) + (SELECT COALESCE(SUM(current_value), 0) FROM user_investments WHERE user_id IN (SELECT user_id FROM user_token_balances WHERE is_ai_investor = true))) / 11000000.00 - 1) * 100 as percent_inflation
FROM user_token_balances
WHERE is_ai_investor = true;

-- 2. Who are the worst offenders?
SELECT 
  display_name,
  available_tokens as cash,
  (SELECT SUM(current_value) FROM user_investments ui WHERE ui.user_id = utb.user_id) as holdings,
  available_tokens + (SELECT COALESCE(SUM(current_value), 0) FROM user_investments ui WHERE ui.user_id = utb.user_id) as total_portfolio,
  (available_tokens + (SELECT COALESCE(SUM(current_value), 0) FROM user_investments ui WHERE ui.user_id = utb.user_id)) - 1000000.00 as excess_over_1M,
  (SELECT COUNT(*) FROM user_investments ui WHERE ui.user_id = utb.user_id AND ui.shares_owned > 0) as num_positions
FROM user_token_balances utb
WHERE is_ai_investor = true
ORDER BY total_portfolio DESC;
