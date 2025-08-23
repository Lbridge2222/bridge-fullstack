-- Migration: Add lead management capabilities
-- This enables bidirectional data flow between CRM and database

-- Add lead management fields to people table
ALTER TABLE people 
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversion_probability DECIMAL(5,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS assigned_to TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new',
ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create lead_notes table for tracking lead interactions
CREATE TABLE IF NOT EXISTS lead_notes (
    id SERIAL PRIMARY KEY,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    note_type TEXT NOT NULL DEFAULT 'general',
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_notes_person_id ON lead_notes(person_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON lead_notes(created_at);
CREATE INDEX IF NOT EXISTS idx_people_lead_score ON people(lead_score);
CREATE INDEX IF NOT EXISTS idx_people_assigned_to ON people(assigned_to);
CREATE INDEX IF NOT EXISTS idx_people_status ON people(status);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_people_updated_at 
    BEFORE UPDATE ON people 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_notes_updated_at 
    BEFORE UPDATE ON lead_notes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Update the leads management view to include new fields
CREATE OR REPLACE VIEW vw_leads_management AS
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
    a.programme_name as latest_programme_name,
    a.campus_name as latest_campus_name,
    a.academic_year as latest_academic_year,
    -- Activity tracking
    COALESCE(p.updated_at, p.created_at) as last_activity_at
FROM people p
LEFT JOIN LATERAL (
    SELECT 
        ap.stage,
        pr.name as programme_name,
        c.name as campus_name,
        ay.label as academic_year
    FROM applications ap
    LEFT JOIN programmes pr ON ap.programme_id = pr.id
    LEFT JOIN campuses c ON ap.campus_id = c.id
    LEFT JOIN academic_years ay ON ap.academic_year_id = ay.id
    WHERE ap.person_id = p.id
    ORDER BY ap.created_at DESC
    LIMIT 1
) a ON true
WHERE p.lifecycle_state = 'enquiry'
ORDER BY p.lead_score DESC NULLS LAST, p.created_at DESC;
