-- Check if AKAM trades actually happened
-- AKAM should NOT exist in the HM14 list

-- Check ai_trading_logs for recent trades
SELECT 
  display_name,
  decision_action,
  decision_pitch_id,
  decision_shares,
  decision_amount,
  cash_before,
  cash_after,
  execution_success,
  execution_message,
  decision_reasoning,
  created_at
FROM ai_trading_logs
WHERE created_at > NOW() - INTERVAL '12 hours'
ORDER BY created_at DESC;

-- Check what companies were actually available in student_projects
SELECT 
  id,
  startup_name,
  ticker,
  status
FROM student_projects
WHERE ticker = 'AKAM';

-- Check which pitch_ids exist in student_projects (should be 1-14 only)
SELECT 
  id,
  startup_name,
  ticker
FROM student_projects
ORDER BY ticker;
