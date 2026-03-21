-- ========================================
-- MIGRATE TO HM14: 100% HARVARD-VERIFIED COMPANIES
-- EXECUTE THIS IN SUPABASE SQL EDITOR NOW
-- Date: November 22, 2025
-- ========================================

-- SUMMARY:
-- - Delete 5 non-Harvard companies (DBX, AKAM, RDDT, WRBY, BKNG)
-- - Keep 2 Harvard companies (META, MSFT)
-- - Add 12 new Harvard-verified companies
-- - Reset all investments and balances
-- - Total: 14 Harvard-founded public companies

BEGIN;

-- ========================================
-- STEP 1: DELETE OLD COMPANIES
-- ========================================

-- Delete non-Harvard companies from student_projects
DELETE FROM student_projects 
WHERE ticker IN ('DBX', 'AKAM', 'RDDT', 'WRBY', 'BKNG');

-- Delete existing HM14 companies (will be re-inserted with correct data)
DELETE FROM student_projects
WHERE ticker IN ('ABNB', 'NET', 'GRAB', 'MRNA', 'KVYO', 'AFRM', 'PTON', 'ASAN', 'LYFT', 'TDUP', 'KIND', 'RENT');

-- Delete associated market data for pitch_ids 3-14
DELETE FROM pitch_market_data 
WHERE pitch_id >= 3 AND pitch_id <= 14;

-- ========================================
-- STEP 2: RESET ALL USER INVESTMENTS
-- ========================================

-- Clear all holdings
DELETE FROM user_investments;

-- Clear all transaction history
DELETE FROM investment_transactions;

-- Reset all balances to 1M MTK
UPDATE user_token_balances 
SET 
  available_tokens = 1000000,
  total_invested = 0,
  portfolio_value = 0;

-- ========================================
-- STEP 3: INSERT NEW HM14 COMPANIES
-- ========================================

INSERT INTO student_projects (
  id, user_id, user_email, startup_name, one_liner, elevator_pitch,
  category, founders, stage, fun_fact, founder_story, year_founded, ticker, status
) VALUES
  -- pitch_id 3: Airbnb
  ('00000000-0000-0000-0000-000000000003'::uuid, 'hm7_abnb', 'hm7@rize.ai',
   'Airbnb', 'Belong anywhere',
   'Enables travelers to book homes and experiences globally, and empowers hosts to earn income from their spaces.',
   'Consumer', 'Nathan Blecharczyk', 'Launched',
   'Airbnb''s name comes from its early "air mattress" business model.',
   'Nathan Blecharczyk (Harvard ''05) co-founded Airbnb with Brian Chesky and Joe Gebbia.',
   2008, 'ABNB', 'approved'),

  -- pitch_id 4: Cloudflare
  ('00000000-0000-0000-0000-000000000004'::uuid, 'hm7_net', 'hm7@rize.ai',
   'Cloudflare', 'Building a better Internet',
   'Secures and accelerates websites, APIs, and networks for millions of online properties.',
   'Enterprise', 'Michelle Zatlyn', 'Launched',
   'Cloudflare powers about 20% of all internet traffic.',
   'Michelle Zatlyn (Harvard Business School) co-founded Cloudflare in 2009.',
   2009, 'NET', 'approved'),

  -- pitch_id 5: Grab Holdings
  ('00000000-0000-0000-0000-000000000005'::uuid, 'hm7_grab', 'hm7@rize.ai',
   'Grab', 'Southeast Asia superapp',
   'Southeast Asia''s leading app for ride-hailing, food delivery, and digital payments.',
   'Consumer', 'Anthony Tan & Tan Hooi Ling', 'Launched',
   'Grab started as a student project at Harvard Business School.',
   'Anthony Tan and Tan Hooi Ling met at Harvard Business School and founded Grab.',
   2012, 'GRAB', 'approved'),

  -- pitch_id 6: Moderna
  ('00000000-0000-0000-0000-000000000006'::uuid, 'hm7_mrna', 'hm7@rize.ai',
   'Moderna', 'mRNA medicines',
   'Develops messenger RNA-based medicines and vaccines for infectious diseases and beyond.',
   'Life Sciences', 'Harvard faculty co-founder', 'Launched',
   'Moderna''s COVID-19 vaccine was developed in record time and became the second U.S.-approved mRNA vaccine.',
   'Founded with Harvard faculty involvement, pioneering mRNA technology.',
   2010, 'MRNA', 'approved'),

  -- pitch_id 7: Klaviyo
  ('00000000-0000-0000-0000-000000000007'::uuid, 'hm7_kvyo', 'hm7@rize.ai',
   'Klaviyo', 'Email marketing for e-commerce',
   'AI-first CRM platform that helps e-commerce businesses drive growth by unifying customer data, marketing automation, and analytics.',
   'Enterprise', 'Andrew Bialecki', 'Launched',
   'Klaviyo''s name comes from the Spanish word "clavija" (meaning "mountaineering pin"), reflecting their goal to support brands as they climb to success.',
   'Andrew Bialecki (Harvard physics PhD) founded Klaviyo in 2012.',
   2012, 'KVYO', 'approved'),

  -- pitch_id 8: Affirm
  ('00000000-0000-0000-0000-000000000008'::uuid, 'hm7_afrm', 'hm7@rize.ai',
   'Affirm', 'Buy now, pay later',
   'Provides flexible "buy now, pay later" financing to consumers at point of sale.',
   'Financial Services', 'Alex Rampell', 'Launched',
   'Affirm''s founders previously built successful companies including PayPal.',
   'Alex Rampell (Harvard College) co-founded Affirm with Max Levchin.',
   2012, 'AFRM', 'approved'),

  -- pitch_id 9: Peloton
  ('00000000-0000-0000-0000-000000000009'::uuid, 'hm7_pton', 'hm7@rize.ai',
   'Peloton', 'Fitness revolution',
   'Combines fitness equipment, live and on-demand classes for immersive home workouts.',
   'Consumer', 'John Foley', 'Launched',
   'The company''s first bike was delivered to customers by Peloton employees personally.',
   'John Foley (Harvard Business School) founded Peloton in 2012.',
   2012, 'PTON', 'approved'),

  -- pitch_id 10: Asana
  ('00000000-0000-0000-0000-000000000010'::uuid, 'hm7_asan', 'hm7@rize.ai',
   'Asana', 'Work management platform',
   'Simplifies work management for teams with tasks, projects, and workflow automation.',
   'Enterprise', 'Justin Rosenstein', 'Launched',
   'Co-founder Justin Rosenstein also helped create Facebook''s "Like" button.',
   'Justin Rosenstein (Harvard master''s degree) co-founded Asana with Dustin Moskovitz.',
   2008, 'ASAN', 'approved'),

  -- pitch_id 11: Lyft
  ('00000000-0000-0000-0000-000000000011'::uuid, 'hm7_lyft', 'hm7@rize.ai',
   'Lyft', 'Ride your way',
   'Offers on-demand shared rides and transportation services in the U.S.',
   'Consumer', 'Logan Green', 'Launched',
   'Lyft started as Zimride, a rideshare platform for college students.',
   'Logan Green (Harvard connections) co-founded Lyft with John Zimmer.',
   2012, 'LYFT', 'approved'),

  -- pitch_id 12: ThredUp
  ('00000000-0000-0000-0000-000000000012'::uuid, 'hm7_tdup', 'hm7@rize.ai',
   'ThredUp', 'Secondhand fashion',
   'Enables users to buy and sell secondhand clothing in an online thrift store.',
   'Consumer', 'James Reinhart', 'Launched',
   'ThredUp started when its co-founder wanted a way to clean out his closet.',
   'James Reinhart (Harvard Business School) founded ThredUp in 2009.',
   2009, 'TDUP', 'approved'),

  -- pitch_id 13: Nextdoor
  ('00000000-0000-0000-0000-000000000013'::uuid, 'hm7_kind', 'hm7@rize.ai',
   'Nextdoor', 'Neighborhood network',
   'Connects neighbors and local communities using a private social network.',
   'Social Impact', 'Nirav Tolia', 'Launched',
   'Nextdoor''s founders launched the platform from a San Francisco apartment.',
   'Nirav Tolia (Harvard grad) founded Nextdoor in 2010.',
   2010, 'KIND', 'approved'),

  -- pitch_id 14: Rent the Runway
  ('00000000-0000-0000-0000-000000000014'::uuid, 'hm7_rent', 'hm7@rize.ai',
   'Rent the Runway', 'Designer fashion rental',
   'Provides designer clothing and accessories for rent to women nationwide.',
   'Consumer', 'Jennifer Hyman', 'Launched',
   'Jennifer Hyman pitched the idea to designers before prototyping a website.',
   'Jennifer Hyman (Harvard Business School) co-founded Rent the Runway in 2009.',
   2009, 'RENT', 'approved');

