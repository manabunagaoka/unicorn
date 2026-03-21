-- Check the actual schema of ai_trading_logs table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ai_trading_logs'
ORDER BY ordinal_position;

-- Also show a sample row to see what columns exist
SELECT *
FROM ai_trading_logs
ORDER BY created_at DESC
LIMIT 1;
