-- Quick check: What does The Oracle actually have right now?

SELECT 
  'The Oracle Current State' as report,
  available_tokens as cash,
  (SELECT SUM(total_invested) FROM user_investments WHERE user_id = utb.user_id AND shares_owned > 0) as total_invested,
  (SELECT SUM(current_value) FROM user_investments WHERE user_id = utb.user_id AND shares_owned > 0) as holdings_value,
  available_tokens + (SELECT SUM(current_value) FROM user_investments WHERE user_id = utb.user_id AND shares_owned > 0) as total_portfolio
FROM user_token_balances utb
WHERE display_name = 'The Oracle';

-- Check The Oracle's balance updates
SELECT 
  available_tokens,
  total_invested,
  updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as est_time
FROM user_token_balances
WHERE display_name = 'The Oracle';
