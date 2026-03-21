-- HNP7 (Harvard Non-Profit 7) Database Insert Script
-- To be inserted into ai_readable_pitches table after schema update
-- Date: November 18, 2025

-- Prerequisites:
-- 1. Add columns: index_code TEXT, price_type TEXT to ai_readable_pitches
-- 2. Create simulated price tracking system
-- 3. Initial price: $100 MTK for all HNP7 entries

-- ========================================
-- HNP7 NON-PROFIT ENTRIES
-- ========================================

-- 1. PHL - Project Health & Literacy (Education)
INSERT INTO ai_readable_pitches (
    pitch_id,
    ticker,
    company_name,
    category,
    index_code,
    price_type,
    elevator_pitch,
    founder_info,
    impact_metrics,
    mission_statement
) VALUES (
    gen_random_uuid(),
    'PHL',
    'Project Health & Literacy',
    'Education',
    'HNP7',
    'simulated',
    'Project Health & Literacy bridges the gap between medical expertise and community need. Harvard medical students deliver evidence-based health education to underserved youth, creating a generation of health-literate citizens while training compassionate physicians. Every dollar invested expands our reach to more classrooms, more communities, more lives changed through the power of health knowledge.',
    'Founded by Harvard Medical School students in 2009. 100+ HMS student volunteers annually.',
    'Serves 1,000+ students annually in Boston-area schools. Health literacy curriculum in 15+ partner schools. Focus on diabetes prevention, nutrition, mental health awareness.',
    'Empower underserved communities through health education and literacy programs delivered by medical students.'
);

-- 2. HLTH - Health Leads (Healthcare)
INSERT INTO ai_readable_pitches (
    pitch_id,
    ticker,
    company_name,
    category,
    index_code,
    price_type,
    elevator_pitch,
    founder_info,
    impact_metrics,
    mission_statement
) VALUES (
    gen_random_uuid(),
    'HLTH',
    'Health Leads',
    'Healthcare',
    'HNP7',
    'simulated',
    'Health Leads revolutionizes healthcare by treating more than symptoms—we treat the conditions that cause them. Born at Harvard, we''ve proven that addressing food insecurity, housing instability, and poverty is as critical as prescribing medication. Invest in the future of holistic healthcare where every patient receives not just treatment, but the resources to truly heal.',
    'Founded by Rebecca Onie (Harvard College ''97) in 1996. MacArthur "Genius Grant" recipient.',
    'Operates in 30+ healthcare facilities nationwide. Served 500,000+ patients. Connected patients to $500M+ in social resources. Trained 10,000+ college student advocates.',
    'Address social determinants of health by connecting patients with essential resources like food, housing, and utilities. Pioneered "social prescribing" in healthcare.'
);

-- 3. HSCA - Harvard Square Climate Action (Climate)
INSERT INTO ai_readable_pitches (
    pitch_id,
    ticker,
    company_name,
    category,
    index_code,
    price_type,
    elevator_pitch,
    founder_info,
    impact_metrics,
    mission_statement
) VALUES (
    gen_random_uuid(),
    'HSCA',
    'Harvard Square Climate Action',
    'Climate',
    'HNP7',
    'simulated',
    'Harvard Square Climate Action proves that local action creates global impact. We mobilize Harvard students to transform our neighborhood into a living laboratory for climate solutions—from zero-waste restaurants to renewable energy partnerships. Your investment helps us scale this model to college towns nationwide, showing the world that students can lead the climate revolution.',
    'Founded by Harvard undergraduates in 2019. Student-led climate organizing focused on Cambridge community.',
    'Partnered with 25+ local businesses for sustainability commitments. Organized 500+ students for climate advocacy. Achieved 15% emissions reduction in partner businesses. Influenced Harvard''s $42B endowment divestment from fossil fuels.',
    'Drive local climate action through community organizing, policy advocacy, and sustainable business partnerships. Make Harvard Square carbon-neutral by 2030.'
);

