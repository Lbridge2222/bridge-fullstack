-- Migration: Comprehensive Seed Data (Schema Compliant)
-- This migration populates the database with realistic test data
-- All data conforms to the actual database schema

-- First, let's clear existing data to avoid conflicts
TRUNCATE TABLE people, applications, offers, enrolments, activities CASCADE;

-- Create organization first (skip if exists)
INSERT INTO orgs (id, name) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Bridge Music Academy')
ON CONFLICT (id) DO NOTHING;

-- Create users for assignees (skip if exists)
INSERT INTO users (id, org_id, name, email, role) VALUES
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440000', 'Sarah Johnson', 'admissions@bridge-music.ac.uk', 'admissions_officer'),
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440000', 'Michael Chen', 'careers@bridge-music.ac.uk', 'careers_advisor'),
('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440000', 'Emma Williams', 'international@bridge-music.ac.uk', 'international_officer'),
('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440000', 'David Brown', 'mature@bridge-music.ac.uk', 'mature_student_officer'),
('550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440000', 'Lisa Davis', 'foundation@bridge-music.ac.uk', 'foundation_coordinator')
ON CONFLICT (id) DO NOTHING;

-- Create programmes and intakes first (skip if exists)
INSERT INTO programmes (id, org_id, name, level, mode) VALUES
('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440000', 'BA (Hons) Professional Music (Performance)', 'Undergraduate', 'Full-time'),
('550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440000', 'BA (Hons) Music Production', 'Undergraduate', 'Full-time'),
('550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440000', 'MA Music Performance', 'Postgraduate', 'Full-time'),
('550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440000', 'Foundation Certificate in Music', 'Foundation', 'Full-time')
ON CONFLICT (id) DO NOTHING;

INSERT INTO intakes (id, org_id, cycle_label, start_date, end_date) VALUES
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440000', '2025/26', '2025-09-01', '2026-06-30'),
('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440000', '2024/25', '2024-09-01', '2025-06-30')
ON CONFLICT (id) DO NOTHING;

-- Seed People table with diverse lifecycle states - More realistic distribution
INSERT INTO people (id, org_id, first_name, last_name, email, phone, lifecycle_state, lead_score, conversion_probability) VALUES
-- High-value leads (lead stage) - 8 records for better lead board visibility
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Emma', 'Thompson', 'emma.thompson@gmail.com', '+44 7812 345678', 'lead', 95, 0.89),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'James', 'Wilson', 'james.wilson@yahoo.com', '+44 7912 345679', 'lead', 92, 0.85),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Sophie', 'Brown', 'sophie.brown@hotmail.com', '+44 7922 345680', 'lead', 88, 0.82),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Michael', 'Davis', 'michael.davis@outlook.com', '+44 7932 345681', 'lead', 85, 0.78),
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', 'Olivia', 'Miller', 'olivia.miller@icloud.com', '+44 7942 345682', 'lead', 90, 0.84),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440000', 'Charlotte', 'White', 'charlotte.white@gmail.com', '+44 7902 345698', 'lead', 87, 0.81),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440000', 'Henry', 'Clark', 'henry.clark@yahoo.com', '+44 7912 345699', 'lead', 83, 0.77),
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440000', 'Grace', 'Lewis', 'grace.lewis@hotmail.com', '+44 7922 345700', 'lead', 91, 0.86),

-- Additional leads (lead stage) - 6 records
('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440000', 'William', 'Garcia', 'william.garcia@gmail.com', '+44 7952 345683', 'lead', 78, 0.72),
('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440000', 'Ava', 'Rodriguez', 'ava.rodriguez@yahoo.com', '+44 7962 345684', 'lead', 82, 0.76),
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440000', 'Ethan', 'Martinez', 'ethan.martinez@hotmail.com', '+44 7972 345685', 'lead', 75, 0.68),
('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440000', 'Isabella', 'Anderson', 'isabella.anderson@outlook.com', '+44 7982 345686', 'lead', 80, 0.74),
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'Noah', 'Taylor', 'noah.taylor@icloud.com', '+44 7992 345687', 'lead', 77, 0.70),
('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440000', 'Daniel', 'Walker', 'daniel.walker@outlook.com', '+44 7932 345701', 'lead', 79, 0.73),

