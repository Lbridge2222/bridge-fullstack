-- ============================================================================
-- ROLLBACK: Remove ML Progression Intelligence Columns
-- ============================================================================
-- This script removes the ML columns if you need to rollback
-- Run with: psql $DATABASE_URL -f rollback_ml_columns.sql
-- ============================================================================

\echo '⚠️  Rolling back ML progression intelligence columns...'
\echo ''
\echo 'This will remove:'
\echo '  • progression_probability'
\echo '  • enrollment_probability'
\echo '  • next_stage_eta_days'
\echo '  • enrollment_eta_days'
\echo '  • progression_blockers'
\echo '  • recommended_actions'
\echo '  • progression_last_calculated_at'
\echo ''

-- Wait 5 seconds to allow cancellation
\echo 'Starting in 5 seconds... Press Ctrl+C to cancel'
SELECT pg_sleep(5);

\echo '📊 Removing columns from applications table...'

ALTER TABLE applications 
DROP COLUMN IF EXISTS progression_probability CASCADE,
DROP COLUMN IF EXISTS enrollment_probability CASCADE,
DROP COLUMN IF EXISTS next_stage_eta_days CASCADE,
DROP COLUMN IF EXISTS enrollment_eta_days CASCADE,
DROP COLUMN IF EXISTS progression_blockers CASCADE,
DROP COLUMN IF EXISTS recommended_actions CASCADE,
DROP COLUMN IF EXISTS progression_last_calculated_at CASCADE;

\echo '✅ Columns removed'

-- Drop indexes (will be auto-dropped with CASCADE, but listing for clarity)
\echo '📊 Dropping indexes...'

DROP INDEX IF EXISTS idx_applications_progression_probability;
DROP INDEX IF EXISTS idx_applications_enrollment_probability;
DROP INDEX IF EXISTS idx_applications_progression_last_calculated;
DROP INDEX IF EXISTS idx_applications_progression_blockers_gin;

\echo '✅ Indexes dropped'

-- Recreate materialized view without ML columns
\echo '📊 Updating vw_board_applications view...'

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

CREATE UNIQUE INDEX IF NOT EXISTS mv_board_applications_pk 
  ON vw_board_applications(application_id);

REFRESH MATERIALIZED VIEW vw_board_applications;

\echo '✅ View recreated without ML columns'

\echo ''
\echo '✅ Rollback complete!'
\echo ''