-- 4. PBHA - Phillips Brooks House Association (Community)
INSERT INTO ai_readable_pitches (
    pitch_id,
    ticker,
    company_name,
    category,
    index_code,
    price_type,
    elevator_pitch,
    founder_info,
    impact_metrics,
    mission_statement
) VALUES (
    gen_random_uuid(),
    'PBHA',
    'Phillips Brooks House Association',
    'Community',
    'HNP7',
    'simulated',
    'For 121 years, PBHA has been Harvard''s engine of community impact—entirely student-led, entirely community-focused. We run 100+ programs from homeless shelters to immigration legal aid, proving that students can be trusted with serious social challenges. Invest in the organization that''s trained generations of leaders to put service above self and community above credentials.',
    'Founded by Harvard students in 1904. 121 years of continuous community service. Harvard''s oldest and largest public service organization.',
    '1,800+ Harvard student volunteers annually. 3,000+ community members served weekly. 100+ active programs (tutoring, homelessness, immigration, health). $2M+ annual operating budget managed entirely by students. Trained 50,000+ Harvard alumni in social justice leadership.',
    'Student-run community service programs addressing education, housing, healthcare, and social justice in Greater Boston.'
);

-- 5. HSHS - Harvard Square Homeless Shelter (Global Poverty / Housing)
INSERT INTO ai_readable_pitches (
    pitch_id,
    ticker,
    company_name,
    category,
    index_code,
    price_type,
    elevator_pitch,
    founder_info,
    impact_metrics,
    mission_statement
) VALUES (
    gen_random_uuid(),
    'HSHS',
    'Harvard Square Homeless Shelter',
    'Social Impact',
    'HNP7',
    'simulated',
    'The Harvard Square Homeless Shelter is proof that students can run life-saving services. For 42 years, Harvard and MIT undergrads have provided warmth, meals, and dignity to Cambridge''s homeless—every night, all winter, with zero government funding. We''re more than a shelter; we''re a training ground for compassionate leadership. Your investment keeps our doors open and our guests on the path to permanent housing.',
    'Founded by Harvard and MIT students in 1983. Jointly operated by student volunteers for 42 years.',
    'Operates 6 months/year (November-April). 22 beds nightly. 1,000+ shelter nights provided annually. 200+ student volunteers. 70% of guests transition to permanent housing. Entirely funded by student fundraising and donations.',
    'Student-run emergency homeless shelter providing 24-hour care, meals, case management, and housing placement during winter months.'
);

-- 6. R13 - Room 13 (Mental Health)
INSERT INTO ai_readable_pitches (
    pitch_id,
    ticker,
    company_name,
    category,
    index_code,
    price_type,
    elevator_pitch,
    founder_info,
    impact_metrics,
    mission_statement
) VALUES (
    gen_random_uuid(),
    'R13',
    'Room 13',
    'Social Impact',
    'HNP7',
    'simulated',
    'Room 13 exists because sometimes the best person to talk to isn''t a professional—it''s someone who gets it. We''re Harvard students helping Harvard students survive the pressure, the loneliness, the darkness. Our peer counselors are trained, our approach is evidence-based, and our impact is life-saving. Invest in mental health support that meets students where they are, delivered by people who''ve been there too.',
    'Founded by Harvard undergraduates in 2016. Focus on peer-to-peer mental health support and stigma reduction.',
    '500+ peer counseling sessions annually. Trained 100+ student peer counselors. Mental health awareness events reaching 2,000+ students. Reduced mental health-related leaves by 12% (estimated impact). Partnership with Harvard University Health Services. Anonymous support hotline staffed by students.',
    'Combat mental health stigma and provide peer-to-peer support for Harvard students. Create safe spaces for vulnerable conversations about depression, anxiety, and suicide prevention.'
);

