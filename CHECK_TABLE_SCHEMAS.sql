-- Check pitch_market_data schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pitch_market_data'
ORDER BY ordinal_position;

-- Also check user_investments schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_investments'
ORDER BY ordinal_position;
