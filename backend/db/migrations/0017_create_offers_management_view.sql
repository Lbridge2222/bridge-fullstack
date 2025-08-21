-- Migration: Create offers management view
-- This view provides comprehensive offer and enrollment data for the CRM

-- First, create the document checklist table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_checklist (
    id SERIAL PRIMARY KEY,
    offer_id UUID REFERENCES offers(id),
    academic_docs_verified BOOLEAN DEFAULT false,
    identity_docs_verified BOOLEAN DEFAULT false,
    financial_docs_verified BOOLEAN DEFAULT false,
    accommodation_docs_verified BOOLEAN DEFAULT false,
    health_docs_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW vw_offers_management AS
SELECT 
    -- Core offer information
    o.id as offer_id,
    a.person_id,
    o.application_id,
    o.type as offer_type,
    o.status as offer_status,
    o.issued_at as offer_date,
    NULL as acceptance_date,
    o.expires_at as enrollment_deadline,
    o.conditions,
    NULL as notes,
    
    -- Person details
    p.first_name,
    p.last_name,
    p.email,
    p.phone_number as phone,
    
    -- Application details
    p2.name as programme_name,
    p2.code as programme_code,
    c.name as campus_name,
    i.cycle_label as cycle_label,
    EXTRACT(YEAR FROM i.start_date) as academic_year,
    
    -- Enrollment tracking
    CASE WHEN e.id IS NOT NULL THEN 'enrolled' ELSE 'not_enrolled' END as enrollment_status,
    e.confirmed_at as enrollment_date,
    CASE WHEN e.fee_status = 'paid' THEN true ELSE false END as deposit_paid,
    NULL as deposit_amount,
    NULL as tuition_fee,
    false as accommodation_booked,
    
    -- Document checklist status
    COALESCE(dc.academic_docs_verified, false) as academic_docs_verified,
    COALESCE(dc.identity_docs_verified, false) as identity_docs_verified,
    COALESCE(dc.financial_docs_verified, false) as financial_docs_verified,
    COALESCE(dc.accommodation_docs_verified, false) as accommodation_docs_verified,
    COALESCE(dc.health_docs_verified, false) as health_docs_verified,
    
    -- Timestamps
    o.issued_at as created_at,
    o.issued_at as updated_at,
    p.created_at as person_created_at,
    a.created_at as application_created_at,
    
    -- Calculated fields
    CASE 
        WHEN e.id IS NOT NULL THEN 'complete'
        WHEN o.status = 'accepted' AND e.id IS NULL THEN 'urgent'
        ELSE 'in_progress'
    END as admin_status,
    
    -- Urgent items calculation
    CASE 
        WHEN o.expires_at < CURRENT_DATE THEN 'enrollment_overdue'
        WHEN o.expires_at < CURRENT_DATE + INTERVAL '7 days' THEN 'enrollment_urgent'
        WHEN NOT dc.academic_docs_verified AND o.type = 'Conditional' THEN 'academic_docs_missing'
        WHEN NOT dc.identity_docs_verified THEN 'identity_docs_missing'
        WHEN NOT dc.financial_docs_verified THEN 'financial_docs_missing'
        ELSE NULL
    END as urgent_items

FROM offers o
JOIN applications a ON o.application_id = a.id
JOIN people p ON a.person_id = p.id
JOIN programmes p2 ON a.programme_id = p2.id
LEFT JOIN campuses c ON p2.campus_id = c.id
JOIN intakes i ON a.intake_id = i.id
LEFT JOIN enrolments e ON o.application_id = e.application_id
LEFT JOIN document_checklist dc ON o.id = dc.offer_id
WHERE o.status IN ('issued', 'accepted', 'conditional')
ORDER BY o.issued_at DESC;

-- Note: enrolments table already exists from 0001_init.sql migration
-- Note: document_checklist table created above before the view

-- Note: Indexes cannot be created on regular views, only on materialized views
-- Performance relies on indexes on the underlying tables (offers, applications, people, etc.)
