-- ============================================================================
-- FINAL REDISTRIBUTION ACROSS ALL 18 STAGES
-- ============================================================================
-- This script redistributes applications across all 18 stages using ROW_NUMBER()
-- ============================================================================

\echo '🔄 Final redistribution across all 18 stages...'

-- Update applications with even distribution across all 18 stages
WITH application_stages AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY id) as row_num,
    CASE 
      WHEN (ROW_NUMBER() OVER (ORDER BY id) % 18) = 0 THEN 'enquiry'
      WHEN (ROW_NUMBER() OVER (ORDER BY id) % 18) = 1 THEN 'pre_application'
      WHEN (ROW_NUMBER() OVER (ORDER BY id) % 18) = 2 THEN 'application_submitted'
      WHEN (ROW_NUMBER() OVER (ORDER BY id) % 18) = 3 THEN 'fee_status_query'
      WHEN (ROW_NUMBER() OVER (ORDER BY id) % 18) = 4 THEN 'interview_portfolio'
      WHEN (ROW_NUMBER() OVER (ORDER BY id) % 18) = 5 THEN 'review_in_progress'
      WHEN (ROW_NUMBER() OVER (ORDER BY id) % 18) = 6 THEN 'review_complete'
      WHEN (ROW_NUMBER() OVER (ORDER BY id) % 18) = 7 THEN 'director_review_in_progress'
      WHEN (ROW_NUMBER() OVER (ORDER BY id) % 18) = 8 THEN 'director_review_complete'
      WHEN (ROW_NUMBER() OVER (ORDER BY id) % 18) = 9 THEN 'conditional_offer_no_response'
      WHEN (ROW_NUMBER() OVER (ORDER BY id) % 18) = 10 THEN 'unconditional_offer_no_response'
      WHEN (ROW_NUMBER() OVER (ORDER BY id) % 18) = 11 THEN 'conditional_offer_accepted'
      WHEN (ROW_NUMBER() OVER (ORDER BY id) % 18) = 12 THEN 'unconditional_offer_accepted'
      WHEN (ROW_NUMBER() OVER (ORDER BY id) % 18) = 13 THEN 'ready_to_enrol'
      WHEN (ROW_NUMBER() OVER (ORDER BY id) % 18) = 14 THEN 'enrolled'
      WHEN (ROW_NUMBER() OVER (ORDER BY id) % 18) = 15 THEN 'rejected'
      WHEN (ROW_NUMBER() OVER (ORDER BY id) % 18) = 16 THEN 'offer_withdrawn'
      ELSE 'offer_declined'
    END as new_stage
  FROM applications 
  WHERE status = 'open'
  ORDER BY id
)
UPDATE applications 
SET 
  stage = app_stages.new_stage,
  updated_at = NOW()
FROM application_stages app_stages
WHERE applications.id = app_stages.id;

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

\echo '🎉 Final redistribution complete!'
\echo '📝 All 18 stages now have applications for testing'