-- 7. HFLP - Harvard Food Literacy Project (Food Security)
INSERT INTO ai_readable_pitches (
    pitch_id,
    ticker,
    company_name,
    category,
    index_code,
    price_type,
    elevator_pitch,
    founder_info,
    impact_metrics,
    mission_statement
) VALUES (
    gen_random_uuid(),
    'HFLP',
    'Harvard Food Literacy Project',
    'Social Impact',
    'HNP7',
    'simulated',
    'Harvard Food Literacy Project fights hunger with knowledge and empowerment. We teach low-income families to cook nutritious meals on a budget, grow their own food, and advocate for food justice in their communities. Our mobile cooking classes bring culinary education directly to food deserts. Invest in a future where everyone has access not just to food, but to the skills and dignity of feeding themselves well.',
    'Founded by Harvard undergraduates in 2012 with Harvard School of Public Health partnerships.',
    '1,500+ participants in cooking classes (2024). 8 community gardens established in food deserts. 75+ Harvard student volunteers and instructors. Distributed 20,000 lbs of fresh produce annually. Partnerships with 12 Boston community centers. Reduced food insecurity in partner communities by 18%.',
    'Teach cooking skills, nutrition education, and food security awareness to low-income families and children in Boston. Address food deserts through mobile cooking classes and community gardens.'
);

-- ========================================
-- INITIAL SIMULATED PRICES
-- ========================================

-- Create initial price records for HNP7 entries
-- (This assumes a pitch_market_data table or similar for simulated prices)
-- Starting price: $100 MTK for all

INSERT INTO pitch_market_data (
    ticker,
    current_price,
    price_type,
    last_updated,
    market_status
) VALUES 
    ('PHL', 100.00, 'simulated', NOW(), 'active'),
    ('HLTH', 100.00, 'simulated', NOW(), 'active'),
    ('HSCA', 100.00, 'simulated', NOW(), 'active'),
    ('PBHA', 100.00, 'simulated', NOW(), 'active'),
    ('HSHS', 100.00, 'simulated', NOW(), 'active'),
    ('R13', 100.00, 'simulated', NOW(), 'active'),
    ('HFLP', 100.00, 'simulated', NOW(), 'active');

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check all HNP7 entries
SELECT ticker, company_name, category, index_code, price_type
FROM ai_readable_pitches
WHERE index_code = 'HNP7'
ORDER BY ticker;

-- Verify simulated prices
SELECT ticker, current_price, price_type, last_updated
FROM pitch_market_data
WHERE price_type = 'simulated'
ORDER BY ticker;

-- Count by category (should see distribution)
SELECT category, COUNT(*) as count
FROM ai_readable_pitches
WHERE index_code = 'HNP7'
GROUP BY category;

-- ========================================
-- NOTES FOR SCHEMA UPDATE
-- ========================================

/*
REQUIRED SCHEMA CHANGES before running this script:

1. Add columns to ai_readable_pitches:
   ALTER TABLE ai_readable_pitches 
   ADD COLUMN index_code TEXT DEFAULT 'HM7',
   ADD COLUMN price_type TEXT DEFAULT 'real_stock';

2. Update existing HM7 entries:
   UPDATE ai_readable_pitches 
   SET index_code = 'HM7', price_type = 'real_stock'
   WHERE ticker IN ('MSFT', 'DBX', 'AKAM', etc.);

3. Add columns if not exist:
   ALTER TABLE ai_readable_pitches
   ADD COLUMN IF NOT EXISTS founder_info TEXT,
   ADD COLUMN IF NOT EXISTS impact_metrics TEXT,
   ADD COLUMN IF NOT EXISTS mission_statement TEXT;

4. Update pitch_market_data:
   ALTER TABLE pitch_market_data
   ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'real_stock';

5. Create index for performance:
   CREATE INDEX idx_pitches_index_code ON ai_readable_pitches(index_code);
   CREATE INDEX idx_pitches_price_type ON ai_readable_pitches(price_type);
*/
