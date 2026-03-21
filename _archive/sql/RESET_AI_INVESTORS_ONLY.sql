-- Reset AI investors to $1M with zero holdings
-- This will clear their positions from today's trades

-- First, get list of AI investor user_ids
SELECT user_id, display_name, is_ai_investor 
FROM user_token_balances 
WHERE is_ai_investor = true;

-- Reset their balances to $1M
UPDATE user_token_balances
SET available_tokens = 1000000,
    total_tokens = 1000000,
    total_invested = 0,
    updated_at = NOW()
WHERE is_ai_investor = true;

-- Clear all their investment holdings
DELETE FROM user_investments
WHERE user_id IN (
  SELECT user_id 
  FROM user_token_balances 
  WHERE is_ai_investor = true
);

-- Verify reset
SELECT 
  utb.display_name,
  utb.available_tokens as cash,
  COUNT(ui.pitch_id) as positions,
  COALESCE(SUM(ui.shares_owned * pmd.current_price), 0) as holdings_value
FROM user_token_balances utb
LEFT JOIN user_investments ui ON ui.user_id = utb.user_id
LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
WHERE utb.is_ai_investor = true
GROUP BY utb.user_id, utb.display_name, utb.available_tokens
ORDER BY utb.display_name;
