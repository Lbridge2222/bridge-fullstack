-- Migration: Comprehensive Realistic Lead Data for Bridge Academy
-- This migration creates realistic leads with proper applications linking to existing academic programmes
-- Respects the existing Bridge Academy context and conventions

-- ============================================================================
-- 1) Clear existing data and ensure base org/users exist
-- ============================================================================

-- Clear existing leads to avoid conflicts (keep the framework data)
DELETE FROM people WHERE id::text LIKE '550e8400-e29b-41d4-a716-446655441%'; -- Use 441xxx for new leads
DELETE FROM applications WHERE id::text LIKE '550e8400-e29b-41d4-a716-446655441%';

-- Ensure base organization exists
INSERT INTO orgs (id, name) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Bridge Academy')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2) Create additional campuses if needed (preserve existing campus structure)
-- ============================================================================

-- Add more campuses for the music academy
INSERT INTO campuses (id, org_id, name) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'London Campus'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Manchester Campus'),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Birmingham Campus'),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Online Campus')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3) Update existing programmes to link to campuses and add more academic programmes
-- ============================================================================

-- Update existing programmes to have campus links
UPDATE programmes SET campus_id = '550e8400-e29b-41d4-a716-446655440001' 
WHERE id = '550e8400-e29b-41d4-a716-446655440201' AND campus_id IS NULL; -- Performance programme -> London

UPDATE programmes SET campus_id = '550e8400-e29b-41d4-a716-446655440002' 
WHERE id = '550e8400-e29b-41d4-a716-446655440202' AND campus_id IS NULL; -- Production programme -> Manchester

UPDATE programmes SET campus_id = '550e8400-e29b-41d4-a716-446655440001' 
WHERE id = '550e8400-e29b-41d4-a716-446655440203' AND campus_id IS NULL; -- MA programme -> London

UPDATE programmes SET campus_id = '550e8400-e29b-41d4-a716-446655440003' 
WHERE id = '550e8400-e29b-41d4-a716-446655440204' AND campus_id IS NULL; -- Foundation -> Birmingham

-- Add more academic programmes to provide variety
INSERT INTO programmes (id, org_id, campus_id, code, name, level, mode) VALUES
('550e8400-e29b-41d4-a716-446655440205', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'ENG-001', 'BEng (Hons) Software Engineering', 'undergraduate', 'full-time'),
('550e8400-e29b-41d4-a716-446655440206', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'ART-001', 'BA (Hons) Fine Arts', 'undergraduate', 'full-time'),
('550e8400-e29b-41d4-a716-446655440207', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440003', 'LAW-001', 'LLB (Hons) Law', 'undergraduate', 'full-time'),
('550e8400-e29b-41d4-a716-446655440208', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'MED-001', 'MBBS Medicine', 'undergraduate', 'full-time'),
('550e8400-e29b-41d4-a716-446655440209', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440004', 'ONLN-001', 'Certificate in Digital Marketing (Online)', 'certificate', 'part-time'),
('550e8400-e29b-41d4-a716-446655440210', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'EDU-001', 'BA (Hons) Education Studies', 'undergraduate', 'full-time')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4) Ensure intake periods exist
-- ============================================================================

INSERT INTO intakes (id, org_id, cycle_label, start_date, end_date) VALUES
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440000', '2025/26', '2025-09-01', '2026-06-30'),
('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440000', '2024/25', '2024-09-01', '2025-06-30'),
('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440000', '2026/27', '2026-09-01', '2027-06-30')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5) Ensure users exist for application assignments
-- ============================================================================

INSERT INTO users (id, org_id, name, email, role) VALUES
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440000', 'Sarah Johnson', 'sarah.johnson@bridge.ac.uk', 'admissions_manager'),
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440000', 'Michael Chen', 'michael.chen@bridge.ac.uk', 'admissions_officer'),
('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440000', 'Emma Williams', 'emma.williams@bridge.ac.uk', 'admissions_officer'),
('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440000', 'David Brown', 'david.brown@bridge.ac.uk', 'admissions_officer'),
('550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440000', 'Lisa Davis', 'lisa.davis@bridge.ac.uk', 'foundation_coordinator')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6) Create 150 realistic academic leads with varied timestamps and realistic data
-- ============================================================================

