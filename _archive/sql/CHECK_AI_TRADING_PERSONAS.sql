-- CHECK AI TRADING AGAINST PERSONAS
-- Run each query to see if AIs are trading according to their strategies
-- Created: Dec 26, 2025

-- ========================================
-- QUERY 1: OVERALL TRADING SUMMARY BY AI
-- ========================================
-- Shows buy/sell/hold ratio for each AI
SELECT 
  display_name,
  ai_strategy,
  COUNT(*) as total_decisions,
  SUM(CASE WHEN decision_action = 'BUY' THEN 1 ELSE 0 END) as buys,
  SUM(CASE WHEN decision_action = 'SELL' THEN 1 ELSE 0 END) as sells,
  SUM(CASE WHEN decision_action = 'HOLD' THEN 1 ELSE 0 END) as holds,
  ROUND(100.0 * SUM(CASE WHEN decision_action = 'BUY' THEN 1 ELSE 0 END) / COUNT(*), 1) as buy_pct,
  ROUND(100.0 * SUM(CASE WHEN decision_action = 'SELL' THEN 1 ELSE 0 END) / COUNT(*), 1) as sell_pct,
  ROUND(100.0 * SUM(CASE WHEN decision_action = 'HOLD' THEN 1 ELSE 0 END) / COUNT(*), 1) as hold_pct
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY display_name, ai_strategy
ORDER BY total_decisions DESC;

-- ========================================
-- QUERY 2: PERSONA BEHAVIOR CHECK
-- ========================================
-- Checks if each AI is behaving according to their strategy
-- EXPECTED BEHAVIORS:
-- - Diamond Hands: Mostly BUY/HOLD, rarely SELL
-- - YOLO Kid: Aggressive BUY, large positions
-- - The Contrarian: Should buy falling stocks, sell rising
-- - FOMO Master: Follows momentum, buys rising
-- - The Boomer: Conservative, slow to act
-- - The Oracle: Strategic timing, balanced
-- - Safety First: Small positions, quick to sell losers
-- - Silicon Brain: Tech-focused only
-- - Cloud Surfer: SaaS/subscription only
-- - News Junkie: Reactive to news/sentiment

SELECT 
  display_name,
  ai_strategy,
  CASE 
    WHEN ai_strategy = 'HOLD_FOREVER' THEN 'Should: Mostly BUY/HOLD, rarely SELL'
    WHEN ai_strategy = 'ALL_IN' THEN 'Should: Aggressive BUY, large single positions'
    WHEN ai_strategy = 'CONTRARIAN' THEN 'Should: Buy falling, sell rising stocks'
    WHEN ai_strategy = 'MOMENTUM' THEN 'Should: Buy rising, sell falling stocks'
    WHEN ai_strategy = 'CONSERVATIVE' THEN 'Should: Slow, careful, small positions'
    WHEN ai_strategy = 'PERFECT_TIMING' THEN 'Should: Strategic, wait for opportunities'
    WHEN ai_strategy = 'SAFETY_FIRST' THEN 'Should: Risk-averse, quick stop-losses'
    WHEN ai_strategy = 'TECH_ONLY' THEN 'Should: Only tech stocks'
    WHEN ai_strategy = 'SAAS_ONLY' THEN 'Should: Only SaaS/subscription stocks'
    WHEN ai_strategy = 'NEWS_DRIVEN' THEN 'Should: React to news/sentiment'
    ELSE 'Unknown strategy'
  END as expected_behavior,
  COUNT(*) as total_trades,
  SUM(CASE WHEN decision_action = 'BUY' THEN 1 ELSE 0 END) || ' buys, ' ||
  SUM(CASE WHEN decision_action = 'SELL' THEN 1 ELSE 0 END) || ' sells, ' ||
  SUM(CASE WHEN decision_action = 'HOLD' THEN 1 ELSE 0 END) || ' holds' as actual_behavior
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
GROUP BY display_name, ai_strategy
ORDER BY display_name;

