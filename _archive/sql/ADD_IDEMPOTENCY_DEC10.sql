-- ============================================
-- ADD IDEMPOTENCY FOR CRON RUNS - Dec 10, 2025
-- ============================================
-- Prevents duplicate cron executions from causing multiple trades

-- Create table to track cron executions
CREATE TABLE IF NOT EXISTS ai_trading_cron_runs (
  id SERIAL PRIMARY KEY,
  run_date DATE NOT NULL, -- Trading date (EST)
  run_slot TEXT NOT NULL, -- 'MORNING' or 'AFTERNOON'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL, -- 'RUNNING', 'COMPLETED', 'FAILED'
  trades_executed INT DEFAULT 0,
  error_message TEXT,
  UNIQUE(run_date, run_slot) -- Prevent duplicate runs for same date/slot
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_cron_runs_date_slot 
ON ai_trading_cron_runs(run_date, run_slot);

-- Function to start a cron run (returns NULL if already running)
CREATE OR REPLACE FUNCTION start_cron_run(
  p_run_date DATE,
  p_run_slot TEXT
) RETURNS INT AS $$
DECLARE
  v_run_id INT;
  v_existing_status TEXT;
BEGIN
  -- Check if already running or completed today
  SELECT id, status INTO v_run_id, v_existing_status
  FROM ai_trading_cron_runs
  WHERE run_date = p_run_date AND run_slot = p_run_slot;
  
  IF v_existing_status = 'COMPLETED' THEN
    -- Already ran successfully - skip
    RAISE NOTICE 'Cron already completed for % %', p_run_date, p_run_slot;
    RETURN NULL;
  END IF;
  
  IF v_existing_status = 'RUNNING' THEN
    -- Check if stale (running for >10 min = probably crashed)
    IF (SELECT started_at < NOW() - INTERVAL '10 minutes' 
        FROM ai_trading_cron_runs 
        WHERE id = v_run_id) THEN
      -- Mark as failed and start new run
      UPDATE ai_trading_cron_runs
      SET status = 'FAILED',
          error_message = 'Stale run - exceeded 10 minute timeout',
          completed_at = NOW()
      WHERE id = v_run_id;
    ELSE
      -- Still running - skip
      RAISE NOTICE 'Cron already running for % %', p_run_date, p_run_slot;
      RETURN NULL;
    END IF;
  END IF;
  
  -- Create new run record
  INSERT INTO ai_trading_cron_runs (run_date, run_slot, status)
  VALUES (p_run_date, p_run_slot, 'RUNNING')
  ON CONFLICT (run_date, run_slot) 
  DO UPDATE SET 
    status = 'RUNNING',
    started_at = NOW(),
    completed_at = NULL,
    error_message = NULL
  RETURNING id INTO v_run_id;
  
  RETURN v_run_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete a cron run
CREATE OR REPLACE FUNCTION complete_cron_run(
  p_run_id INT,
  p_trades_executed INT,
  p_error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE ai_trading_cron_runs
  SET 
    status = CASE WHEN p_error_message IS NULL THEN 'COMPLETED' ELSE 'FAILED' END,
    completed_at = NOW(),
    trades_executed = p_trades_executed,
    error_message = p_error_message
  WHERE id = p_run_id;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- 1. At start of cron:
--    SELECT start_cron_run('2025-12-10'::date, 'MORNING'); -- Returns run_id or NULL
-- 2. If NULL, exit immediately (already ran)
-- 3. At end of cron:
--    SELECT complete_cron_run(run_id, trades_count, error_msg);
