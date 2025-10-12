-- ============================================================================
-- REDISTRIBUTE APPLICATIONS ACROSS ALL 18 STAGES
-- ============================================================================
-- This script redistributes applications across all 18 stages for better testing
-- ============================================================================

\echo '🔄 Redistributing applications across all 18 stages...'

-- Update applications with a more even distribution across all 18 stages
UPDATE applications 
SET 
  stage = CASE 
    -- Distribute across all 18 stages with realistic weights
    WHEN (id::text::bigint % 100) < 8 THEN 'enquiry'
    WHEN (id::text::bigint % 100) < 12 THEN 'pre_application'
    WHEN (id::text::bigint % 100) < 18 THEN 'application_submitted'
    WHEN (id::text::bigint % 100) < 20 THEN 'fee_status_query'
    WHEN (id::text::bigint % 100) < 28 THEN 'interview_portfolio'
    WHEN (id::text::bigint % 100) < 38 THEN 'review_in_progress'
    WHEN (id::text::bigint % 100) < 42 THEN 'review_complete'
    WHEN (id::text::bigint % 100) < 46 THEN 'director_review_in_progress'
    WHEN (id::text::bigint % 100) < 48 THEN 'director_review_complete'
    WHEN (id::text::bigint % 100) < 52 THEN 'conditional_offer_no_response'
    WHEN (id::text::bigint % 100) < 54 THEN 'unconditional_offer_no_response'
    WHEN (id::text::bigint % 100) < 58 THEN 'conditional_offer_accepted'
    WHEN (id::text::bigint % 100) < 60 THEN 'unconditional_offer_accepted'
    WHEN (id::text::bigint % 100) < 61 THEN 'ready_to_enrol'
    WHEN (id::text::bigint % 100) < 63 THEN 'enrolled'
    WHEN (id::text::bigint % 100) < 64 THEN 'rejected'
    WHEN (id::text::bigint % 100) < 65 THEN 'offer_withdrawn'
    ELSE 'offer_declined'
  END,
  updated_at = NOW()
WHERE status = 'open';

\echo '✅ Applications redistributed successfully'

-- Show new distribution
\echo '📊 New stage distribution:'
SELECT 
  stage,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM applications 
WHERE status = 'open'
GROUP BY stage 
ORDER BY 
  CASE stage
    WHEN 'enquiry' THEN 1
    WHEN 'pre_application' THEN 2
    WHEN 'application_submitted' THEN 3
    WHEN 'fee_status_query' THEN 4
    WHEN 'interview_portfolio' THEN 5
    WHEN 'review_in_progress' THEN 6
    WHEN 'review_complete' THEN 7
    WHEN 'director_review_in_progress' THEN 8
    WHEN 'director_review_complete' THEN 9
    WHEN 'conditional_offer_no_response' THEN 10
    WHEN 'unconditional_offer_no_response' THEN 11
    WHEN 'conditional_offer_accepted' THEN 12
    WHEN 'unconditional_offer_accepted' THEN 13
    WHEN 'ready_to_enrol' THEN 14
    WHEN 'enrolled' THEN 15
    WHEN 'rejected' THEN 16
    WHEN 'offer_withdrawn' THEN 17
    WHEN 'offer_declined' THEN 18
    ELSE 99
  END;

-- Refresh the materialized view
\echo '🔄 Refreshing materialized view...'
REFRESH MATERIALIZED VIEW vw_board_applications;

\echo '🎉 Redistribution complete!'
\echo '📝 All 18 stages now have applications for testing'