-- ========================================
-- QUERY 3: RECENT SELL DECISIONS
-- ========================================
-- Critical: Check if SELL logic is working
SELECT 
  display_name,
  ai_strategy,
  decision_action,
  decision_pitch_id as pitch_id,
  decision_shares as shares,
  portfolio_value_before,
  decision_reasoning,
  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as trade_time_est
FROM ai_trading_logs
WHERE decision_action = 'SELL'
  AND created_at >= CURRENT_DATE - INTERVAL '14 days'
ORDER BY created_at DESC
LIMIT 20;

-- ========================================
-- QUERY 4: TRADING REASONING ANALYSIS
-- ========================================
-- Look at the reasoning to see if it matches persona
SELECT 
  display_name,
  ai_strategy,
  decision_action,
  decision_pitch_id as pitch_id,
  LEFT(decision_reasoning, 200) as reasoning_preview,
  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as trade_time
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND execution_success = true
ORDER BY created_at DESC
LIMIT 30;

-- ========================================
-- QUERY 5: CONTRARIAN CHECK
-- ========================================
-- The Contrarian should buy when stocks are falling
-- Check if they're buying rising vs falling stocks
SELECT 
  display_name,
  decision_pitch_id as pitch_id,
  decision_action,
  decision_reasoning,
  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as trade_time
FROM ai_trading_logs
WHERE display_name = 'The Contrarian'
  AND created_at >= CURRENT_DATE - INTERVAL '14 days'
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- QUERY 6: DIAMOND HANDS CHECK
-- ========================================
-- Diamond Hands should rarely sell
SELECT 
  display_name,
  COUNT(*) as total_trades,
  SUM(CASE WHEN decision_action = 'SELL' THEN 1 ELSE 0 END) as sells,
  SUM(CASE WHEN decision_action = 'BUY' THEN 1 ELSE 0 END) as buys,
  SUM(CASE WHEN decision_action = 'HOLD' THEN 1 ELSE 0 END) as holds,
  STRING_AGG(DISTINCT decision_pitch_id::text, ', ') as pitches_traded
FROM ai_trading_logs
WHERE display_name = 'Diamond Hands'
  AND created_at >= CURRENT_DATE - INTERVAL '14 days'
GROUP BY display_name;

-- ========================================
-- QUERY 7: YOLO KID CHECK
-- ========================================
-- YOLO Kid should make large, concentrated bets
SELECT 
  display_name,
  decision_pitch_id as pitch_id,
  decision_shares as shares_traded,
  decision_action,
  decision_reasoning,
  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as trade_time
FROM ai_trading_logs
WHERE display_name = 'YOLO Kid'
  AND created_at >= CURRENT_DATE - INTERVAL '14 days'
ORDER BY decision_shares DESC NULLS LAST
LIMIT 10;

-- ========================================
-- QUERY 8: THE ORACLE CHECK
-- ========================================
-- Oracle should show strategic timing, waiting for good opportunities
SELECT 
  display_name,
  decision_action,
  decision_pitch_id as pitch_id,
  decision_reasoning,
  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as trade_time
FROM ai_trading_logs
WHERE display_name = 'The Oracle'
  AND created_at >= CURRENT_DATE - INTERVAL '14 days'
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- QUERY 9: SAFETY FIRST CHECK
-- ========================================
-- Safety First should take small positions, quick to exit losers
SELECT 
  display_name,
  decision_action,
  decision_shares as shares,
  decision_pitch_id as pitch_id,
  decision_reasoning,
  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as trade_time
FROM ai_trading_logs
WHERE (display_name ILIKE '%Safety%' OR ai_strategy = 'SAFETY_FIRST')
  AND created_at >= CURRENT_DATE - INTERVAL '14 days'
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- QUERY 10: CURRENT PORTFOLIO STATE
-- ========================================
-- Check each AI's current holdings
SELECT 
  utb.display_name,
  utb.ai_strategy,
  utb.available_tokens as cash,
  COALESCE(SUM(ui.current_value), 0) as holdings_value,
  utb.available_tokens + COALESCE(SUM(ui.current_value), 0) as total_portfolio,
  COUNT(ui.pitch_id) as num_positions,
  STRING_AGG(ui.pitch_id::text || ':' || ROUND(ui.shares_owned, 1)::text, ', ') as positions
