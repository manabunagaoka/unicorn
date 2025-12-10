-- ============================================
-- FIX BALANCE VALIDATION - Dec 10, 2025
-- ============================================
-- Root cause: Balance validation in trigger/route.ts is not atomic
-- Between checking balance and inserting transaction, another process can spend
-- Solution: Add database-level constraint and use row locking

-- Step 1: Add check constraint to prevent negative balances
ALTER TABLE user_token_balances 
DROP CONSTRAINT IF EXISTS positive_balance_check;

ALTER TABLE user_token_balances
ADD CONSTRAINT positive_balance_check 
CHECK (available_tokens >= 0);

-- Step 2: Create atomic trade execution function
-- This locks the row, checks balance, and executes trade in one transaction
CREATE OR REPLACE FUNCTION execute_ai_trade(
  p_user_id UUID,
  p_pitch_id INT,
  p_shares NUMERIC,
  p_price_per_share NUMERIC,
  p_transaction_type TEXT
) RETURNS TABLE(
  success BOOLEAN,
  new_balance NUMERIC,
  error_message TEXT
) AS $$
DECLARE
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_total_cost NUMERIC;
  v_existing_shares NUMERIC;
  v_existing_invested NUMERIC;
BEGIN
  -- Lock the user's balance row for update
  SELECT available_tokens INTO v_balance_before
  FROM user_token_balances
  WHERE user_id = p_user_id
  FOR UPDATE; -- This prevents concurrent modifications
  
  IF p_transaction_type = 'BUY' THEN
    v_total_cost := p_shares * p_price_per_share;
    
    -- Validate sufficient funds
    IF v_total_cost > v_balance_before THEN
      success := FALSE;
      new_balance := v_balance_before;
      error_message := format('Insufficient funds: need $%s, have $%s', v_total_cost, v_balance_before);
      RETURN NEXT;
      RETURN;
    END IF;
    
    v_balance_after := v_balance_before - v_total_cost;
    
    -- Insert transaction record
    INSERT INTO investment_transactions (
      user_id, pitch_id, transaction_type, shares, 
      price_per_share, total_amount, balance_before, balance_after
    ) VALUES (
      p_user_id, p_pitch_id, 'BUY', p_shares,
      p_price_per_share, v_total_cost, v_balance_before, v_balance_after
    );
    
    -- Update or create investment position
    INSERT INTO user_investments (
      user_id, pitch_id, shares_owned, avg_purchase_price, total_invested
    ) VALUES (
      p_user_id, p_pitch_id, p_shares, p_price_per_share, v_total_cost
    )
    ON CONFLICT (user_id, pitch_id) DO UPDATE SET
      shares_owned = user_investments.shares_owned + p_shares,
      total_invested = user_investments.total_invested + v_total_cost,
      avg_purchase_price = (user_investments.total_invested + v_total_cost) / (user_investments.shares_owned + p_shares);
    
    -- Update balance
    UPDATE user_token_balances
    SET available_tokens = v_balance_after
    WHERE user_id = p_user_id;
    
    success := TRUE;
    new_balance := v_balance_after;
    error_message := NULL;
    RETURN NEXT;
    
  ELSIF p_transaction_type = 'SELL' THEN
    -- Get current position
    SELECT shares_owned, total_invested 
    INTO v_existing_shares, v_existing_invested
    FROM user_investments
    WHERE user_id = p_user_id AND pitch_id = p_pitch_id;
    
    -- Validate sufficient shares
    IF v_existing_shares IS NULL OR p_shares > v_existing_shares THEN
      success := FALSE;
      new_balance := v_balance_before;
      error_message := format('Insufficient shares: need %s, have %s', p_shares, COALESCE(v_existing_shares, 0));
      RETURN NEXT;
      RETURN;
    END IF;
    
    v_total_cost := p_shares * p_price_per_share;
    v_balance_after := v_balance_before + v_total_cost;
    
    -- Insert transaction record
    INSERT INTO investment_transactions (
      user_id, pitch_id, transaction_type, shares,
      price_per_share, total_amount, balance_before, balance_after
    ) VALUES (
      p_user_id, p_pitch_id, 'SELL', p_shares,
      p_price_per_share, v_total_cost, v_balance_before, v_balance_after
    );
    
    -- Update investment position
    UPDATE user_investments
    SET 
      shares_owned = shares_owned - p_shares,
      total_invested = total_invested - (total_invested * (p_shares / shares_owned))
    WHERE user_id = p_user_id AND pitch_id = p_pitch_id;
    
    -- Update balance
    UPDATE user_token_balances
    SET available_tokens = v_balance_after
    WHERE user_id = p_user_id;
    
    success := TRUE;
    new_balance := v_balance_after;
    error_message := NULL;
    RETURN NEXT;
  ELSE
    success := FALSE;
    new_balance := v_balance_before;
    error_message := 'Invalid transaction type';
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Test the function (don't run in production until code updated)
-- SELECT * FROM execute_ai_trade(
--   '00000000-0000-0000-0000-000000000001'::uuid,
--   1,
--   10.00,
--   100.00,
--   'BUY'
-- );
