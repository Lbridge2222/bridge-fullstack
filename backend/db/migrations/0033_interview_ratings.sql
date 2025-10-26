-- Migration: Add Interview Rating Schema
-- Phase 2C: Interview ratings are CRITICAL for UK HE admissions
-- Panel ratings are often the strongest predictor of enrollment

-- Add rating fields to interviews table
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS technical_rating INTEGER CHECK (technical_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS portfolio_rating INTEGER CHECK (portfolio_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS motivation_rating INTEGER CHECK (motivation_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS fit_rating INTEGER CHECK (fit_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS rating_notes TEXT,
ADD COLUMN IF NOT EXISTS rated_by_user_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

-- Add comment explaining the rating system
COMMENT ON COLUMN interviews.overall_rating IS 'Overall interview rating (1-5): 5=Excellent, 4=Good, 3=Satisfactory, 2=Concerns, 1=Poor';
COMMENT ON COLUMN interviews.technical_rating IS 'Technical/Academic ability rating (1-5)';
COMMENT ON COLUMN interviews.portfolio_rating IS 'Portfolio/Work quality rating (1-5) - for creative/technical programmes';
COMMENT ON COLUMN interviews.communication_rating IS 'Communication skills rating (1-5)';
COMMENT ON COLUMN interviews.motivation_rating IS 'Motivation and engagement rating (1-5)';
COMMENT ON COLUMN interviews.fit_rating IS 'Course/Programme fit rating (1-5)';
COMMENT ON COLUMN interviews.rating_notes IS 'Additional notes about ratings from panel';
COMMENT ON COLUMN interviews.rated_by_user_id IS 'User (panel member) who provided the rating';
COMMENT ON COLUMN interviews.rated_at IS 'Timestamp when rating was recorded';

-- Create index for efficient rating queries
CREATE INDEX IF NOT EXISTS idx_interviews_overall_rating
ON interviews(application_id, overall_rating DESC)
WHERE overall_rating IS NOT NULL;

-- Create a view for interview rating analytics
CREATE OR REPLACE VIEW interview_ratings_summary AS
SELECT
    i.application_id,
    i.org_id,
    COUNT(*) as interview_count,
    AVG(i.overall_rating) as avg_overall_rating,
    MAX(i.overall_rating) as max_overall_rating,
    MIN(i.overall_rating) as min_overall_rating,
    AVG(i.technical_rating) as avg_technical_rating,
    AVG(i.portfolio_rating) as avg_portfolio_rating,
    AVG(i.communication_rating) as avg_communication_rating,
    AVG(i.motivation_rating) as avg_motivation_rating,
    AVG(i.fit_rating) as avg_fit_rating,
    COUNT(*) FILTER (WHERE i.overall_rating >= 4) as high_ratings_count,
    COUNT(*) FILTER (WHERE i.overall_rating <= 2) as low_ratings_count,
    MAX(i.scheduled_start) as latest_interview_date,
    MAX(i.rated_at) as latest_rating_date
FROM interviews i
WHERE i.overall_rating IS NOT NULL
GROUP BY i.application_id, i.org_id;

COMMENT ON VIEW interview_ratings_summary IS
'Summary of interview ratings per application for ML scoring';

-- Seed some realistic interview ratings for existing interviews
-- (Only for testing - in production this would come from actual panel input)
UPDATE interviews
SET
    overall_rating = CASE
        WHEN outcome = 'completed' THEN (FLOOR(RANDOM() * 3 + 3))::INTEGER  -- 3-5 for completed
        WHEN outcome = 'cancelled' THEN NULL  -- No rating if cancelled
        ELSE (FLOOR(RANDOM() * 2 + 3))::INTEGER  -- 3-4 for others
    END,
    technical_rating = CASE
        WHEN outcome = 'completed' THEN (FLOOR(RANDOM() * 3 + 3))::INTEGER
        ELSE NULL
    END,
    portfolio_rating = CASE
        WHEN outcome = 'completed' THEN (FLOOR(RANDOM() * 3 + 3))::INTEGER
        ELSE NULL
    END,
    communication_rating = CASE
        WHEN outcome = 'completed' THEN (FLOOR(RANDOM() * 3 + 3))::INTEGER
        ELSE NULL
    END,
    motivation_rating = CASE
        WHEN outcome = 'completed' THEN (FLOOR(RANDOM() * 3 + 3))::INTEGER
        ELSE NULL
    END,
    fit_rating = CASE
        WHEN outcome = 'completed' THEN (FLOOR(RANDOM() * 3 + 3))::INTEGER
        ELSE NULL
    END,
    rated_at = CASE
        WHEN outcome = 'completed' THEN scheduled_start + INTERVAL '1 day'
        ELSE NULL
    END
WHERE overall_rating IS NULL
  AND outcome IS NOT NULL;
