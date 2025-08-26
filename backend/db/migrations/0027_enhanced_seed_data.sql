-- Migration: Enhanced Seed Data with Rich Custom Properties
-- This migration adds more people records and populates custom properties with meaningful values
-- to demonstrate the progressive disclosure system working with real data

-- ============================================================================
-- 1) Add more diverse people records with realistic data
-- ============================================================================

-- Add 20 more leads with varied demographics and engagement levels
INSERT INTO people (id, org_id, first_name, last_name, email, phone, lifecycle_state, lead_score, conversion_probability, 
                   date_of_birth, nationality, address_line1, address_line2, city, postcode, country,
                   phone_country_code, phone_number, phone_extension, preferred_contact_method,
                   touchpoint_count, last_engagement_date, engagement_score) VALUES
-- High-value leads with rich data
('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440000', 'Zara', 'Patel', 'zara.patel@hotmail.com', '+44 7801 234567', 'lead', 96, 0.91, 
 '2000-03-15', 'British', 'Flat 3B', '45 Queens Road', 'Manchester', 'M1 1AA', 'United Kingdom',
 '+44', '7801234567', NULL, 'email', 12, '2025-08-20 14:30:00', 85),

('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440000', 'Liam', 'O''Connor', 'liam.oconnor@gmail.com', '+44 7802 345678', 'lead', 94, 0.88,
 '1999-07-22', 'Irish', '12 St. Patrick''s Street', NULL, 'Birmingham', 'B1 1BB', 'United Kingdom',
 '+44', '7802345678', NULL, 'phone', 15, '2025-08-21 09:15:00', 88),

('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440000', 'Aisha', 'Khan', 'aisha.khan@yahoo.com', '+44 7803 456789', 'lead', 93, 0.87,
 '2001-11-08', 'British', '78 High Street', 'Apt 5', 'Leeds', 'LS1 1CC', 'United Kingdom',
 '+44', '7803456789', NULL, 'email', 18, '2025-08-22 16:45:00', 92),

('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440000', 'Connor', 'Murphy', 'connor.murphy@outlook.com', '+44 7804 567890', 'lead', 89, 0.83,
 '2000-05-14', 'Irish', '23 Church Lane', NULL, 'Liverpool', 'L1 1DD', 'United Kingdom',
 '+44', '7804567890', NULL, 'phone', 14, '2025-08-19 11:20:00', 86),

('550e8400-e29b-41d4-a716-446655440035', '550e8400-e29b-41d4-a716-446655440000', 'Fatima', 'Ahmed', 'fatima.ahmed@icloud.com', '+44 7805 678901', 'lead', 91, 0.85,
 '2001-09-30', 'British', '56 Park Avenue', 'Suite 2', 'Sheffield', 'S1 1EE', 'United Kingdom',
 '+44', '7805678901', NULL, 'email', 16, '2025-08-23 13:10:00', 89),

-- International leads
('550e8400-e29b-41d4-a716-446655440036', '550e8400-e29b-41d4-a716-446655440000', 'Hans', 'Müller', 'hans.mueller@web.de', '+49 170 1234567', 'lead', 87, 0.81,
 '2000-12-03', 'German', 'Hauptstraße 123', NULL, 'Berlin', '10115', 'Germany',
 '+49', '1701234567', NULL, 'email', 13, '2025-08-18 15:30:00', 84),

('550e8400-e29b-41d4-a716-446655440037', '550e8400-e29b-41d4-a716-446655440000', 'Marie', 'Dubois', 'marie.dubois@orange.fr', '+33 6 12 34 56 78', 'lead', 86, 0.80,
 '2001-04-17', 'French', '123 Rue de la Paix', 'Appartement 4', 'Paris', '75001', 'France',
 '+33', '612345678', NULL, 'email', 11, '2025-08-17 10:45:00', 82),

('550e8400-e29b-41d4-a716-446655440038', '550e8400-e29b-41d4-a716-446655440000', 'Marco', 'Rossi', 'marco.rossi@libero.it', '+39 333 1234567', 'lead', 84, 0.78,
 '2000-08-25', 'Italian', 'Via Roma 456', NULL, 'Milan', '20121', 'Italy',
 '+39', '3331234567', NULL, 'phone', 12, '2025-08-16 14:20:00', 80),

