-- Debug portfolio calculation discrepancy
-- Compare what Portfolio API sees vs what Leaderboard API sees

-- Your current state
SELECT 
  'BALANCE' as source,
  user_id,
  display_name,
  available_tokens as cash,
  updated_at
FROM user_token_balances
WHERE user_id = '274aa684-ece0-48c5-b54b-92da6e3ca306'

UNION ALL

SELECT 
  'INVESTMENT-' || pitch_id as source,
  user_id,
  pitch_id::text as display_name,
  shares_owned as cash,
  updated_at
FROM user_investments
WHERE user_id = '274aa684-ece0-48c5-b54b-92da6e3ca306'
AND shares_owned > 0
ORDER BY source;

-- Current prices from pitch_market_data
SELECT 
  pitch_id,
  current_price,
  updated_at
FROM pitch_market_data
WHERE pitch_id IN (1, 8)
ORDER BY pitch_id;

-- Full calculation breakdown
SELECT 
  utb.display_name,
  utb.available_tokens as cash,
  ui.pitch_id,
  ui.shares_owned,
  pmd.current_price,
  (ui.shares_owned * pmd.current_price) as position_value,
  utb.available_tokens + SUM(ui.shares_owned * pmd.current_price) OVER () as total_portfolio
FROM user_token_balances utb
LEFT JOIN user_investments ui ON ui.user_id = utb.user_id AND ui.shares_owned > 0
LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
WHERE utb.user_id = '274aa684-ece0-48c5-b54b-92da6e3ca306';
