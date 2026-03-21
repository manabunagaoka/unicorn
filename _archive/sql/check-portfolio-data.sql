-- Check user's current data
SELECT 
  'BALANCE' as source,
  available_tokens as cash,
  0 as holdings,
  available_tokens as total,
  total_invested,
  updated_at
FROM user_token_balances
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85'

UNION ALL

-- Calculate holdings from investments
SELECT 
  'INVESTMENTS' as source,
  0 as cash,
  SUM(CASE 
    WHEN pitch_id = 1 THEN shares_owned * 618.0  -- META current price estimate
    WHEN pitch_id = 2 THEN shares_owned * 496.0  -- MSFT
    WHEN pitch_id = 3 THEN shares_owned * 30.87  -- DBX
    WHEN pitch_id = 4 THEN shares_owned * 83.74  -- AKAM
    WHEN pitch_id = 5 THEN shares_owned * 194.58 -- RDDT
    WHEN pitch_id = 6 THEN shares_owned * 17.22  -- WRBY
    WHEN pitch_id = 7 THEN shares_owned * 4940.0 -- BKNG
    ELSE 0
  END)::integer as holdings,
  0 as total,
  SUM(total_invested)::integer as total_invested,
  MAX(updated_at) as updated_at
FROM user_investments
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85'
  AND shares_owned > 0;

-- Show all active investments
SELECT 
  pitch_id,
  shares_owned,
  total_invested,
  avg_purchase_price,
  updated_at
FROM user_investments
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85'
  AND shares_owned > 0
ORDER BY pitch_id;