-- Mature students
('550e8400-e29b-41d4-a716-446655440039', '550e8400-e29b-41d4-a716-446655440000', 'Jennifer', 'Thompson', 'jenny.t@btinternet.com', '+44 7806 789012', 'lead', 82, 0.76,
 '1985-02-11', 'British', '34 Oak Drive', NULL, 'Bristol', 'BS1 1FF', 'United Kingdom',
 '+44', '7806789012', NULL, 'email', 10, '2025-08-15 09:30:00', 78),

('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440000', 'Robert', 'Wilson', 'rob.wilson@sky.com', '+44 7807 890123', 'lead', 80, 0.74,
 '1988-06-19', 'British', '67 Pine Street', 'Flat 8', 'Newcastle', 'NE1 1GG', 'United Kingdom',
 '+44', '7807890123', NULL, 'phone', 9, '2025-08-14 16:15:00', 76),

-- Foundation students
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440000', 'Katie', 'Johnson', 'katie.j@virginmedia.com', '+44 7808 901234', 'lead', 78, 0.72,
 '2002-01-28', 'British', '89 Elm Road', NULL, 'Cardiff', 'CF1 1HH', 'United Kingdom',
 '+44', '7808901234', NULL, 'email', 8, '2025-08-13 12:45:00', 74),

('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440000', 'Tom', 'Davis', 'tom.davis@talktalk.net', '+44 7809 012345', 'lead', 76, 0.70,
 '2002-03-07', 'British', '12 Maple Avenue', 'Unit 3', 'Edinburgh', 'EH1 1II', 'United Kingdom',
 '+44', '7809012345', NULL, 'phone', 7, '2025-08-12 10:20:00', 72),

-- More diverse leads
('550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440000', 'Priya', 'Singh', 'priya.singh@gmail.com', '+44 7810 123456', 'lead', 88, 0.82,
 '2001-07-12', 'British', '45 Victoria Street', NULL, 'Glasgow', 'G1 1JJ', 'United Kingdom',
 '+44', '7810123456', NULL, 'email', 15, '2025-08-21 14:30:00', 85),

('550e8400-e29b-41d4-a716-446655440044', '550e8400-e29b-41d4-a716-446655440000', 'Ryan', 'O''Brien', 'ryan.obrien@yahoo.com', '+44 7811 234567', 'lead', 85, 0.79,
 '2000-10-05', 'Irish', '78 King Street', 'Apt 12', 'Dublin', 'D01 1KK', 'Ireland',
 '+353', '811234567', NULL, 'phone', 13, '2025-08-20 11:15:00', 83),

('550e8400-e29b-41d4-a716-446655440045', '550e8400-e29b-41d4-a716-446655440000', 'Sofia', 'Garcia', 'sofia.garcia@hotmail.com', '+44 7812 345678', 'lead', 83, 0.77,
 '2001-12-18', 'Spanish', '23 Queen''s Road', NULL, 'Barcelona', '08001', 'Spain',
 '+34', '812345678', NULL, 'email', 12, '2025-08-19 15:45:00', 81),

('550e8400-e29b-41d4-a716-446655440046', '550e8400-e29b-41d4-a716-446655440000', 'Alex', 'Taylor', 'alex.taylor@outlook.com', '+44 7813 456789', 'lead', 81, 0.75,
 '2000-04-09', 'British', '67 High Street', 'Flat 5', 'Oxford', 'OX1 1LL', 'United Kingdom',
 '+44', '7813456789', NULL, 'phone', 11, '2025-08-18 09:30:00', 79),

('550e8400-e29b-41d4-a716-446655440047', '550e8400-e29b-41d4-a716-446655440000', 'Emma', 'Brown', 'emma.brown@icloud.com', '+44 7814 567890', 'lead', 79, 0.73,
 '2001-06-21', 'British', '34 Church Lane', NULL, 'Cambridge', 'CB1 1MM', 'United Kingdom',
 '+44', '7814567890', NULL, 'email', 10, '2025-08-17 13:20:00', 77),

