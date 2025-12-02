-- Check Super ManaMana's actual portfolio data

-- 1. Check balance record
SELECT 
  user_id,
  display_name,
  available_tokens as cash,
  total_tokens,
  total_invested
FROM user_token_balances
WHERE user_id = '274aa684-ece0-48c5-b54b-92da6e3ca306';

-- 2. Check holdings
SELECT 
  ui.pitch_id,
  p.company_name,
  p.ticker,
  ui.shares_owned,
  ui.avg_purchase_price,
  ui.total_invested,
  ui.current_value,
  pmd.current_price as latest_price
FROM user_investments ui
JOIN pitches p ON ui.pitch_id = p.id
LEFT JOIN pitch_market_data pmd ON p.id = pmd.pitch_id
WHERE ui.user_id = '274aa684-ece0-48c5-b54b-92da6e3ca306'
  AND ui.shares_owned > 0;

-- 3. Calculate total portfolio value
SELECT 
  utb.available_tokens as cash,
  COALESCE(SUM(ui.current_value), 0) as holdings_value,
  utb.available_tokens + COALESCE(SUM(ui.current_value), 0) as total_portfolio
FROM user_token_balances utb
LEFT JOIN user_investments ui ON utb.user_id = ui.user_id AND ui.shares_owned > 0
WHERE utb.user_id = '274aa684-ece0-48c5-b54b-92da6e3ca306'
GROUP BY utb.user_id, utb.available_tokens;
