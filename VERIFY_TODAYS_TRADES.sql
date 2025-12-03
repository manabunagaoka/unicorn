-- Get the actual trades with correct company names
SELECT 
  atl.display_name,
  atl.decision_action as action,
  atl.decision_pitch_id as pitch_id,
  sp.startup_name as company_name,
  sp.ticker,
  atl.decision_shares as shares,
  atl.decision_amount as amount,
  atl.cash_before,
  atl.cash_after,
  atl.created_at
FROM ai_trading_logs atl
LEFT JOIN student_projects sp ON atl.decision_pitch_id = get_pitch_id_from_uuid(sp.id)
WHERE atl.created_at > NOW() - INTERVAL '24 hours'
ORDER BY atl.created_at DESC;
