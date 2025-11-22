-- Check PTON price in database
SELECT 
  pitch_id,
  current_price,
  last_updated
FROM pitch_current_prices
WHERE pitch_id = 9;

-- Check price history for PTON
SELECT 
  pitch_id,
  price,
  timestamp
FROM pitch_price_history
WHERE pitch_id = 9
ORDER BY timestamp DESC
LIMIT 5;
