-- Check total platform value
SELECT 
  COUNT(*) as total_users,
  SUM(available_tokens) as total_cash,
  SUM(COALESCE(
    (SELECT SUM(ui.shares_owned * pmd.current_price)
     FROM user_investments ui
     LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
     WHERE ui.user_id = utb.user_id
     AND ui.shares_owned > 0), 0
  )) as total_holdings,
  SUM(available_tokens) + SUM(COALESCE(
    (SELECT SUM(ui.shares_owned * pmd.current_price)
     FROM user_investments ui
     LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
     WHERE ui.user_id = utb.user_id
     AND ui.shares_owned > 0), 0
  )) as total_platform_value
FROM user_token_balances utb;

-- Break down by user type
SELECT 
  is_ai_investor,
  COUNT(*) as users,
  SUM(available_tokens) as total_cash
FROM user_token_balances
GROUP BY is_ai_investor;