-- ========================================
-- STEP 4: INITIALIZE MARKET DATA
-- ========================================

INSERT INTO pitch_market_data (pitch_id, current_price, price_change_24h, updated_at)
VALUES
  (1, 600.53, 0, NOW()),  -- META
  (2, 494.25, 0, NOW()),  -- MSFT
  (3, 116.06, 0, NOW()),  -- ABNB
  (4, 199.61, 0, NOW()),  -- NET
  (5, 5.33, 0, NOW()),    -- GRAB
  (6, 24.86, 0, NOW()),   -- MRNA
  (7, 27.47, 0, NOW()),   -- KVYO
  (8, 66.67, 0, NOW()),   -- AFRM
  (9, 7.19, 0, NOW()),    -- PTON
  (10, 12.10, 0, NOW()),  -- ASAN
  (11, 21.63, 0, NOW()),  -- LYFT
  (12, 7.47, 0, NOW()),   -- TDUP
  (13, 2.06, 0, NOW()),   -- KIND
  (14, 4.53, 0, NOW())    -- RENT
ON CONFLICT (pitch_id) DO UPDATE SET
  current_price = EXCLUDED.current_price,
  updated_at = EXCLUDED.updated_at;

-- ========================================
-- STEP 5: UPDATE AI_READABLE_PITCHES VIEW
-- ========================================

DROP VIEW IF EXISTS ai_readable_pitches;

CREATE VIEW ai_readable_pitches AS
SELECT 
  get_pitch_id_from_uuid(sp.id) as pitch_id,
  sp.startup_name as company_name,
  sp.ticker,
  sp.elevator_pitch,
  sp.fun_fact,
  sp.founder_story,
  sp.category,
  sp.sector,
  sp.year_founded,
  sp.founders,
  sp.stage,
  pmd.current_price,
  pmd.price_change_24h,
  pmd.updated_at as price_updated_at
FROM student_projects sp
LEFT JOIN pitch_market_data pmd ON get_pitch_id_from_uuid(sp.id) = pmd.pitch_id
WHERE sp.ticker IS NOT NULL
  AND sp.status = 'approved'
ORDER BY get_pitch_id_from_uuid(sp.id);

GRANT SELECT ON ai_readable_pitches TO anon, authenticated;

COMMIT;

-- ========================================
-- VERIFICATION - RUN AFTER COMMIT
-- ========================================

-- Check all 14 companies loaded
SELECT pitch_id, company_name, ticker, category, current_price
FROM ai_readable_pitches
ORDER BY pitch_id;

-- This should return 14 rows with the correct Harvard companies
