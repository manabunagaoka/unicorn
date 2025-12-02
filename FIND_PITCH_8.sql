-- Find what pitch_id 8 is
SELECT pitch_id, company_name, ticker, current_price
FROM ai_readable_pitches
WHERE pitch_id = 8;

-- If that doesn't work, check pitch_market_data directly
SELECT pitch_id, current_price, updated_at
FROM pitch_market_data
WHERE pitch_id = 8;
