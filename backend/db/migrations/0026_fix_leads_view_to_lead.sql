-- Migration: Fix leads view to use 'lead' lifecycle_state (not 'enquiry')
-- Idempotent: drops and recreates the view

DROP VIEW IF EXISTS vw_leads_management;
CREATE VIEW vw_leads_management AS
SELECT 
    p.id::text,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.lifecycle_state,
    p.lead_score,
    p.conversion_probability::float,
    p.assigned_to,
    p.status,
    p.next_follow_up,
    p.created_at,
    p.updated_at,
    -- Latest application info
    a.stage as latest_application_stage,
    pr.name as latest_programme_name,
    c.name as latest_campus_name,
    i.cycle_label as latest_academic_year,
    -- Activity tracking
    COALESCE(p.updated_at, p.created_at) as last_activity_at
FROM people p
LEFT JOIN LATERAL (
    SELECT 
        ap.stage,
        ap.programme_id,
        ap.intake_id
    FROM applications ap
    WHERE ap.person_id = p.id
    ORDER BY ap.created_at DESC
    LIMIT 1
) a ON true
LEFT JOIN programmes pr ON pr.id = a.programme_id
LEFT JOIN campuses c ON c.id = pr.campus_id
LEFT JOIN intakes i ON i.id = a.intake_id
WHERE p.lifecycle_state = 'lead'
ORDER BY p.lead_score DESC NULLS LAST, p.created_at DESC;
