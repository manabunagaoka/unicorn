-- Check your actual balance
SELECT 
  user_id,
  total_tokens,
  available_tokens,
  total_invested,
  created_at,
  updated_at
FROM user_token_balances
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85';

-- Check all your transactions
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

-- Calculate what balance SHOULD be
SELECT 
  1000000 as starting_balance,
  COALESCE(SUM(CASE WHEN transaction_type = 'BUY' THEN -total_amount ELSE total_amount END), 0) as net_transactions,
  1000000 + COALESCE(SUM(CASE WHEN transaction_type = 'BUY' THEN -total_amount ELSE total_amount END), 0) as should_be_balance
FROM investment_transactions
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85';
