-- AUTO-UPDATE current_value IN user_investments
-- Run this in Supabase SQL Editor
-- Created: Dec 26, 2025

-- =============================================
-- PART 1: Create the RPC function for manual/API updates
-- =============================================
CREATE OR REPLACE FUNCTION update_investment_current_values()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_investments ui
  SET current_value = ui.shares_owned * pmd.current_price
  FROM pitch_market_data pmd
  WHERE ui.pitch_id = pmd.pitch_id
    AND ui.shares_owned > 0;
END;
$$;

-- Grant execute to authenticated and service role
GRANT EXECUTE ON FUNCTION update_investment_current_values() TO authenticated;
GRANT EXECUTE ON FUNCTION update_investment_current_values() TO service_role;

-- =============================================
-- PART 2: Create trigger to auto-update when prices change
-- =============================================

-- First, create the trigger function
CREATE OR REPLACE FUNCTION trigger_update_investment_values()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a price changes in pitch_market_data, update all related investments
  UPDATE user_investments
  SET current_value = shares_owned * NEW.current_price
  WHERE pitch_id = NEW.pitch_id
    AND shares_owned > 0;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_price_change_update_investments ON pitch_market_data;

-- Create the trigger
CREATE TRIGGER on_price_change_update_investments
AFTER UPDATE OF current_price ON pitch_market_data
FOR EACH ROW
WHEN (OLD.current_price IS DISTINCT FROM NEW.current_price)
EXECUTE FUNCTION trigger_update_investment_values();

-- =============================================
-- PART 3: Verify the setup
-- =============================================

-- Test the RPC function
SELECT update_investment_current_values();

-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_price_change_update_investments';

-- Verify current_values are correct
SELECT 
  COUNT(*) as total_positions,
  SUM(CASE WHEN ui.current_value = ui.shares_owned * pmd.current_price THEN 1 ELSE 0 END) as correct,
  SUM(CASE WHEN ui.current_value != ui.shares_owned * pmd.current_price THEN 1 ELSE 0 END) as incorrect
FROM user_investments ui
JOIN pitch_market_data pmd ON ui.pitch_id = pmd.pitch_id
WHERE ui.shares_owned > 0;