-- Current applicants - 8 records with various stages
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'Mia', 'Thomas', 'mia.thomas@gmail.com', '+44 7802 345688', 'applicant', 72, 0.65),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'Lucas', 'Hernandez', 'lucas.hernandez@yahoo.com', '+44 7812 345689', 'applicant', 68, 0.62),
('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440000', 'Amelia', 'Moore', 'amelia.moore@hotmail.com', '+44 7822 345690', 'applicant', 75, 0.68),
('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440000', 'Mason', 'Jackson', 'mason.jackson@outlook.com', '+44 7832 345691', 'applicant', 70, 0.64),
('550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440000', 'Harper', 'Martin', 'harper.martin@icloud.com', '+44 7842 345692', 'applicant', 73, 0.66),
('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440000', 'Scarlett', 'Young', 'scarlett.young@gmail.com', '+44 7942 345702', 'applicant', 71, 0.67),
('550e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440000', 'Jack', 'King', 'jack.king@yahoo.com', '+44 7952 345703', 'applicant', 69, 0.63),
('550e8400-e29b-41d4-a716-446655440027', '550e8400-e29b-41d4-a716-446655440000', 'Luna', 'Wright', 'luna.wright@hotmail.com', '+44 7962 345704', 'applicant', 74, 0.69),

-- Enrolled students - 8 records
('550e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440000', 'Evelyn', 'Lee', 'evelyn.lee@gmail.com', '+44 7852 345693', 'enrolled', 65, 0.58),
('550e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440000', 'Logan', 'Perez', 'logan.perez@yahoo.com', '+44 7862 345694', 'enrolled', 62, 0.55),
('550e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440000', 'Abigail', 'Roberts', 'abigail.roberts@hotmail.com', '+44 7872 345695', 'enrolled', 68, 0.60),
('550e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440000', 'Alexander', 'Turner', 'alexander.turner@outlook.com', '+44 7882 345696', 'enrolled', 60, 0.52),
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440000', 'Sofia', 'Phillips', 'sofia.phillips@icloud.com', '+44 7892 345697', 'enrolled', 63, 0.56),
('550e8400-e29b-41d4-a716-446655440028', '550e8400-e29b-41d4-a716-446655440000', 'Benjamin', 'Green', 'benjamin.green@gmail.com', '+44 7972 345705', 'enrolled', 61, 0.54),
('550e8400-e29b-41d4-a716-446655440029', '550e8400-e29b-41d4-a716-446655440000', 'Chloe', 'Adams', 'chloe.adams@yahoo.com', '+44 7982 345706', 'enrolled', 64, 0.57),
('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440000', 'Owen', 'Baker', 'owen.baker@hotmail.com', '+44 7992 345707', 'enrolled', 66, 0.59);

