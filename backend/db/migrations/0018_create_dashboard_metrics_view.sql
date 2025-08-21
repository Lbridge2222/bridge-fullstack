-- Migration: Create dashboard metrics view
-- This view provides aggregated metrics for the CRM Overview dashboard

CREATE OR REPLACE VIEW vw_dashboard_metrics AS
WITH 
-- Lead counts by lifecycle state
lead_counts AS (
    SELECT 
        lifecycle_state,
        COUNT(*) as count,
        COUNT(CASE WHEN lead_score >= 80 THEN 1 END) as hot_leads,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_leads
    FROM people 
    WHERE lifecycle_state IN ('enquiry', 'pre_applicant')
    GROUP BY lifecycle_state
),

-- Application counts by stage
application_counts AS (
    SELECT 
        stage,
        COUNT(*) as count,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_applications
    FROM applications 
    GROUP BY stage
),

-- Offer counts by status
offer_counts AS (
    SELECT 
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN issued_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_offers
    FROM offers 
    GROUP BY status
),

-- Enrollment counts
enrollment_counts AS (
    SELECT 
        COUNT(*) as total_enrolled,
        COUNT(CASE WHEN confirmed_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_enrollments
    FROM enrolments 

),

-- Revenue projections (mock data for now, can be enhanced with real financial data)
revenue_data AS (
    SELECT 
        3_650_000 as revenue_projected,
        2_800_000 as revenue_current_year,
        2_100_000 as revenue_previous_year
)

SELECT 
    -- Overview metrics
    (SELECT COALESCE(SUM(count), 0) FROM lead_counts) as total_leads,
    (SELECT COALESCE(SUM(count), 0) FROM application_counts) as total_applications,
    (SELECT COALESCE(SUM(count), 0) FROM offer_counts) as total_offers,
    (SELECT total_enrolled FROM enrollment_counts) as total_enrolled,
    (SELECT COALESCE(SUM(hot_leads), 0) FROM lead_counts) as hot_leads,
    
    -- Predicted metrics (based on conversion rates)
    ROUND((SELECT COALESCE(SUM(count), 0) FROM lead_counts) * 0.15) as applications_predicted,
    ROUND((SELECT COALESCE(SUM(count), 0) FROM offer_counts WHERE status = 'accepted') * 0.85) as enrollment_predicted,
    (SELECT revenue_projected FROM revenue_data) as revenue_projected,
    
    -- Trend calculations (30-day change)
    CASE 
        WHEN (SELECT recent_leads FROM lead_counts WHERE lifecycle_state = 'enquiry') > 0 
        THEN ROUND(((SELECT recent_leads FROM lead_counts WHERE lifecycle_state = 'enquiry')::DECIMAL / 
                   (SELECT COUNT(*) FROM people WHERE lifecycle_state = 'enquiry' AND created_at < CURRENT_DATE - INTERVAL '30 days')) * 100 - 100, 1)
        ELSE 0 
    END as leads_change,
    
    CASE 
        WHEN (SELECT recent_applications FROM application_counts WHERE stage = 'submitted') > 0 
        THEN ROUND(((SELECT recent_applications FROM application_counts WHERE stage = 'submitted')::DECIMAL / 
                   (SELECT COUNT(*) FROM applications WHERE stage = 'submitted' AND created_at < CURRENT_DATE - INTERVAL '30 days')) * 100 - 100, 1)
        ELSE 0 
    END as applications_change,
    
    CASE 
        WHEN (SELECT recent_offers FROM offer_counts WHERE status = 'issued') > 0 
        THEN ROUND(((SELECT recent_offers FROM offer_counts WHERE status = 'issued')::DECIMAL / 
                   (SELECT COUNT(*) FROM offers WHERE status = 'issued' AND issued_at < CURRENT_DATE - INTERVAL '30 days')) * 100 - 100, 1)
        ELSE 0 
    END as offers_change,
    
    CASE 
        WHEN (SELECT recent_enrollments FROM enrollment_counts) > 0 
        THEN ROUND(((SELECT recent_enrollments FROM enrollment_counts)::DECIMAL / 
                   (SELECT COUNT(*) FROM enrolments WHERE confirmed_at < CURRENT_DATE - INTERVAL '30 days')) * 100 - 100, 1)
        ELSE 0 
    END as enrolled_change,
    
    -- Additional metrics for AI insights
    (SELECT COUNT(*) FROM people p WHERE p.lifecycle_state = 'enquiry' AND p.lead_score >= 85 AND NOT EXISTS (
        SELECT 1 FROM activities a WHERE a.person_id = p.id AND a.created_at >= CURRENT_DATE - INTERVAL '3 days'
    )) as high_value_leads_uncontacted,
    (SELECT COUNT(*) FROM interviews i JOIN applications a ON i.application_id = a.id WHERE a.stage = 'interview_scheduled' AND i.scheduled_start < CURRENT_DATE + INTERVAL '7 days') as upcoming_interviews,
    (SELECT COUNT(*) FROM offers WHERE status = 'accepted' AND expires_at < CURRENT_DATE + INTERVAL '14 days') as enrollment_deadlines_approaching,
    (SELECT COUNT(*) FROM applications WHERE stage = 'submitted' AND created_at >= CURRENT_DATE - INTERVAL '7 days') as applications_this_week;

-- Note: Indexes cannot be created in the same file as view definitions
-- Performance relies on indexes on the underlying tables (people, applications, offers, enrolments)
