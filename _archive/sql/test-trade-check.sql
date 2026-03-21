-- Check if any trades exist at all
SELECT COUNT(*) as total_trades FROM investment_transactions;

-- Check if any user investments exist
SELECT COUNT(*) as total_investments FROM user_investments WHERE shares_owned > 0;

-- Show last 10 trades
SELECT 
  it.user_id,
  it.transaction_type,
  it.shares,
  it.price_per_share,
  it.total_amount,
  it.timestamp,
  utb.username
FROM investment_transactions it
LEFT JOIN user_token_balances utb ON it.user_id = utb.user_id
ORDER BY it.timestamp DESC
LIMIT 10;

-- Show current holdings
SELECT 
  ui.user_id,
  ui.pitch_id,
  ui.shares_owned,
  ui.total_invested,
  ui.current_value,
  utb.username
FROM user_investments ui
LEFT JOIN user_token_balances utb ON ui.user_id = utb.user_id
WHERE ui.shares_owned > 0
ORDER BY ui.updated_at DESC
LIMIT 10;
