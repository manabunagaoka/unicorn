-- Check schema of ai_trading_logs table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ai_trading_logs'
ORDER BY ordinal_position;
