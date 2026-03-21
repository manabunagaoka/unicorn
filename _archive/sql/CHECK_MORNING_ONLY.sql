-- What SHOULD have happened if only the 14:30 UTC (9:30 AM EST) trades executed

-- Get the 9:30 AM trades only
WITH morning_trades AS (
  SELECT 
    display_name,
    CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC) as trade_amount
  FROM ai_trading_logs
  WHERE created_at >= '2025-12-03 14:30:00'::timestamp
    AND created_at < '2025-12-03 14:31:00'::timestamp
    AND execution_success = true
)
SELECT 
  display_name,
  SUM(trade_amount) as should_have_spent,
  1000000.00 - SUM(trade_amount) as should_have_remaining
FROM morning_trades
GROUP BY display_name
ORDER BY display_name;

-- Compare to actual
SELECT 
  utb.display_name,
  utb.available_tokens as actual_cash,
  1000000.00 - utb.available_tokens as actual_spent,
  -- Get what morning cron says
  (SELECT SUM(CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC))
   FROM ai_trading_logs atl
   WHERE atl.display_name = utb.display_name
     AND atl.created_at >= '2025-12-03 14:30:00'::timestamp
     AND atl.created_at < '2025-12-03 14:31:00'::timestamp
     AND atl.execution_success = true) as morning_logged,
  -- Compare
  1000000.00 - utb.available_tokens - COALESCE(
    (SELECT SUM(CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC))
     FROM ai_trading_logs atl
     WHERE atl.display_name = utb.display_name
       AND atl.created_at >= '2025-12-03 14:30:00'::timestamp
       AND atl.created_at < '2025-12-03 14:31:00'::timestamp
       AND atl.execution_success = true), 0
  ) as extra_spent_from_yesterday
FROM user_token_balances utb
WHERE utb.is_ai_investor = true
ORDER BY utb.display_name;
