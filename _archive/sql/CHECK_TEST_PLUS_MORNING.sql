-- Check what happened last night during manual tests

-- All trades from 1:30-2:00 AM UTC (manual test period)
SELECT 
  display_name,
  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as est_time,
  execution_success,
  execution_message
FROM ai_trading_logs
WHERE created_at >= '2025-12-03 01:30:00'::timestamp
  AND created_at < '2025-12-03 02:00:00'::timestamp
ORDER BY created_at, display_name;

-- Sum what was spent during manual tests
SELECT 
  display_name,
  COUNT(*) as trades,
  SUM(CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC)) as total_spent_in_tests
FROM ai_trading_logs
WHERE created_at >= '2025-12-03 01:30:00'::timestamp
  AND created_at < '2025-12-03 02:00:00'::timestamp
  AND execution_success = true
GROUP BY display_name
ORDER BY display_name;

-- Now compare: manual test spending + morning spending = current state?
WITH test_trades AS (
  SELECT 
    display_name,
    SUM(CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC)) as test_spent
  FROM ai_trading_logs
  WHERE created_at >= '2025-12-03 01:30:00'::timestamp
    AND created_at < '2025-12-03 02:00:00'::timestamp
    AND execution_success = true
  GROUP BY display_name
),
morning_trades AS (
  SELECT 
    display_name,
    SUM(CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC)) as morning_spent
  FROM ai_trading_logs
  WHERE created_at >= '2025-12-03 14:30:00'::timestamp
    AND created_at < '2025-12-03 14:31:00'::timestamp
    AND execution_success = true
  GROUP BY display_name
)
SELECT 
  utb.display_name,
  COALESCE(tt.test_spent, 0) as spent_in_tests,
  COALESCE(mt.morning_spent, 0) as spent_this_morning,
  COALESCE(tt.test_spent, 0) + COALESCE(mt.morning_spent, 0) as total_should_have_spent,
  1000000.00 - utb.available_tokens as actual_spent,
  (1000000.00 - utb.available_tokens) - (COALESCE(tt.test_spent, 0) + COALESCE(mt.morning_spent, 0)) as discrepancy
FROM user_token_balances utb
LEFT JOIN test_trades tt ON utb.display_name = tt.display_name
LEFT JOIN morning_trades mt ON utb.display_name = mt.display_name
WHERE utb.is_ai_investor = true
ORDER BY utb.display_name;
