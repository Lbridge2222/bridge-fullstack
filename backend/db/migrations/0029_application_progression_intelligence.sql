-- Migration: Application Progression Intelligence
-- Purpose: Add ML-powered progression prediction fields to applications table
-- Created: 2025-10-01

-- Add progression intelligence columns to applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS progression_probability DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS enrollment_probability DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS next_stage_eta_days INT,
ADD COLUMN IF NOT EXISTS enrollment_eta_days INT,
ADD COLUMN IF NOT EXISTS progression_blockers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS recommended_actions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS progression_last_calculated_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_applications_progression_probability ON applications(progression_probability);
CREATE INDEX IF NOT EXISTS idx_applications_enrollment_probability ON applications(enrollment_probability);
CREATE INDEX IF NOT EXISTS idx_applications_progression_last_calculated ON applications(progression_last_calculated_at);

-- Add GIN index for JSONB queries on blockers
CREATE INDEX IF NOT EXISTS idx_applications_progression_blockers_gin ON applications USING GIN (progression_blockers);

-- Comments for documentation
COMMENT ON COLUMN applications.progression_probability IS 'ML-predicted probability (0.00-1.00) of advancing to next stage';
COMMENT ON COLUMN applications.enrollment_probability IS 'ML-predicted probability (0.00-1.00) of ultimate enrollment';
COMMENT ON COLUMN applications.next_stage_eta_days IS 'Estimated days until next stage advancement';
COMMENT ON COLUMN applications.enrollment_eta_days IS 'Estimated days until enrollment';
COMMENT ON COLUMN applications.progression_blockers IS 'JSON array of detected blockers preventing progression';
COMMENT ON COLUMN applications.recommended_actions IS 'JSON array of next best actions';
COMMENT ON COLUMN applications.progression_last_calculated_at IS 'Timestamp of last progression prediction calculation';

-- Update the materialized view to include new fields
DROP MATERIALIZED VIEW IF EXISTS vw_board_applications CASCADE;

CREATE MATERIALIZED VIEW vw_board_applications AS
SELECT
  a.id as application_id,
  a.stage,
  a.status,
  a.source,
  a.sub_source,
  a.assignee_user_id,
  a.created_at,
  a.priority,
  a.urgency,
  a.urgency_reason,
  p.id as person_id,
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  p.lead_score,
  p.conversion_probability,
  
  -- NEW: Progression intelligence fields
  a.progression_probability,
  a.enrollment_probability,
  a.next_stage_eta_days,
  a.enrollment_eta_days,
  a.progression_blockers,
  a.recommended_actions,
  
  pr.name as programme_name,
  pr.code as programme_code,
  c.name as campus_name,
  i.cycle_label,
  EXTRACT(EPOCH FROM (NOW() - a.created_at)) / 86400.0 as days_in_pipeline,
  (NOW() - a.created_at > INTERVAL '7 days') as sla_overdue,
  EXISTS (SELECT 1 FROM offers o WHERE o.application_id = a.id AND o.status='issued') as has_offer,
  EXISTS (SELECT 1 FROM interviews iv WHERE iv.application_id = a.id AND (iv.outcome IS NULL OR iv.outcome='pending')) as has_active_interview,
  (SELECT MAX(la.created_at) FROM lead_activities la WHERE la.person_id = p.id) as last_activity_at,
  (SELECT o.offer_type FROM offers o WHERE o.application_id = a.id ORDER BY o.created_at DESC LIMIT 1) as offer_type
FROM applications a
LEFT JOIN people p ON p.id = a.person_id
LEFT JOIN programmes pr ON pr.id = a.programme_id
LEFT JOIN campuses c ON c.id = a.campus_id
LEFT JOIN intake_cycles i ON i.id = a.intake_cycle_id;

-- Recreate unique index
CREATE UNIQUE INDEX IF NOT EXISTS mv_board_applications_pk ON vw_board_applications(application_id);

-- Refresh the view
REFRESH MATERIALIZED VIEW vw_board_applications;

-- Create helper function to calculate progression for all applications
CREATE OR REPLACE FUNCTION refresh_application_progression_intelligence()
RETURNS void AS $$
BEGIN
  -- This function can be called by a scheduled job to refresh all progression predictions
  -- Implementation will call the ML API endpoint for batch prediction
  RAISE NOTICE 'Progression intelligence refresh triggered. Call ML API /ai/application-intelligence/predict-batch';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_application_progression_intelligence() IS 
'Trigger function to refresh ML progression predictions. Should be called by scheduled job that invokes ML API.';

-- Example data for testing (optional - comment out in production)
-- Update a few test applications with sample progression data
UPDATE applications 
SET 
  progression_probability = 0.75,
  enrollment_probability = 0.60,
  next_stage_eta_days = 7,
  enrollment_eta_days = 45,
  progression_blockers = '[{"type":"engagement_decay","severity":"medium","item":"No engagement for 5 days","impact":"Reduces progression probability","resolution_action":"Send re-engagement email"}]'::jsonb,
  recommended_actions = '[{"action":"Schedule interview","priority":1,"impact":"+25% progression probability","effort":"medium","action_type":"scheduling"}]'::jsonb,
  progression_last_calculated_at = NOW()
WHERE stage = 'applicant'
  AND created_at > NOW() - INTERVAL '30 days'
LIMIT 5;

-- Refresh materialized view after sample data update
REFRESH MATERIALIZED VIEW vw_board_applications;

-- Verification query
SELECT 
  'Migration 0029 verification' as check_name,
  COUNT(*) as total_applications,
  COUNT(progression_probability) as apps_with_progression_prob,
  COUNT(enrollment_probability) as apps_with_enrollment_prob,
  COUNT(progression_blockers) FILTER (WHERE jsonb_array_length(progression_blockers) > 0) as apps_with_blockers,
  COUNT(recommended_actions) FILTER (WHERE jsonb_array_length(recommended_actions) > 0) as apps_with_actions
FROM applications;

COMMIT;

