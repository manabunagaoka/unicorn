-- Check current investments total_invested
SELECT 
  pitch_id,
  CASE 
    WHEN pitch_id = 3 THEN 'ABNB'
    WHEN pitch_id = 13 THEN 'KIND'
  END as ticker,
  shares_owned,
  total_invested,
  avg_purchase_price,
  current_value
FROM user_investments
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85'
AND shares_owned > 0
ORDER BY pitch_id;

-- Show the actual BUY transactions for these stocks
SELECT 
  pitch_id,
  CASE 
    WHEN pitch_id = 3 THEN 'ABNB'
    WHEN pitch_id = 13 THEN 'KIND'
  END as ticker,
  transaction_type,
  shares,
  price_per_share,
  total_amount,
  timestamp
FROM investment_transactions
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85'
AND pitch_id IN (3, 13)
ORDER BY timestamp DESC;