INSERT INTO people (
    id, org_id, first_name, last_name, email, phone, lifecycle_state, 
    lead_score, conversion_probability, date_of_birth, nationality, 
    address_line1, address_line2, city, postcode, country,
    phone_country_code, phone_number, phone_extension, preferred_contact_method,
    touchpoint_count, last_engagement_date, engagement_score, 
    assigned_to, status, next_follow_up, created_at, updated_at
)
SELECT 
    ('550e8400-e29b-41d4-a716-446655441' || lpad(n::text, 3, '0'))::uuid,
    '550e8400-e29b-41d4-a716-446655440000',
    first_names[floor(random() * array_length(first_names, 1)) + 1],
    last_names[floor(random() * array_length(last_names, 1)) + 1],
    lower(first_names[floor(random() * array_length(first_names, 1)) + 1] || '.' || 
          last_names[floor(random() * array_length(last_names, 1)) + 1] || 
          '.' || n::text ||  -- Add unique number to ensure uniqueness
          CASE floor(random() * 6)
              WHEN 0 THEN '@gmail.com'
              WHEN 1 THEN '@hotmail.com'
              WHEN 2 THEN '@yahoo.com'
              WHEN 3 THEN '@outlook.com'
              WHEN 4 THEN '@icloud.com'
              ELSE '@protonmail.com'
          END),
    '+44 ' || (7000 + floor(random() * 1000))::text || ' ' || 
    lpad(floor(random() * 1000000)::text, 6, '0'),
    'lead',
    -- Lead score correlated with conversion probability but with some variation
    CASE 
        WHEN random() > 0.85 THEN floor(random() * 20 + 80)  -- 15% high-value leads (80-100)
        WHEN random() > 0.65 THEN floor(random() * 20 + 60)  -- 20% medium-high leads (60-80)
        WHEN random() > 0.35 THEN floor(random() * 20 + 40)  -- 30% medium leads (40-60)
        ELSE floor(random() * 20 + 20)                       -- 35% low leads (20-40)
    END,
    -- Conversion probability with realistic distribution
    CASE 
        WHEN random() > 0.85 THEN round((random() * 0.25 + 0.7)::numeric, 2)  -- High: 70-95%
        WHEN random() > 0.65 THEN round((random() * 0.25 + 0.5)::numeric, 2)  -- Medium-high: 50-75%
        WHEN random() > 0.35 THEN round((random() * 0.25 + 0.25)::numeric, 2) -- Medium: 25-50%
        ELSE round((random() * 0.25 + 0.05)::numeric, 2)                      -- Low: 5-30%
    END,
    -- Date of birth (18-35 years old, typical university students)
    ((2006 - floor(random() * 17))::text || '-' || 
     lpad(floor(random() * 12 + 1)::text, 2, '0') || '-' || 
     lpad(floor(random() * 28 + 1)::text, 2, '0'))::date,
    nationalities[floor(random() * array_length(nationalities, 1)) + 1],
    addresses[floor(random() * array_length(addresses, 1)) + 1],
    CASE WHEN random() > 0.7 THEN 'Flat ' || chr(65 + floor(random() * 3)::int) ELSE NULL END,
    cities[floor(random() * array_length(cities, 1)) + 1],
    postcodes[floor(random() * array_length(postcodes, 1)) + 1],
    'United Kingdom',
    '+44',
    (7000 + floor(random() * 1000))::text || lpad(floor(random() * 1000000)::text, 6, '0'),
    NULL,
    CASE floor(random() * 3)
        WHEN 0 THEN 'email'
        WHEN 1 THEN 'phone'
        ELSE 'email'
    END,
    floor(random() * 25 + 1),  -- 1-25 touchpoints
    -- Last engagement varied from 1-60 days ago
    NOW() - interval '1 day' * floor(random() * 60 + 1),
    floor(random() * 40 + 40), -- Engagement score 40-80
    -- Assigned to various team members
    CASE floor(random() * 5)
        WHEN 0 THEN 'Sarah Johnson'
        WHEN 1 THEN 'Michael Chen'
        WHEN 2 THEN 'Emma Williams'
        WHEN 3 THEN 'David Brown'
        ELSE 'Lisa Davis'
    END,
    CASE floor(random() * 4)
        WHEN 0 THEN 'new'
        WHEN 1 THEN 'contacted'
        WHEN 2 THEN 'qualified'
        ELSE 'nurturing'
    END,
    -- Next follow up in next 1-14 days
    (NOW() + interval '1 day' * floor(random() * 14 + 1))::date,
    -- Created at: varied over last 90 days with more recent leads
    NOW() - interval '1 day' * floor(power(random(), 2) * 90), -- Skewed towards recent
    NOW() - interval '1 day' * floor(random() * 7) -- Updated within last week