('550e8400-e29b-41d4-a716-446655440048', '550e8400-e29b-41d4-a716-446655440000', 'James', 'Miller', 'james.miller@btinternet.com', '+44 7815 678901', 'lead', 77, 0.71,
 '2000-11-14', 'British', '89 Park Avenue', 'Suite 7', 'York', 'YO1 1NN', 'United Kingdom',
 '+44', '7815678901', NULL, 'phone', 9, '2025-08-16 16:10:00', 75),

('550e8400-e29b-41d4-a716-446655440049', '550e8400-e29b-41d4-a716-446655440000', 'Olivia', 'Wilson', 'olivia.wilson@sky.com', '+44 7816 789012', 'lead', 75, 0.69,
 '2001-08-03', 'British', '12 Oak Drive', NULL, 'Bath', 'BA1 1OO', 'United Kingdom',
 '+44', '7816789012', NULL, 'email', 8, '2025-08-15 10:45:00', 73),

('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440000', 'William', 'Anderson', 'will.anderson@virginmedia.com', '+44 7817 890123', 'lead', 73, 0.67,
 '2000-01-26', 'British', '45 Pine Street', 'Flat 9', 'Brighton', 'BN1 1PP', 'United Kingdom',
 '+44', '7817890123', NULL, 'phone', 7, '2025-08-14 14:30:00', 71);

-- ============================================================================
-- 2) Add more applications for the new leads
-- ============================================================================

