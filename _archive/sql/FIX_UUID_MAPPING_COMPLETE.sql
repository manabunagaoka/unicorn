-- Fix get_pitch_id_from_uuid() to include all 14 HM14 companies
-- This fixes the NULL pitch_id issue for companies 8-14

CREATE OR REPLACE FUNCTION get_pitch_id_from_uuid(project_uuid UUID) RETURNS INTEGER AS $$
BEGIN
  CASE project_uuid::text
    -- Original 7 companies
    WHEN '00000000-0000-0000-0000-000000000001' THEN RETURN 1;  -- META
    WHEN '00000000-0000-0000-0000-000000000002' THEN RETURN 2;  -- MSFT
    WHEN '00000000-0000-0000-0000-000000000003' THEN RETURN 3;  -- ABNB
    WHEN '00000000-0000-0000-0000-000000000004' THEN RETURN 4;  -- NET
    WHEN '00000000-0000-0000-0000-000000000005' THEN RETURN 5;  -- GRAB
    WHEN '00000000-0000-0000-0000-000000000006' THEN RETURN 6;  -- MRNA
    WHEN '00000000-0000-0000-0000-000000000007' THEN RETURN 7;  -- KVYO
    
    -- Missing companies 8-14 (NOW FIXED)
    WHEN '00000000-0000-0000-0000-000000000008' THEN RETURN 8;  -- AFRM (Affirm)
    WHEN '00000000-0000-0000-0000-000000000009' THEN RETURN 9;  -- PTON (Peloton)
    WHEN '00000000-0000-0000-0000-000000000010' THEN RETURN 10; -- ASAN (Asana)
    WHEN '00000000-0000-0000-0000-000000000011' THEN RETURN 11; -- LYFT
    WHEN '00000000-0000-0000-0000-000000000012' THEN RETURN 12; -- TDUP (ThredUp)
    WHEN '00000000-0000-0000-0000-000000000013' THEN RETURN 13; -- KIND (Nextdoor)
    WHEN '00000000-0000-0000-0000-000000000014' THEN RETURN 14; -- RENT (Rent the Runway)
    
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Verify the fix by checking your holdings
SELECT 
  utb.display_name,
  ui.pitch_id,
  sp.startup_name as company_name,
  sp.ticker,
  ui.shares_owned,
  pmd.current_price,
  (ui.shares_owned * pmd.current_price) as position_value
FROM user_investments ui
JOIN user_token_balances utb ON ui.user_id = utb.user_id
LEFT JOIN student_projects sp ON ui.pitch_id = get_pitch_id_from_uuid(sp.id)
LEFT JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
WHERE utb.user_id = '274aa684-ece0-48c5-b54b-92da6e3ca306'
AND ui.shares_owned > 0
ORDER BY ui.pitch_id;