FROM generate_series(1, 150) AS n
CROSS JOIN (
    SELECT 
        ARRAY['Emma', 'Oliver', 'Sophia', 'Harry', 'Ava', 'Jack', 'Isabella', 'Charlie', 'Mia', 'George',
              'Grace', 'Noah', 'Lily', 'Jacob', 'Poppy', 'Thomas', 'Freya', 'Oscar', 'Isla', 'William',
              'Emily', 'James', 'Amelia', 'Henry', 'Evie', 'Leo', 'Ella', 'Alexander', 'Charlotte', 'Mason',
              'Chloe', 'Lucas', 'Lucy', 'Daniel', 'Ruby', 'Benjamin', 'Daisy', 'Sebastian', 'Sophie', 'Ethan',
              'Zoe', 'Felix', 'Maya', 'Adam', 'Phoebe', 'Louis', 'Scarlett', 'David', 'Aria', 'Arthur'] as first_names,
        ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
              'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
              'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
              'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
              'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'] as last_names,
        ARRAY['British', 'English', 'Scottish', 'Welsh', 'Irish', 'German', 'French', 'Italian', 'Spanish', 'Polish',
              'Romanian', 'Portuguese', 'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Belgian', 'Austrian', 'Swiss'] as nationalities,
        ARRAY['12 High Street', '45 Church Lane', '78 Park Road', '23 Victoria Street', '56 King Street', '89 Queen Street',
              '34 Mill Lane', '67 Oak Avenue', '123 Elm Road', '456 Pine Street', '789 Maple Drive', '321 Cedar Way',
              '654 Birch Close', '987 Ash Grove', '147 Willow Court', '258 Holly Road', '369 Rose Street', '741 Lily Lane'] as addresses,
        ARRAY['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Sheffield', 'Bristol', 'Newcastle', 'Nottingham',
              'Cardiff', 'Glasgow', 'Edinburgh', 'Leicester', 'Coventry', 'Bradford', 'Stoke-on-Trent', 'Wolverhampton',
              'Plymouth', 'Southampton', 'Reading', 'Derby', 'Northampton', 'Portsmouth', 'Luton', 'Preston', 'Milton Keynes'] as cities,
        ARRAY['M1 1AA', 'B1 1BB', 'LS1 1CC', 'L1 1DD', 'S1 1EE', 'BS1 1FF', 'NE1 1GG', 'NG1 1HH', 'CF1 1II',
              'G1 1JJ', 'EH1 1KK', 'LE1 1LL', 'CV1 1MM', 'BD1 1NN', 'ST1 1OO', 'WV1 1PP', 'PL1 1QQ', 'SO1 1RR',
              'RG1 1SS', 'DE1 1TT', 'NN1 1UU', 'PO1 1VV', 'LU1 1WW', 'PR1 1XX', 'MK1 1YY', 'OX1 1ZZ'] as postcodes
) as data;

-- ============================================================================
-- 7) Create applications linking leads to academic programmes
-- ============================================================================