INSERT INTO applications (id, org_id, person_id, programme_id, intake_id, status, stage, assignee_user_id) VALUES
-- New leads with applications in various stages
('550e8400-e29b-41d4-a716-446655440417', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440301', 'open', 'submitted', '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440418', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440301', 'open', 'review', '550e8400-e29b-41d4-a716-446655440102'),
('550e8400-e29b-41d4-a716-446655440419', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440301', 'open', 'interview_scheduled', '550e8400-e29b-41d4-a716-446655440103'),
('550e8400-e29b-41d4-a716-446655440420', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440301', 'open', 'offer_made', '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440421', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440035', '550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440301', 'open', 'submitted', '550e8400-e29b-41d4-a716-446655440105'),
('550e8400-e29b-41d4-a716-446655440422', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440036', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440301', 'open', 'review', '550e8400-e29b-41d4-a716-446655440102'),
('550e8400-e29b-41d4-a716-446655440423', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440037', '550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440301', 'open', 'submitted', '550e8400-e29b-41d4-a716-446655440103'),
('550e8400-e29b-41d4-a716-446655440424', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440038', '550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440301', 'open', 'review', '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440425', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440039', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440301', 'open', 'submitted', '550e8400-e29b-41d4-a716-446655440104'),
('550e8400-e29b-41d4-a716-446655440426', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440301', 'open', 'review', '550e8400-e29b-41d4-a716-446655440102'),
('550e8400-e29b-41d4-a716-446655440427', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440301', 'open', 'submitted', '550e8400-e29b-41d4-a716-446655440105'),
('550e8400-e29b-41d4-a716-446655440428', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440301', 'open', 'review', '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440429', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440301', 'open', 'submitted', '550e8400-e29b-41d4-a716-446655440102'),
('550e8400-e29b-41d4-a716-446655440430', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440044', '550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440301', 'open', 'review', '550e8400-e29b-41d4-a716-446655440103'),
('550e8400-e29b-41d4-a716-446655440431', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440045', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440301', 'open', 'submitted', '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440432', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440046', '550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440301', 'open', 'review', '550e8400-e29b-41d4-a716-446655440102'),
('550e8400-e29b-41d4-a716-446655440433', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440047', '550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440301', 'open', 'submitted', '550e8400-e29b-41d4-a716-446655440103'),
('550e8400-e29b-41d4-a716-446655440434', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440048', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440301', 'open', 'review', '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440435', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440049', '550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440301', 'open', 'submitted', '550e8400-e29b-41d4-a716-446655440102'),
('550e8400-e29b-41d4-a716-446655440436', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440301', 'open', 'review', '550e8400-e29b-41d4-a716-446655440103');

-- ============================================================================
-- 3) Populate custom properties with rich, meaningful values
-- ============================================================================

-- First, let's populate the existing people columns that are already mapped
INSERT INTO custom_values (org_id, entity, entity_id, property_id, value, created_at)
SELECT
    p.org_id,
    'people' as entity,
    p.id as entity_id,
    cp.id as property_id,
    CASE
        -- Personal properties
        WHEN cp.name = 'first_name' THEN to_jsonb(p.first_name)
        WHEN cp.name = 'last_name' THEN to_jsonb(p.last_name)
        WHEN cp.name = 'email' THEN to_jsonb(p.email)
        WHEN cp.name = 'phone' THEN to_jsonb(p.phone)
        WHEN cp.name = 'date_of_birth' THEN to_jsonb(p.date_of_birth::text)
        WHEN cp.name = 'nationality' THEN to_jsonb(p.nationality)
        WHEN cp.name = 'address_line1' THEN to_jsonb(p.address_line1)
        WHEN cp.name = 'address_line2' THEN to_jsonb(p.address_line2)
        WHEN cp.name = 'city' THEN to_jsonb(p.city)
        WHEN cp.name = 'postcode' THEN to_jsonb(p.postcode)
        WHEN cp.name = 'country' THEN to_jsonb(p.country)
        WHEN cp.name = 'phone_country_code' THEN to_jsonb(p.phone_country_code)
        WHEN cp.name = 'phone_number' THEN to_jsonb(p.phone_number)
        WHEN cp.name = 'phone_extension' THEN to_jsonb(p.phone_extension)
        WHEN cp.name = 'preferred_contact_method' THEN to_jsonb(p.preferred_contact_method)
        WHEN cp.name = 'lead_score' THEN to_jsonb(p.lead_score)
        WHEN cp.name = 'engagement_score' THEN to_jsonb(p.engagement_score)
        WHEN cp.name = 'conversion_probability' THEN to_jsonb(p.conversion_probability)
        WHEN cp.name = 'touchpoint_count' THEN to_jsonb(p.touchpoint_count)
        WHEN cp.name = 'last_engagement_date' THEN to_jsonb(p.last_engagement_date::text)
        ELSE NULL
    END as value,
    NOW() as created_at
FROM people p
CROSS JOIN custom_properties cp
WHERE cp.entity = 'people'
  AND cp.org_id = p.org_id
  AND cp.is_system_managed = true
  AND cp.name IN (
    'first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'nationality',
    'address_line1', 'address_line2', 'city', 'postcode', 'country',
    'phone_country_code', 'phone_number', 'phone_extension', 'preferred_contact_method',
    'lead_score', 'engagement_score', 'conversion_probability', 'touchpoint_count', 'last_engagement_date'
  )
  AND (
    (cp.name = 'first_name' AND p.first_name IS NOT NULL) OR
    (cp.name = 'last_name' AND p.last_name IS NOT NULL) OR
    (cp.name = 'email' AND p.email IS NOT NULL) OR
    (cp.name = 'phone' AND p.phone IS NOT NULL) OR
    (cp.name = 'date_of_birth' AND p.date_of_birth IS NOT NULL) OR
    (cp.name = 'nationality' AND p.nationality IS NOT NULL) OR
    (cp.name = 'address_line1' AND p.address_line1 IS NOT NULL) OR
    (cp.name = 'address_line2' AND p.address_line2 IS NOT NULL) OR
    (cp.name = 'city' AND p.city IS NOT NULL) OR
    (cp.name = 'postcode' AND p.postcode IS NOT NULL) OR
    (cp.name = 'country' AND p.country IS NOT NULL) OR
    (cp.name = 'phone_country_code' AND p.phone_country_code IS NOT NULL) OR
    (cp.name = 'phone_number' AND p.phone_number IS NOT NULL) OR
    (cp.name = 'phone_extension' AND p.phone_extension IS NOT NULL) OR
    (cp.name = 'preferred_contact_method' AND p.preferred_contact_method IS NOT NULL) OR
    (cp.name = 'lead_score' AND p.lead_score IS NOT NULL) OR
    (cp.name = 'engagement_score' AND p.engagement_score IS NOT NULL) OR
    (cp.name = 'conversion_probability' AND p.conversion_probability IS NOT NULL) OR
    (cp.name = 'touchpoint_count' AND p.touchpoint_count IS NOT NULL) OR
    (cp.name = 'last_engagement_date' AND p.last_engagement_date IS NOT NULL)
  )
ON CONFLICT (org_id, entity, entity_id, property_id) DO NOTHING;

-- Now let's add rich values for the new custom properties that don't exist as columns
INSERT INTO custom_values (org_id, entity, entity_id, property_id, value, created_at)
SELECT
    p.org_id,
    'people' as entity,
    p.id as entity_id,
    cp.id as property_id,
    CASE
        -- Website engagement (simulated data)
        WHEN cp.name = 'website_pages_viewed' THEN to_jsonb(
            CASE 
                WHEN p.lead_score >= 90 THEN floor(random() * 20 + 30)::int  -- High-value leads: 30-50 pages
                WHEN p.lead_score >= 80 THEN floor(random() * 15 + 20)::int  -- Medium-value leads: 20-35 pages
                ELSE floor(random() * 10 + 10)::int                          -- Lower-value leads: 10-20 pages
            END
        )
        WHEN cp.name = 'website_time_spent' THEN to_jsonb(
            CASE 
                WHEN p.lead_score >= 90 THEN floor(random() * 60 + 120)::int  -- High-value: 120-180 min
                WHEN p.lead_score >= 80 THEN floor(random() * 45 + 75)::int   -- Medium-value: 75-120 min
                ELSE floor(random() * 30 + 45)::int                           -- Lower-value: 45-75 min
            END
        )
        WHEN cp.name = 'number_of_sessions' THEN to_jsonb(
            CASE 
                WHEN p.lead_score >= 90 THEN floor(random() * 8 + 12)::int    -- High-value: 12-20 sessions
                WHEN p.lead_score >= 80 THEN floor(random() * 6 + 8)::int     -- Medium-value: 8-14 sessions
                ELSE floor(random() * 4 + 6)::int                             -- Lower-value: 6-10 sessions
            END
        )
        WHEN cp.name = 'first_session' THEN to_jsonb(
            (CURRENT_DATE - interval '1 day' * (random() * 30 + 15))::text  -- 15-45 days ago
        )
        WHEN cp.name = 'time_last_session' THEN to_jsonb(
            (CURRENT_DATE - interval '1 day' * random() * 7)::text           -- 0-7 days ago
        )
        WHEN cp.name = 'first_page_seen' THEN to_jsonb(
            CASE 
                WHEN random() > 0.7 THEN '/courses/performance'
                WHEN random() > 0.5 THEN '/courses/production'
                WHEN random() > 0.3 THEN '/courses/foundation'
                ELSE '/home'
            END
        )
        
        -- Email engagement (simulated data)
        WHEN cp.name = 'marketing_emails_opened' THEN to_jsonb(
            CASE 
                WHEN p.lead_score >= 90 THEN floor(random() * 15 + 25)::int  -- High-value: 25-40 emails
                WHEN p.lead_score >= 80 THEN floor(random() * 10 + 15)::int  -- Medium-value: 15-25 emails
                ELSE floor(random() * 8 + 10)::int                           -- Lower-value: 10-18 emails
            END
        )
        WHEN cp.name = 'marketing_emails_clicked' THEN to_jsonb(
            CASE 
                WHEN p.lead_score >= 90 THEN floor(random() * 8 + 12)::int   -- High-value: 12-20 clicks
                WHEN p.lead_score >= 80 THEN floor(random() * 5 + 8)::int    -- Medium-value: 8-13 clicks
                ELSE floor(random() * 3 + 5)::int                            -- Lower-value: 5-8 clicks
            END
        )
        WHEN cp.name = 'marketing_emails_bounced' THEN to_jsonb(
            CASE 
                WHEN random() > 0.9 THEN floor(random() * 2 + 1)::int        -- 10% have bounces
                ELSE 0
            END
        )
        WHEN cp.name = 'first_marketing_email_open_date' THEN to_jsonb(
            (CURRENT_DATE - interval '1 day' * (random() * 20 + 10))::text  -- 10-30 days ago
        )
        WHEN cp.name = 'last_marketing_email_click_date' THEN to_jsonb(
            (CURRENT_DATE - interval '1 day' * random() * 5)::text           -- 0-5 days ago
        )
        
        -- UCAS data (for applicants and enrolled)
        WHEN cp.name = 'ucas_personal_id' AND p.lifecycle_state IN ('applicant', 'enrolled') THEN to_jsonb(
            'P' || floor(random() * 900000000 + 100000000)::text            -- P + 9-digit number
        )
        WHEN cp.name = 'ucas_application_number' AND p.lifecycle_state IN ('applicant', 'enrolled') THEN to_jsonb(
            floor(random() * 900000000 + 100000000)::text                    -- 9-digit number
        )
        WHEN cp.name = 'ucas_track_status' AND p.lifecycle_state IN ('applicant', 'enrolled') THEN to_jsonb(
            CASE 
                WHEN random() > 0.7 THEN 'Application received'
                WHEN random() > 0.5 THEN 'Under consideration'
                WHEN random() > 0.3 THEN 'Interview scheduled'
                ELSE 'Offer made'
            END
        )
        
        -- Academic preferences
        WHEN cp.name = 'course_preference' THEN to_jsonb(
            CASE 
                WHEN random() > 0.7 THEN 'BA (Hons) Professional Music (Performance)'
                WHEN random() > 0.5 THEN 'BA (Hons) Music Production'
                WHEN random() > 0.3 THEN 'MA Music Performance'
                ELSE 'Foundation Certificate in Music'
            END
        )
        WHEN cp.name = 'campus_preference' THEN to_jsonb(
            CASE 
                WHEN random() > 0.7 THEN 'London'
                WHEN random() > 0.5 THEN 'Manchester'
                WHEN random() > 0.3 THEN 'Birmingham'
                ELSE 'Online'
            END
        )
        WHEN cp.name = 'portfolio_provided' THEN to_jsonb(
            CASE 
                WHEN p.lifecycle_state IN ('applicant', 'enrolled') THEN random() > 0.3  -- 70% have portfolios
                ELSE random() > 0.7  -- 30% of leads have portfolios
            END
        )
        WHEN cp.name = 'music_links' THEN to_jsonb(
            CASE 
                WHEN random() > 0.6 THEN '["https://soundcloud.com/user1", "https://youtube.com/user1"]'
                WHEN random() > 0.3 THEN '["https://spotify.com/user1"]'
                ELSE '[]'
            END
        )
        WHEN cp.name = 'primary_discipline' THEN to_jsonb(
            CASE 
                WHEN random() > 0.7 THEN 'Piano'
                WHEN random() > 0.5 THEN 'Guitar'
                WHEN random() > 0.3 THEN 'Vocals'
                WHEN random() > 0.2 THEN 'Drums'
                ELSE 'Strings'
            END
        )
        
        -- Attribution data
        WHEN cp.name = 'source_of_enquiry' THEN to_jsonb(
            CASE 
                WHEN random() > 0.7 THEN 'Website'
                WHEN random() > 0.5 THEN 'Social Media'
                WHEN random() > 0.3 THEN 'Open Day'
                WHEN random() > 0.2 THEN 'Referral'
                ELSE 'Google Search'
            END
        )
        WHEN cp.name = 'hs_analytics_source' THEN to_jsonb(
            CASE 
                WHEN random() > 0.7 THEN 'google'
                WHEN random() > 0.5 THEN 'facebook'
                WHEN random() > 0.3 THEN 'instagram'
                WHEN random() > 0.2 THEN 'linkedin'
                ELSE 'direct'
            END
        )
        WHEN cp.name = 'hs_latest_source' THEN to_jsonb(
            CASE 
                WHEN random() > 0.7 THEN 'google'
                WHEN random() > 0.5 THEN 'facebook'
                WHEN random() > 0.3 THEN 'instagram'
                WHEN random() > 0.2 THEN 'linkedin'
                ELSE 'direct'
            END
        )
        WHEN cp.name = 'hs_latest_source_timestamp' THEN to_jsonb(
            (CURRENT_DATE - interval '1 day' * random() * 10)::text          -- 0-10 days ago
        )
        
        -- AI insights (simulated)
        WHEN cp.name = 'next_best_action' THEN to_jsonb(
            CASE 
                WHEN p.lead_score >= 90 THEN 'Schedule interview'
                WHEN p.lead_score >= 80 THEN 'Send course information'
                WHEN p.lead_score >= 70 THEN 'Follow up with portfolio request'
                ELSE 'Send welcome email'
            END
        )
        WHEN cp.name = 'next_best_action_confidence' THEN to_jsonb(
            CASE 
                WHEN p.lead_score >= 90 THEN round((random() * 0.15 + 0.85)::numeric, 2)  -- 85-100%
                WHEN p.lead_score >= 80 THEN round((random() * 0.20 + 0.75)::numeric, 2)  -- 75-95%
                WHEN p.lead_score >= 70 THEN round((random() * 0.25 + 0.65)::numeric, 2)  -- 65-90%
                ELSE round((random() * 0.30 + 0.55)::numeric, 2)                         -- 55-85%
            END
        )
        
        ELSE NULL
    END as value,
    NOW() as created_at
FROM people p
CROSS JOIN custom_properties cp
WHERE cp.entity = 'people'
  AND cp.org_id = p.org_id
  AND cp.is_system_managed = true
  AND cp.name IN (
    'website_pages_viewed', 'website_time_spent', 'number_of_sessions', 'first_session', 'time_last_session',
    'first_page_seen', 'marketing_emails_opened', 'marketing_emails_clicked', 'marketing_emails_bounced',
    'first_marketing_email_open_date', 'last_marketing_email_click_date', 'ucas_personal_id', 'ucas_application_number',
    'ucas_track_status', 'course_preference', 'campus_preference', 'portfolio_provided', 'music_links',
    'primary_discipline', 'source_of_enquiry', 'hs_analytics_source', 'hs_latest_source', 'hs_latest_source_timestamp',
    'next_best_action', 'next_best_action_confidence'
  )
ON CONFLICT (org_id, entity, entity_id, property_id) DO NOTHING;

-- ============================================================================
-- 4) Refresh materialized views to include new data
-- ============================================================================

REFRESH MATERIALIZED VIEW vw_board_applications;
REFRESH MATERIALIZED VIEW vw_people_enriched;

-- ============================================================================
-- 5) Verification queries
-- ============================================================================

-- Show the enhanced data distribution
SELECT 
    'Enhanced Seed Data Summary' as summary,
    COUNT(DISTINCT p.id) as total_people,
    COUNT(DISTINCT CASE WHEN p.lifecycle_state = 'lead' THEN p.id END) as total_leads,
    COUNT(DISTINCT CASE WHEN p.lifecycle_state = 'applicant' THEN p.id END) as total_applicants,
    COUNT(DISTINCT CASE WHEN p.lifecycle_state = 'enrolled' THEN p.id END) as total_enrolled,
    COUNT(DISTINCT cv.id) as total_custom_values,
    COUNT(DISTINCT cv.entity_id) as people_with_custom_values
FROM people p
LEFT JOIN custom_values cv ON p.id = cv.entity_id AND cv.entity = 'people'
WHERE p.org_id = '550e8400-e29b-41d4-a716-446655440000';

-- Show custom properties with values (not nulls)
SELECT 
    cp.group_key,
    cp.name,
    COUNT(cv.value) as records_with_values,
    COUNT(*) as total_records,
    ROUND(COUNT(cv.value)::numeric / COUNT(*) * 100, 1) as percentage_filled
FROM custom_properties cp
LEFT JOIN custom_values cv ON cp.id = cv.property_id AND cv.entity = 'people'
WHERE cp.org_id = '550e8400-e29b-41d4-a716-446655440000'
  AND cp.is_system_managed = true
GROUP BY cp.group_key, cp.name, cp.display_order
ORDER BY cp.group_key, cp.display_order;
