-- Migration: Fix Lifecycle States to Match Progressive Properties System
-- This migration updates the seed data lifecycle states to align with our defined stages

-- Update lifecycle states to match our progressive properties system
-- 'enquiry' -> 'lead' (initial enquiry stage)
-- 'pre_applicant' -> 'lead' (still in enquiry phase)
-- 'applicant' -> 'applicant' (application submitted)
-- 'enrolled' -> 'enrolled' (student enrolled)

UPDATE people 
SET lifecycle_state = 'lead' 
WHERE lifecycle_state IN ('enquiry', 'pre_applicant');

-- Verify the changes
SELECT 
    lifecycle_state,
    COUNT(*) as count
FROM people 
GROUP BY lifecycle_state 
ORDER BY lifecycle_state;

-- Update the lifecycle_states table to ensure consistency
UPDATE lifecycle_states 
SET state = 'lead' 
WHERE state IN ('enquiry', 'pre_applicant');

-- Refresh materialized views to reflect the changes
REFRESH MATERIALIZED VIEW vw_board_applications;
REFRESH MATERIALIZED VIEW vw_people_enriched;
