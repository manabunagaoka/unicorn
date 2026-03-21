-- Check last AI trading activity (any time)
SELECT 
  display_name,
  decision_action,
  decision_pitch_id,
  decision_shares,
  execution_success,
  created_at
FROM ai_trading_logs
ORDER BY created_at DESC
LIMIT 20;
