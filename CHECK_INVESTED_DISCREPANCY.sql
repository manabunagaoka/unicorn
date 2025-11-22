-- Check balance total_invested vs sum of investments
SELECT 
  (SELECT total_invested FROM user_token_balances WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85') as balance_total_invested,
  (SELECT SUM(total_invested) FROM user_investments WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85' AND shares_owned > 0) as sum_investments_total_invested,
  (SELECT total_invested FROM user_token_balances WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85') - 
  (SELECT SUM(total_invested) FROM user_investments WHERE user_id = '19be07bc-28d0-4ac6-956b-714eef1ccc85' AND shares_owned > 0) as difference;
