-- ========================================
-- ALTERNATIVE FIX: Update the AI_READABLE_PITCHES view
-- Use direct UUID casting instead of function
-- ========================================

DROP VIEW IF EXISTS ai_readable_pitches;

CREATE VIEW ai_readable_pitches AS
SELECT 
  CAST(
    CASE 
      WHEN sp.id = '00000000-0000-0000-0000-000000000001'::uuid THEN 1
      WHEN sp.id = '00000000-0000-0000-0000-000000000002'::uuid THEN 2
      WHEN sp.id = '00000000-0000-0000-0000-000000000003'::uuid THEN 3
      WHEN sp.id = '00000000-0000-0000-0000-000000000004'::uuid THEN 4
      WHEN sp.id = '00000000-0000-0000-0000-000000000005'::uuid THEN 5
      WHEN sp.id = '00000000-0000-0000-0000-000000000006'::uuid THEN 6
      WHEN sp.id = '00000000-0000-0000-0000-000000000007'::uuid THEN 7
      WHEN sp.id = '00000000-0000-0000-0000-000000000008'::uuid THEN 8
      WHEN sp.id = '00000000-0000-0000-0000-000000000009'::uuid THEN 9
      WHEN sp.id = '00000000-0000-0000-0000-000000000010'::uuid THEN 10
      WHEN sp.id = '00000000-0000-0000-0000-000000000011'::uuid THEN 11
      WHEN sp.id = '00000000-0000-0000-0000-000000000012'::uuid THEN 12
      WHEN sp.id = '00000000-0000-0000-0000-000000000013'::uuid THEN 13
      WHEN sp.id = '00000000-0000-0000-0000-000000000014'::uuid THEN 14
    END AS INTEGER
  ) as pitch_id,
  sp.startup_name as company_name,
  sp.ticker,
  sp.elevator_pitch,
  sp.fun_fact,
  sp.founder_story,
  sp.category,
  sp.sector,
  sp.year_founded,
  sp.founders,
  sp.stage,
  pmd.current_price,
  pmd.price_change_24h,
  pmd.updated_at as price_updated_at
FROM student_projects sp
LEFT JOIN pitch_market_data pmd ON (
  CASE 
    WHEN sp.id = '00000000-0000-0000-0000-000000000001'::uuid THEN 1
    WHEN sp.id = '00000000-0000-0000-0000-000000000002'::uuid THEN 2
    WHEN sp.id = '00000000-0000-0000-0000-000000000003'::uuid THEN 3
    WHEN sp.id = '00000000-0000-0000-0000-000000000004'::uuid THEN 4
    WHEN sp.id = '00000000-0000-0000-0000-000000000005'::uuid THEN 5
    WHEN sp.id = '00000000-0000-0000-0000-000000000006'::uuid THEN 6
    WHEN sp.id = '00000000-0000-0000-0000-000000000007'::uuid THEN 7
    WHEN sp.id = '00000000-0000-0000-0000-000000000008'::uuid THEN 8
    WHEN sp.id = '00000000-0000-0000-0000-000000000009'::uuid THEN 9
    WHEN sp.id = '00000000-0000-0000-0000-000000000010'::uuid THEN 10
    WHEN sp.id = '00000000-0000-0000-0000-000000000011'::uuid THEN 11
    WHEN sp.id = '00000000-0000-0000-0000-000000000012'::uuid THEN 12
    WHEN sp.id = '00000000-0000-0000-0000-000000000013'::uuid THEN 13
    WHEN sp.id = '00000000-0000-0000-0000-000000000014'::uuid THEN 14
  END
) = pmd.pitch_id
WHERE sp.ticker IS NOT NULL
  AND sp.status = 'approved'
ORDER BY pitch_id;

GRANT SELECT ON ai_readable_pitches TO anon, authenticated;

-- Verify
SELECT pitch_id, company_name, ticker, category, current_price
FROM ai_readable_pitches
ORDER BY pitch_id;