-- Create applications for leads to establish course/campus connections
INSERT INTO applications (id, org_id, person_id, programme_id, intake_id, status, stage, assignee_user_id, created_at, updated_at)
SELECT 
    ('550e8400-e29b-41d4-a716-446655441' || lpad(n::text, 3, '0'))::uuid,
    '550e8400-e29b-41d4-a716-446655440000',
    ('550e8400-e29b-41d4-a716-446655441' || lpad(n::text, 3, '0'))::uuid,
    -- Distribute across all available academic programmes
    CASE (n % 10)
        WHEN 0 THEN '550e8400-e29b-41d4-a716-446655440201'::uuid  -- Business Management
        WHEN 1 THEN '550e8400-e29b-41d4-a716-446655440202'::uuid  -- Computer Science
        WHEN 2 THEN '550e8400-e29b-41d4-a716-446655440203'::uuid  -- Psychology
        WHEN 3 THEN '550e8400-e29b-41d4-a716-446655440204'::uuid  -- Foundation
        WHEN 4 THEN '550e8400-e29b-41d4-a716-446655440205'::uuid  -- Software Engineering
        WHEN 5 THEN '550e8400-e29b-41d4-a716-446655440206'::uuid  -- Fine Arts
        WHEN 6 THEN '550e8400-e29b-41d4-a716-446655440207'::uuid  -- Law
        WHEN 7 THEN '550e8400-e29b-41d4-a716-446655440208'::uuid  -- Medicine
        WHEN 8 THEN '550e8400-e29b-41d4-a716-446655440209'::uuid  -- Digital Marketing
        ELSE '550e8400-e29b-41d4-a716-446655440210'::uuid          -- Education Studies
    END,
    -- Distribute across intake periods
    CASE (n % 3)
        WHEN 0 THEN '550e8400-e29b-41d4-a716-446655440301'::uuid  -- 2025/26
        WHEN 1 THEN '550e8400-e29b-41d4-a716-446655440302'::uuid  -- 2024/25
        ELSE '550e8400-e29b-41d4-a716-446655440303'::uuid          -- 2026/27
    END,
    'open',
    -- Realistic stage distribution
    CASE (n % 6)
        WHEN 0 THEN 'enquiry'
        WHEN 1 THEN 'submitted'
        WHEN 2 THEN 'review'
        WHEN 3 THEN 'interview_scheduled'
        WHEN 4 THEN 'offer_made'
        ELSE 'accepted'
    END,
    -- Assign to team members
    CASE (n % 5)
        WHEN 0 THEN '550e8400-e29b-41d4-a716-446655440101'::uuid
        WHEN 1 THEN '550e8400-e29b-41d4-a716-446655440102'::uuid
        WHEN 2 THEN '550e8400-e29b-41d4-a716-446655440103'::uuid
        WHEN 3 THEN '550e8400-e29b-41d4-a716-446655440104'::uuid
        ELSE '550e8400-e29b-41d4-a716-446655440105'::uuid
    END,
    NOW() - interval '1 day' * floor(power(random(), 2) * 90), -- Created with people
    NOW() - interval '1 day' * floor(random() * 7)             -- Updated recently
FROM generate_series(1, 150) AS n;

-- ============================================================================
-- 8) Summary query
-- ============================================================================

SELECT 
    'Migration Complete - Bridge Academy Data' as status,
    COUNT(DISTINCT p.id) as total_leads,
    COUNT(DISTINCT a.id) as total_applications,
    COUNT(DISTINCT pr.id) as total_programmes,
    COUNT(DISTINCT c.id) as total_campuses,
    COUNT(CASE WHEN p.lead_score >= 80 THEN 1 END) as high_value_leads,
    COUNT(CASE WHEN p.lead_score < 50 THEN 1 END) as low_value_leads,
    COUNT(CASE WHEN p.last_engagement_date > NOW() - INTERVAL '7 days' THEN 1 END) as recent_leads,
    COUNT(CASE WHEN p.last_engagement_date < NOW() - INTERVAL '30 days' THEN 1 END) as cold_leads
FROM people p
LEFT JOIN applications a ON a.person_id = p.id
LEFT JOIN programmes pr ON pr.org_id = p.org_id
LEFT JOIN campuses c ON c.org_id = p.org_id
WHERE p.id::text LIKE '550e8400-e29b-41d4-a716-446655441%';

-- Show programme distribution
SELECT 
    pr.name as programme_name,
    c.name as campus_name,
    COUNT(a.id) as application_count
FROM programmes pr
LEFT JOIN campuses c ON c.id = pr.campus_id
LEFT JOIN applications a ON a.programme_id = pr.id AND a.id::text LIKE '550e8400-e29b-41d4-a716-446655441%'
WHERE pr.org_id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY pr.name, c.name, pr.id
ORDER BY pr.name;

-- ============================================================================
-- 9) Refresh materialized views to include new data
-- ============================================================================

-- Refresh the materialized view to include the new people data
REFRESH MATERIALIZED VIEW vw_people_enriched;