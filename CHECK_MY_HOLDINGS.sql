-- Check what Super ManaMana actually owns (all holdings)
SELECT 
  ui.pitch_id,
  ui.shares_owned, 
  ui.total_invested,
  ui.current_value
FROM user_investments ui
WHERE ui.user_id = '274aa684-ece0-48c5-b54b-92da6e3ca306'
  AND ui.shares_owned > 0
ORDER BY ui.pitch_id;

-- Now get the details with prices
SELECT 
  ui.pitch_id,
  sp.startup_name,
  sp.ticker, 
  ui.shares_owned, 
  pmd.current_price,
  ui.shares_owned * pmd.current_price as calculated_value,
  ui.current_value as stored_value
FROM user_investments ui
LEFT JOIN student_projects sp ON ui.pitch_id = get_pitch_id_from_uuid(sp.id)
LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
WHERE ui.user_id = '274aa684-ece0-48c5-b54b-92da6e3ca306'
  AND ui.shares_owned > 0
ORDER BY ui.pitch_id;
