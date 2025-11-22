-- Show the actual transaction details
SELECT 
  id,
  pitch_id,
  transaction_type,
  shares,
  price_per_share,
  total_amount,
  timestamp
FROM investment_transactions
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85'
ORDER BY timestamp DESC;
