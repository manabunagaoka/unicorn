-- Check recent AI trading activity
SELECT 
  utb.ai_nickname,
  p.company_name,
  p.ticker,
  it.transaction_type,
  it.shares_count,
  it.price_per_share,
  it.amount_mtk,
  utb.available_tokens as current_cash,
  it.timestamp
FROM investment_transactions it
JOIN user_token_balances utb ON it.user_id = utb.user_id
JOIN pitches p ON it.pitch_id = p.id
WHERE utb.is_ai_investor = true
  AND it.timestamp >= '2025-12-01'
ORDER BY it.timestamp DESC;

-- Check AI trading logs with reasoning
SELECT 
  execution_timestamp,
  ai_nickname,
  decision_action,
  ticker_or_company,
  shares_count,
  amount_mtk,
  decision_reasoning,
  success,
  error_message
FROM ai_trading_logs
WHERE DATE(execution_timestamp) >= '2025-12-01'
ORDER BY execution_timestamp DESC;

-- Check current balances
SELECT 
  ai_nickname,
  available_tokens as cash,
  total_tokens - available_tokens as invested,
  total_tokens as total,
  is_active
FROM user_token_balances
WHERE is_ai_investor = true
ORDER BY ai_nickname;

-- Check what pitches are available
SELECT id, company_name, ticker, status
FROM pitches
WHERE ticker IS NOT NULL
ORDER BY id;
