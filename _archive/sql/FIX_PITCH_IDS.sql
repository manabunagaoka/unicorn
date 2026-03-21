-- ========================================
-- FIX PITCH_IDS FOR HM14 COMPANIES
-- The UUIDs are correct but pitch_id view is returning NULL
-- ========================================

-- First, let's verify the UUIDs exist
SELECT id, startup_name, ticker 
FROM student_projects 
WHERE ticker IN ('AFRM', 'PTON', 'ASAN', 'LYFT', 'TDUP', 'KIND', 'RENT')
ORDER BY ticker;

-- Now fix the pitch_market_data - ensure rows exist for pitch_ids 8-14
-- The issue is likely missing rows in pitch_market_data

-- Insert or update market data for pitch_ids 8-14
INSERT INTO pitch_market_data (pitch_id, current_price, price_change_24h, updated_at)
VALUES
  (8, 66.67, 0, NOW()),   -- AFRM
  (9, 7.19, 0, NOW()),    -- PTON
  (10, 12.10, 0, NOW()),  -- ASAN
  (11, 21.63, 0, NOW()),  -- LYFT
  (12, 7.47, 0, NOW()),   -- TDUP
  (13, 2.06, 0, NOW()),   -- KIND
  (14, 4.53, 0, NOW())    -- RENT
ON CONFLICT (pitch_id) DO UPDATE SET
  current_price = EXCLUDED.current_price,
  updated_at = EXCLUDED.updated_at;

-- Verify the view now shows all 14 companies with correct pitch_ids
SELECT pitch_id, company_name, ticker, category, current_price
FROM ai_readable_pitches
ORDER BY pitch_id;