FROM user_token_balances utb
LEFT JOIN user_investments ui ON utb.user_id = ui.user_id AND ui.shares_owned > 0
WHERE utb.is_ai_investor = true
GROUP BY utb.display_name, utb.ai_strategy, utb.available_tokens
ORDER BY total_portfolio DESC;

-- ========================================
-- QUERY 11: RECENT ACTIVITY TIMELINE
-- ========================================
-- Last 24 hours of trading
SELECT 
  TO_CHAR(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST', 'MM/DD HH24:MI') as time_est,
  display_name,
  decision_action,
  decision_pitch_id as pitch_id,
  decision_shares as shares,
  LEFT(decision_reasoning, 100) as reason_preview
FROM ai_trading_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- ========================================
-- QUERY 12: BUY vs SELL RATIO BY DATE
-- ========================================
-- Daily breakdown of trading behavior
SELECT 
  DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST') as trade_date,
  COUNT(*) as total_trades,
  SUM(CASE WHEN decision_action = 'BUY' THEN 1 ELSE 0 END) as buys,
  SUM(CASE WHEN decision_action = 'SELL' THEN 1 ELSE 0 END) as sells,
  SUM(CASE WHEN decision_action = 'HOLD' THEN 1 ELSE 0 END) as holds,
  ROUND(100.0 * SUM(CASE WHEN decision_action = 'SELL' THEN 1 ELSE 0 END) / 
    NULLIF(SUM(CASE WHEN decision_action = 'BUY' THEN 1 ELSE 0 END), 0), 1) as sell_buy_ratio
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
GROUP BY DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST')
ORDER BY trade_date DESC;

-- ========================================
-- QUERY 13: SECTOR/STOCK PREFERENCES
-- ========================================
-- Which stocks each AI prefers (by trade count)
SELECT 
  display_name,
  decision_pitch_id as pitch_id,
  COUNT(*) as trade_count,
  SUM(CASE WHEN decision_action = 'BUY' THEN 1 ELSE 0 END) as buys,
  SUM(CASE WHEN decision_action = 'SELL' THEN 1 ELSE 0 END) as sells
FROM ai_trading_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
  AND execution_success = true
GROUP BY display_name, decision_pitch_id
ORDER BY display_name, trade_count DESC;

-- ========================================
-- QUERY 14: TECH/SAAS PERSONA ADHERENCE
-- ========================================
-- Check if Silicon Brain and Cloud Surfer stick to their sectors
SELECT 
  display_name,
  ai_strategy,
  decision_pitch_id as pitch_id,
  decision_action,
  created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST' as trade_time
FROM ai_trading_logs
WHERE (display_name = 'Silicon Brain' OR display_name = 'Cloud Surfer'
       OR ai_strategy IN ('TECH_ONLY', 'SAAS_ONLY'))
  AND created_at >= CURRENT_DATE - INTERVAL '14 days'
ORDER BY display_name, created_at DESC;

-- ========================================
-- QUERY 15: PROFIT/LOSS TRACKING
-- ========================================
-- Compare portfolio performance by AI
SELECT 
  utb.display_name,
  utb.ai_strategy,
  1000000 as starting_value,
  utb.available_tokens + COALESCE(SUM(ui.current_value), 0) as current_value,
  (utb.available_tokens + COALESCE(SUM(ui.current_value), 0)) - 1000000 as gain_loss,
  ROUND(((utb.available_tokens + COALESCE(SUM(ui.current_value), 0)) / 1000000.0 - 1) * 100, 2) as return_pct
FROM user_token_balances utb
LEFT JOIN user_investments ui ON utb.user_id = ui.user_id AND ui.shares_owned > 0
WHERE utb.is_ai_investor = true
GROUP BY utb.display_name, utb.ai_strategy, utb.available_tokens
ORDER BY return_pct DESC;
