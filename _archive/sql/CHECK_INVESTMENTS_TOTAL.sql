-- Check what total_invested shows in investments table
SELECT 
  pitch_id,
  CASE 
    WHEN pitch_id = 3 THEN 'ABNB'
    WHEN pitch_id = 13 THEN 'KIND'
  END as ticker,
  shares_owned,
  total_invested,
  avg_purchase_price
FROM user_investments
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85'
AND shares_owned > 0;

-- What SHOULD total_invested be based on last BUY transactions?
-- ABNB: bought at 114.26
-- KIND: bought at 2.06
-- Expected sum: 116.32