-- Create applications with more variety in stages - 16 total applications
INSERT INTO applications (id, org_id, person_id, programme_id, intake_id, status, stage, assignee_user_id) VALUES
-- Current cycle applications (2025/26) - Various stages - 8 applications
('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440301', 'open', 'submitted', '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440301', 'open', 'review', '550e8400-e29b-41d4-a716-446655440102'),
('550e8400-e29b-41d4-a716-446655440403', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440301', 'open', 'interview_scheduled', '550e8400-e29b-41d4-a716-446655440103'),
('550e8400-e29b-41d4-a716-446655440404', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440301', 'open', 'offer_made', '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440405', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440301', 'open', 'offer_accepted', '550e8400-e29b-41d4-a716-446655440105'),
('550e8400-e29b-41d4-a716-446655440411', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440301', 'open', 'submitted', '550e8400-e29b-41d4-a716-446655440102'),
('550e8400-e29b-41d4-a716-446655440412', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440301', 'open', 'review', '550e8400-e29b-41d4-a716-446655440103'),
('550e8400-e29b-41d4-a716-446655440413', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440027', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440301', 'open', 'interview_scheduled', '550e8400-e29b-41d4-a716-446655440101'),

-- Previous cycle applications (2024/25) - Mostly enrolled - 8 applications
('550e8400-e29b-41d4-a716-446655440406', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440302', 'closed', 'enrolled', '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440407', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440302', 'closed', 'enrolled', '550e8400-e29b-41d4-a716-446655440102'),
('550e8400-e29b-41d4-a716-446655440408', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440302', 'closed', 'enrolled', '550e8400-e29b-41d4-a716-446655440103'),
('550e8400-e29b-41d4-a716-446655440409', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440302', 'closed', 'enrolled', '550e8400-e29b-41d4-a716-446655440101'),
('550e8400-e29b-41d4-a716-446655440410', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440302', 'closed', 'enrolled', '550e8400-e29b-41d4-a716-446655440105'),
('550e8400-e29b-41d4-a716-446655440414', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440028', '550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440302', 'closed', 'enrolled', '550e8400-e29b-41d4-a716-446655440102'),
('550e8400-e29b-41d4-a716-446655440415', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440029', '550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440302', 'closed', 'enrolled', '550e8400-e29b-41d4-a716-446655440103'),
('550e8400-e29b-41d4-a716-446655440416', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440302', 'closed', 'enrolled', '550e8400-e29b-41d4-a716-446655440105');

-- Create offers - 10 total offers
INSERT INTO offers (id, org_id, application_id, type, status) VALUES
-- Current cycle offers - 3 offers
('550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440404', 'conditional', 'issued'),
('550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440405', 'unconditional', 'accepted'),
('550e8400-e29b-41d4-a716-446655440508', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440413', 'conditional', 'issued'),

-- Previous cycle offers - 7 offers (all accepted)
('550e8400-e29b-41d4-a716-446655440503', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440406', 'unconditional', 'accepted'),
('550e8400-e29b-41d4-a716-446655440504', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440407', 'conditional', 'accepted'),
('550e8400-e29b-41d4-a716-446655440505', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440408', 'unconditional', 'accepted'),
('550e8400-e29b-41d4-a716-446655440506', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440409', 'conditional', 'accepted'),
('550e8400-e29b-41d4-a716-446655440507', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440410', 'unconditional', 'accepted'),
('550e8400-e29b-41d4-a716-446655440509', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440414', 'conditional', 'accepted'),
('550e8400-e29b-41d4-a716-446655440510', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440415', 'unconditional', 'accepted');

-- Create enrollments - 8 total enrollments
INSERT INTO enrolments (id, org_id, application_id, fee_status, funding_route) VALUES
-- Previous cycle enrollments (2024/25) - 8 enrollments
('550e8400-e29b-41d4-a716-446655440601', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440406', 'home', 'self_funded'),
('550e8400-e29b-41d4-a716-446655440602', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440407', 'home', 'student_loan'),
('550e8400-e29b-41d4-a716-446655440603', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440408', 'international', 'self_funded'),
('550e8400-e29b-41d4-a716-446655440604', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440409', 'home', 'scholarship'),
('550e8400-e29b-41d4-a716-446655440605', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440410', 'home', 'student_loan'),
('550e8400-e29b-41d4-a716-446655440606', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440414', 'home', 'self_funded'),
('550e8400-e29b-41d4-a716-446655440607', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440415', 'home', 'student_loan'),
('550e8400-e29b-41d4-a716-446655440608', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440416', 'international', 'self_funded');

-- Create some activities for tracking
INSERT INTO activities (id, org_id, person_id, application_id, kind, title, body) VALUES
('550e8400-e29b-41d4-a716-446655440701', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', NULL, 'web_activity', 'Website Visit', 'Viewed programme information'),
('550e8400-e29b-41d4-a716-446655440702', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', NULL, 'email_activity', 'Email Open', 'Opened welcome email'),
('550e8400-e29b-41d4-a716-446655440703', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440401', 'application_activity', 'Application Submitted', 'Completed online application form'),
('550e8400-e29b-41d4-a716-446655440704', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440403', 'interview_activity', 'Interview Scheduled', 'Booked interview appointment'),
('550e8400-e29b-41d4-a716-446655440705', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440404', 'offer_activity', 'Offer Made', 'Conditional offer issued');
