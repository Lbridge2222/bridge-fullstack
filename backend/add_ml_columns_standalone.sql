-- ============================================================================
-- STANDALONE: Add ML Progression Intelligence Columns
-- ============================================================================
-- This script adds ML columns WITHOUT running full migrations
-- Safe to run multiple times (uses IF NOT EXISTS)
-- Run with: psql $DATABASE_URL -f add_ml_columns_standalone.sql
-- ============================================================================

\echo '🚀 Adding ML progression intelligence columns...'

-- 1. Add new columns to applications table (safe, idempotent)
\echo '📊 Step 1: Adding columns to applications table...'

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS progression_probability DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS enrollment_probability DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS next_stage_eta_days INT,
ADD COLUMN IF NOT EXISTS enrollment_eta_days INT,
ADD COLUMN IF NOT EXISTS progression_blockers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS recommended_actions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS progression_last_calculated_at TIMESTAMPTZ;

\echo '✅ Columns added successfully'

-- 2. Add indexes for performance (safe, uses IF NOT EXISTS)
\echo '📊 Step 2: Creating indexes...'

CREATE INDEX IF NOT EXISTS idx_applications_progression_probability 
  ON applications(progression_probability);

CREATE INDEX IF NOT EXISTS idx_applications_enrollment_probability 
  ON applications(enrollment_probability);

CREATE INDEX IF NOT EXISTS idx_applications_progression_last_calculated 
  ON applications(progression_last_calculated_at);

CREATE INDEX IF NOT EXISTS idx_applications_progression_blockers_gin 
  ON applications USING GIN (progression_blockers);

\echo '✅ Indexes created successfully'

-- 3. Add column comments for documentation
\echo '📊 Step 3: Adding column documentation...'

COMMENT ON COLUMN applications.progression_probability IS 
  'ML-predicted probability (0.00-1.00) of advancing to next stage';

COMMENT ON COLUMN applications.enrollment_probability IS 
  'ML-predicted probability (0.00-1.00) of ultimate enrollment';

COMMENT ON COLUMN applications.next_stage_eta_days IS 
  'Estimated days until next stage advancement';

COMMENT ON COLUMN applications.enrollment_eta_days IS 
  'Estimated days until enrollment';

COMMENT ON COLUMN applications.progression_blockers IS 
  'JSON array of detected blockers preventing progression';

COMMENT ON COLUMN applications.recommended_actions IS 
  'JSON array of next best actions';

COMMENT ON COLUMN applications.progression_last_calculated_at IS 
  'Timestamp of last progression prediction calculation';

\echo '✅ Documentation added'

-- 4. Update materialized view to include new columns
\echo '📊 Step 4: Updating vw_board_applications view...'

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

\echo '✅ Materialized view recreated'

-- 5. Recreate unique index on materialized view
\echo '📊 Step 5: Creating view index...'

CREATE UNIQUE INDEX IF NOT EXISTS mv_board_applications_pk 
  ON vw_board_applications(application_id);

\echo '✅ View index created'

-- 6. Refresh the materialized view with data
\echo '📊 Step 6: Refreshing view data...'

REFRESH MATERIALIZED VIEW vw_board_applications;

\echo '✅ View refreshed'

-- 7. Add sample data for testing (optional - only updates 5 records)
\echo '📊 Step 7: Adding sample test data (5 records)...'

UPDATE applications 
SET 
  progression_probability = 0.75,
  enrollment_probability = 0.60,
  next_stage_eta_days = 7,
  enrollment_eta_days = 45,
  progression_blockers = '[
    {
      "type":"engagement_decay",
      "severity":"medium",
      "item":"No engagement for 5 days",
      "impact":"Reduces progression probability",
      "resolution_action":"Send re-engagement email"
    }
  ]'::jsonb,
  recommended_actions = '[
    {
      "action":"Schedule interview",
      "priority":1,
      "impact":"+25% progression probability",
      "effort":"medium",
      "action_type":"scheduling"
    }
  ]'::jsonb,
  progression_last_calculated_at = NOW()
WHERE stage IN ('applicant', 'interview')
  AND created_at > NOW() - INTERVAL '30 days'
  AND progression_probability IS NULL  -- Only update records without data
LIMIT 5;

\echo '✅ Sample data added'

-- 8. Final refresh
\echo '📊 Step 8: Final refresh...'

REFRESH MATERIALIZED VIEW vw_board_applications;

\echo '✅ Final refresh complete'

-- 9. Verification query
\echo ''
\echo '🔍 Verification Results:'
\echo ''

SELECT 
  '✅ Migration Complete' as status,
  COUNT(*) as total_applications,
  COUNT(progression_probability) as with_progression_prob,
  COUNT(enrollment_probability) as with_enrollment_prob,
  COUNT(CASE WHEN jsonb_array_length(progression_blockers) > 0 THEN 1 END) as with_blockers,
  COUNT(CASE WHEN jsonb_array_length(recommended_actions) > 0 THEN 1 END) as with_actions
FROM applications;

\echo ''
\echo '🎉 ML Progression Intelligence columns added successfully!'
\echo ''
\echo '📝 What was added:'
\echo '   • progression_probability'
\echo '   • enrollment_probability'
\echo '   • next_stage_eta_days'
\echo '   • enrollment_eta_days'
\echo '   • progression_blockers (JSONB)'
\echo '   • recommended_actions (JSONB)'
\echo '   • progression_last_calculated_at'
\echo ''
\echo '🚀 Next steps:'
\echo '   1. Test ML API: curl -X POST http://localhost:8000/ai/application-intelligence/predict'
\echo '   2. View will automatically show new data on Applications Board'
\echo '   3. Run python check_activity_coverage.py to see ML features available'
\echo ''

