-- Investigation: Dec 3 Morning Cron Run
-- Check for data integrity issues and discrepancies

-- 1. Check AI trading logs from this morning (9:30 AM EST = 14:30 UTC)
SELECT 
  id,
  display_name,
  action,
  ticker,
  shares,
  price_per_share,
  total_cost,
  balance_before,
  balance_after,
  reasoning,
  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as trade_time_est
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;

-- 2. Check current platform state
SELECT 
  COUNT(*) as total_users,
  SUM(available_tokens) as total_cash,
  SUM(COALESCE(
    (SELECT SUM(ui.shares_owned * pmd.current_price)
     FROM user_investments ui
     LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
     WHERE ui.user_id = utb.user_id
     AND ui.shares_owned > 0), 0
  )) as total_holdings_value,
  SUM(available_tokens) + SUM(COALESCE(
    (SELECT SUM(ui.shares_owned * pmd.current_price)
     FROM user_investments ui
     LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
     WHERE ui.user_id = utb.user_id
     AND ui.shares_owned > 0), 0
  )) as total_platform_value
FROM user_token_balances utb;

-- 3. Check each user's calculated portfolio vs balance
SELECT 
  utb.user_id,
  utb.display_name,
  utb.is_ai_investor,
  utb.available_tokens as cash,
  COALESCE(
    (SELECT SUM(ui.shares_owned * pmd.current_price)
     FROM user_investments ui
     LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
     WHERE ui.user_id = utb.user_id
     AND ui.shares_owned > 0), 0
  ) as holdings_value,
  utb.available_tokens + COALESCE(
    (SELECT SUM(ui.shares_owned * pmd.current_price)
     FROM user_investments ui
     LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
     WHERE ui.user_id = utb.user_id
     AND ui.shares_owned > 0), 0
  ) as total_portfolio,
  -- Check if differs from $1M
  ABS((utb.available_tokens + COALESCE(
    (SELECT SUM(ui.shares_owned * pmd.current_price)
     FROM user_investments ui
     LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
     WHERE ui.user_id = utb.user_id
     AND ui.shares_owned > 0), 0
  )) - 1000000) as deviation_from_1m
FROM user_token_balances utb
ORDER BY is_ai_investor DESC, display_name;

-- 4. Check all current holdings
SELECT 
  utb.display_name,
  utb.is_ai_investor,
  ui.pitch_id,
  sp.company_name,
  pmd.ticker,
  ui.shares_owned,
  pmd.current_price,
  ui.shares_owned * pmd.current_price as position_value
FROM user_investments ui
JOIN user_token_balances utb ON ui.user_id = utb.user_id
LEFT JOIN student_projects sp ON ui.pitch_id = get_pitch_id_from_uuid(sp.id)
LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
WHERE ui.shares_owned > 0
ORDER BY utb.is_ai_investor DESC, utb.display_name, ui.pitch_id;

-- 5. Check for duplicate investments (same user/pitch_id)
SELECT 
  user_id,
  pitch_id,
  COUNT(*) as record_count,
  SUM(shares_owned) as total_shares
FROM user_investments
GROUP BY user_id, pitch_id
HAVING COUNT(*) > 1;

-- 6. Check transaction history from today
SELECT 
  it.id,
  utb.display_name,
  it.transaction_type,
  sp.company_name,
  pmd.ticker,
  it.shares,
  it.price_per_share,
  it.total_amount,
  it.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as transaction_time_est
FROM investment_transactions it
JOIN user_token_balances utb ON it.user_id = utb.user_id
LEFT JOIN student_projects sp ON it.pitch_id = get_pitch_id_from_uuid(sp.id)
LEFT JOIN pitch_market_data pmd ON it.pitch_id = pmd.pitch_id
WHERE it.created_at >= CURRENT_DATE
ORDER BY it.created_at DESC;

-- 7. Check for orphaned investments (pitch_id doesn't exist)
SELECT 
  ui.user_id,
  utb.display_name,
  ui.pitch_id,
  ui.shares_owned,
  CASE 
    WHEN pmd.pitch_id IS NULL THEN 'MISSING PRICE DATA'
    ELSE 'OK'
  END as status
FROM user_investments ui
JOIN user_token_balances utb ON ui.user_id = utb.user_id
LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
WHERE ui.shares_owned > 0
  AND pmd.pitch_id IS NULL;

-- 8. Compare leaderboard view vs direct calculation
-- (This mimics what Compete page shows)
WITH leaderboard_calc AS (
  SELECT 
    utb.user_id,
    utb.display_name,
    utb.available_tokens as cash,
    COALESCE(SUM(ui.shares_owned * pmd.current_price), 0) as holdings,
    utb.available_tokens + COALESCE(SUM(ui.shares_owned * pmd.current_price), 0) as total_value
  FROM user_token_balances utb
  LEFT JOIN user_investments ui ON utb.user_id = ui.user_id AND ui.shares_owned > 0
  LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
  GROUP BY utb.user_id, utb.display_name, utb.available_tokens
)
SELECT * FROM leaderboard_calc
ORDER BY total_value DESC;
