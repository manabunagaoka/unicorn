-- RESET AI INVESTORS ONLY - December 20, 2025
-- Resets all 10 AI investors to $1M cash, 0 holdings
-- Human investor(s) remain untouched

-- Step 1: Delete all AI investment positions
DELETE FROM user_investments
WHERE user_id IN (
  SELECT user_id FROM user_token_balances WHERE is_ai_investor = true
);

-- Step 2: Reset all AI investors to exactly $1,000,000
UPDATE user_token_balances
SET 
  available_tokens = 1000000.00,
  total_tokens = 1000000.00,
  updated_at = NOW()
WHERE is_ai_investor = true;

-- Step 3: Delete AI trading logs (optional - keeps history clean)
DELETE FROM ai_trading_logs
WHERE user_id IN (
  SELECT user_id FROM user_token_balances WHERE is_ai_investor = true
);

-- Step 4: Verify the reset
SELECT 
  display_name,
  available_tokens as cash,
  total_tokens,
  (SELECT COUNT(*) FROM user_investments ui WHERE ui.user_id = utb.user_id) as positions
FROM user_token_balances utb
WHERE is_ai_investor = true
ORDER BY display_name;
