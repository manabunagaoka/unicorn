-- Check FOMO Master's recent trades
SELECT 
  display_name,
  decision_action,
  decision_pitch_id,
  decision_shares,
  decision_amount,
  cash_before,
  cash_after,
  execution_success,
  execution_error,
  execution_message,
  created_at
FROM ai_trading_logs
WHERE display_name = 'FOMO Master'
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
