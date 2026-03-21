-- Find duplicate investment records for the same user and pitch
SELECT 
  user_id,
  pitch_id,
  COUNT(*) as record_count,
  SUM(shares_owned) as total_shares,
  SUM(total_invested) as total_invested_sum,
  ARRAY_AGG(id) as investment_ids,
  ARRAY_AGG(shares_owned) as shares_list
FROM user_investments
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85'
  AND shares_owned > 0
GROUP BY user_id, pitch_id
HAVING COUNT(*) > 1;

-- Show all DBX investments for this user
SELECT 
  id,
  pitch_id,
  shares_owned,
  total_invested,
  avg_purchase_price,
  created_at,
  updated_at
FROM user_investments
WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85'
  AND pitch_id = 3
ORDER BY created_at;
