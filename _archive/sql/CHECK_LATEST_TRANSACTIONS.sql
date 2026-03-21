-- Show latest transactions
SELECT 
  id,
  pitch_id,
  transaction_type,
  shares,
  price_per_share,
  total_amount,
  timestamp,
  CASE 
    WHEN pitch_id = 1 THEN 'META'
    WHEN pitch_id = 3 THEN 'ABNB'
    WHEN pitch_id = 5 THEN 'GRAB'
    WHEN pitch_id = 8 THEN 'AFRM'
    WHEN pitch_id = 9 THEN 'PTON'
    WHEN pitch_id = 10 THEN 'ASAN'
    WHEN pitch_id = 13 THEN 'KIND'
    WHEN pitch_id = 14 THEN 'RENT'
  END as ticker,
  price_per_share - total_amount as amount_lost_to_floor
FROM investment_transactions
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85'
ORDER BY timestamp DESC
LIMIT 10;

-- Calculate net from ALL transactions
SELECT 
  1000000 as starting_balance,
  COALESCE(SUM(CASE WHEN transaction_type = 'BUY' THEN -total_amount ELSE total_amount END), 0) as net_change,
  1000000 + COALESCE(SUM(CASE WHEN transaction_type = 'BUY' THEN -total_amount ELSE total_amount END), 0) as calculated_balance
FROM investment_transactions
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85';
