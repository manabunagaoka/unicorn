-- Check the most recent AI trading activity (last 10 minutes)
SELECT 
  atl.display_name,
  atl.decision_action as action,
  atl.decision_pitch_id as pitch_id,
  atl.decision_shares as shares,
  atl.decision_amount as amount,
  atl.cash_before,
  atl.cash_after,
  atl.execution_success,
  atl.execution_message,
  atl.execution_error,
  atl.decision_reasoning,
  atl.created_at
FROM ai_trading_logs atl
WHERE atl.created_at > NOW() - INTERVAL '10 minutes'
ORDER BY atl.created_at DESC;

-- Check current AI investor balances and holdings
SELECT 
  utb.display_name,
  utb.available_tokens as cash,
  utb.is_ai_investor,
  COUNT(ui.pitch_id) as num_positions,
  STRING_AGG(DISTINCT ui.pitch_id::text, ', ') as pitch_ids_held
FROM user_token_balances utb
LEFT JOIN user_investments ui ON ui.user_id = utb.user_id AND ui.shares_owned > 0
WHERE utb.is_ai_investor = true
GROUP BY utb.user_id, utb.display_name, utb.available_tokens, utb.is_ai_investor
ORDER BY utb.display_name;
