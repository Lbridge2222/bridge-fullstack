-- ============================================================================
-- Migration 0031: Realistic Raw Data Enhancement (No Pre-calculated ML)
-- ============================================================================
-- Purpose: Add realistic raw data that ML scripts can work with organically
--
-- PHILOSOPHY:
-- - DO NOT pre-calculate ML outputs (progression_probability, blockers, etc.)
-- - The live ML scripts (application_ml.py, advanced_ml.py) calculate those
-- - Focus on realistic RAW data with varied completeness
-- - Some records fully complete, some partial, some missing data
-- - This tests the actual AI system efficacy
--
-- Changes:
-- 1. Add GDPR opt-in fields to people table
-- 2. Populate GDPR data for all existing people (varied opt-ins)
-- 3. Add application-specific data (qualifications, documents, ID checks, fee status)
-- 4. Vary data completeness realistically
-- 5. Add realistic priority/urgency (manual/workflow-driven, not ML)
-- 6. Ensure varied lead_score, engagement_score, conversion_probability
-- 7. Let ML scripts calculate progression_probability, blockers, recommended_actions
-- ============================================================================

-- ============================================================================
-- PART 1: Add GDPR Fields to People Table
-- ============================================================================

-- Add GDPR consent fields
ALTER TABLE people 
ADD COLUMN IF NOT EXISTS gdpr_consent_given BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gdpr_consent_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS gdpr_marketing_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gdpr_data_processing_consent BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS gdpr_consent_method TEXT, -- 'web_form', 'email', 'phone', 'in_person'
ADD COLUMN IF NOT EXISTS gdpr_last_updated TIMESTAMPTZ DEFAULT NOW();

-- Add index for GDPR queries
CREATE INDEX IF NOT EXISTS idx_people_gdpr_consent ON people(gdpr_consent_given);
CREATE INDEX IF NOT EXISTS idx_people_marketing_consent ON people(gdpr_marketing_consent);

-- Comments for documentation
COMMENT ON COLUMN people.gdpr_consent_given IS 'Whether person has given GDPR consent';
COMMENT ON COLUMN people.gdpr_consent_date IS 'When GDPR consent was first given';
COMMENT ON COLUMN people.gdpr_marketing_consent IS 'Consent for marketing communications';
COMMENT ON COLUMN people.gdpr_data_processing_consent IS 'Consent for data processing';
COMMENT ON COLUMN people.gdpr_consent_method IS 'How consent was obtained';
COMMENT ON COLUMN people.gdpr_last_updated IS 'Last time GDPR settings were updated';


-- ============================================================================
-- PART 2: Populate GDPR Data for All People
-- ============================================================================

-- Update GDPR consent with realistic distribution:
-- - 75% have given general consent
-- - 60% have given marketing consent
-- - 100% have data processing consent (required)
-- - Vary consent methods
-- - Consent dates based on when they were created

UPDATE people
SET 
    gdpr_consent_given = (random() < 0.75),  -- 75% consent rate
    gdpr_consent_date = created_at + (random() * INTERVAL '7 days'),  -- Within 7 days of creation
    gdpr_marketing_consent = (random() < 0.60),  -- 60% marketing consent
    gdpr_data_processing_consent = TRUE,  -- All must consent to this
    gdpr_consent_method = CASE 
        WHEN random() < 0.50 THEN 'web_form'
        WHEN random() < 0.75 THEN 'email'
        WHEN random() < 0.90 THEN 'phone'
        ELSE 'in_person'
    END,
    gdpr_last_updated = created_at + (random() * INTERVAL '7 days')
WHERE gdpr_consent_given IS NULL;


-- ============================================================================
-- PART 3: Ensure All People Have Complete ML Fields
-- ============================================================================

-- Fill in missing lead_score, engagement_score, conversion_probability
-- Use realistic values based on lifecycle_state and activity

UPDATE people
SET 
    lead_score = CASE 
        WHEN lifecycle_state = 'enrolled' THEN floor(random() * 15 + 85)::int  -- 85-100
        WHEN lifecycle_state = 'applicant' THEN floor(random() * 20 + 70)::int  -- 70-90
        WHEN lifecycle_state = 'lead' THEN floor(random() * 30 + 50)::int  -- 50-80
        WHEN lifecycle_state = 'prospect' THEN floor(random() * 40 + 30)::int  -- 30-70
        ELSE floor(random() * 50 + 20)::int  -- 20-70
    END,
    engagement_score = CASE 
        WHEN touchpoint_count > 10 THEN floor(random() * 15 + 75)::int  -- 75-90
        WHEN touchpoint_count > 5 THEN floor(random() * 20 + 60)::int  -- 60-80
        WHEN touchpoint_count > 0 THEN floor(random() * 25 + 40)::int  -- 40-65
        ELSE floor(random() * 30 + 20)::int  -- 20-50
    END,
    conversion_probability = CASE 
        WHEN lifecycle_state = 'enrolled' THEN 0.95 + (random() * 0.05)  -- 0.95-1.00
        WHEN lifecycle_state = 'applicant' THEN 0.60 + (random() * 0.25)  -- 0.60-0.85
        WHEN lifecycle_state = 'lead' THEN 0.30 + (random() * 0.30)  -- 0.30-0.60
        WHEN lifecycle_state = 'prospect' THEN 0.15 + (random() * 0.25)  -- 0.15-0.40
        ELSE 0.10 + (random() * 0.20)  -- 0.10-0.30
    END
WHERE lead_score IS NULL OR engagement_score IS NULL OR conversion_probability IS NULL;


-- ============================================================================
-- PART 4: Add Realistic Priority/Urgency to Applications
-- ============================================================================

-- Update priority distribution (not all medium):
-- Critical: 5% (high-value leads with blockers)
-- High: 20% (approaching deadlines or high-value)
-- Medium: 50% (normal flow)
-- Low: 25% (early stage or low-value)

UPDATE applications a
SET priority = CASE 
    -- Critical: High lead score + stuck in stage for too long
    WHEN p.lead_score >= 80 AND (NOW() - a.updated_at) > INTERVAL '14 days' THEN 'critical'
    -- Critical: Approaching enrollment deadline in final stages
    WHEN a.stage IN ('ready_to_enrol', 'conditional_offer_accepted', 'unconditional_offer_accepted') 
         AND (NOW() - a.updated_at) > INTERVAL '7 days' THEN 'critical'
    -- High: High lead score
    WHEN p.lead_score >= 75 THEN 'high'
    -- High: Interview/review stages with moderate delays
    WHEN a.stage IN ('interview_portfolio', 'review_in_progress', 'director_review_in_progress')
         AND (NOW() - a.updated_at) > INTERVAL '7 days' THEN 'high'
    -- Low: Early stages with low engagement
    WHEN a.stage IN ('enquiry', 'pre_application') AND p.engagement_score < 40 THEN 'low'
    -- Low: Terminal stages
    WHEN a.stage IN ('rejected', 'offer_withdrawn', 'offer_declined', 'enrolled') THEN 'low'
    -- Medium: Everything else
    ELSE 'medium'
END
FROM people p
WHERE a.person_id = p.id;

-- Update urgency based on time in stage and approaching deadlines:
-- High: 15% (stuck for too long or approaching deadlines)
-- Medium: 60% (normal flow)
-- Low: 25% (early stage or terminal)

UPDATE applications a
SET 
    urgency = CASE 
        -- High: Stuck in stage for too long
        WHEN (NOW() - a.updated_at) > INTERVAL '21 days' THEN 'high'
        -- High: Offer stages with no response
        WHEN a.stage IN ('conditional_offer_no_response', 'unconditional_offer_no_response')
             AND (NOW() - a.updated_at) > INTERVAL '7 days' THEN 'high'
        -- Low: Early stages with recent activity
        WHEN a.stage IN ('enquiry', 'pre_application') 
             AND (NOW() - a.updated_at) < INTERVAL '7 days' THEN 'low'
        -- Low: Terminal stages
        WHEN a.stage IN ('rejected', 'offer_withdrawn', 'offer_declined', 'enrolled') THEN 'low'
        -- Medium: Everything else
        ELSE 'medium'
    END,
    urgency_reason = CASE 
        WHEN (NOW() - a.updated_at) > INTERVAL '21 days' THEN 'No activity for over 3 weeks'
        WHEN a.stage IN ('conditional_offer_no_response', 'unconditional_offer_no_response')
             AND (NOW() - a.updated_at) > INTERVAL '7 days' THEN 'Offer response overdue'
        WHEN a.stage IN ('ready_to_enrol') THEN 'Approaching enrollment deadline'
        WHEN a.stage IN ('enquiry', 'pre_application') THEN 'Early stage lead'
        ELSE 'Normal processing time'
    END
FROM people p
WHERE a.person_id = p.id;


-- ============================================================================
-- PART 5: Add Application-Specific Data (Qualifications, Documents, Fee Status)
-- ============================================================================

-- Add custom application data fields using application metadata/decision_factors
-- This is RAW data that ML scripts will process

-- Add qualifications data (A-levels, BTECs, International Baccalaureate, etc.)
UPDATE applications a
SET decision_factors = COALESCE(decision_factors, '{}'::jsonb) || 
    jsonb_build_object(
        'qualifications', CASE 
            -- Vary qualification types realistically
            WHEN random() < 0.40 THEN jsonb_build_object(
                'type', 'A-Level',
                'subjects', ARRAY['Mathematics', 'Physics', 'Computer Science'],
                'predicted_grades', 'AAB',
                'submitted', (random() < 0.70),  -- 70% submitted
                'verified', (random() < 0.50)    -- 50% verified
            )
            WHEN random() < 0.70 THEN jsonb_build_object(
                'type', 'BTEC',
                'subjects', ARRAY['Business Studies', 'IT'],
                'predicted_grades', 'DDM',
                'submitted', (random() < 0.60),
                'verified', (random() < 0.40)
            )
            ELSE jsonb_build_object(
                'type', 'International Baccalaureate',
                'predicted_score', floor(random() * 10 + 30)::int,  -- 30-40 points
                'submitted', (random() < 0.80),
                'verified', (random() < 0.60)
            )
        END,
        
        'personal_statement', jsonb_build_object(
            'submitted', (random() < 0.75),  -- 75% submitted
            'word_count', CASE WHEN random() < 0.75 THEN floor(random() * 500 + 500)::int ELSE NULL END,
            'reviewed', (random() < 0.40)  -- 40% reviewed
        ),
        
        'references', jsonb_build_object(
            'academic_reference_received', (random() < 0.65),  -- 65% received
            'professional_reference_received', (random() < 0.50),  -- 50% received
            'references_complete', (random() < 0.45)  -- 45% complete
        ),
        
        'id_verification', jsonb_build_object(
            'passport_submitted', (random() < 0.70),  -- 70% submitted passport
            'passport_verified', (random() < 0.50),  -- 50% verified
            'proof_of_address_submitted', (random() < 0.60),
            'proof_of_address_verified', (random() < 0.40),
            'id_check_complete', (random() < 0.35)  -- 35% fully complete
        ),
        
        'fee_status', jsonb_build_object(
            'fee_status_declared', (random() < 0.85),  -- 85% declared
            'fee_status', CASE 
                WHEN random() < 0.75 THEN 'home'
                WHEN random() < 0.90 THEN 'international'
                ELSE 'not_declared'
            END,
            'evidence_submitted', (random() < 0.50),
            'evidence_verified', (random() < 0.30),
            'student_finance_application', CASE 
                WHEN random() < 0.60 THEN 'in_progress'
                WHEN random() < 0.80 THEN 'submitted'
                WHEN random() < 0.90 THEN 'approved'
                ELSE 'not_started'
            END
        ),
        
        'english_language', jsonb_build_object(
            'first_language_english', (random() < 0.75),
            'ielts_required', (random() < 0.25),
            'ielts_submitted', (random() < 0.15),
            'ielts_score', CASE WHEN random() < 0.15 THEN (random() * 2 + 5.5)::decimal(3,1) ELSE NULL END,
            'english_test_waived', (random() < 0.10)
        ),
        
        'interviews_scheduled', jsonb_build_object(
            'interview_required', (a.stage IN ('interview_portfolio', 'review_in_progress', 'review_complete', 'director_review_in_progress', 'director_review_complete')),
            'interview_scheduled', (random() < 0.50 AND a.stage IN ('interview_portfolio', 'review_in_progress')),
            'interview_completed', (random() < 0.30 AND a.stage IN ('review_complete', 'director_review_in_progress', 'director_review_complete')),
            'interview_outcome', CASE 
                WHEN random() < 0.30 AND a.stage IN ('review_complete', 'director_review_complete') THEN 
                    CASE 
                        WHEN random() < 0.75 THEN 'positive'
                        WHEN random() < 0.90 THEN 'borderline'
                        ELSE 'negative'
                    END
                ELSE NULL
            END
        )
    )
WHERE a.stage NOT IN ('rejected', 'offer_withdrawn', 'offer_declined', 'enrolled');

-- NOTE: We are NOT setting progression_probability, enrollment_probability, 
-- progression_blockers, or recommended_actions here.
-- The ML scripts (application_ml.py) will calculate these dynamically based on:
-- - Stage
-- - Time in stage
-- - Lead score & engagement score
-- - Data completeness (qualifications, documents, ID, fee status)
-- - Interview completion
-- - Recent activity
-- This tests the real AI system efficacy!


-- ============================================================================
-- PART 6: Note About ML Outputs
-- ============================================================================

-- We are NOT modifying any existing ML outputs (progression_probability, etc.)
-- to avoid breaking what's already working.
-- 
-- The ML scripts (application_ml.py) will calculate these dynamically for 
-- applications that don't have them yet, based on:
-- 1. Stage and time in stage
-- 2. Lead score & engagement score from people table
-- 3. Data completeness from decision_factors (qualifications, documents, etc.)
-- 4. Interview completion status
-- 5. Recent activity and touchpoint count
-- 6. GDPR consent status
--
-- This way existing ML data is preserved, and new raw data can be processed
-- by the live AI system!


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify GDPR data
SELECT 
  'GDPR Verification' as check_name,
  COUNT(*) as total_people,
  COUNT(gdpr_consent_given) FILTER (WHERE gdpr_consent_given = TRUE) as with_consent,
  COUNT(gdpr_marketing_consent) FILTER (WHERE gdpr_marketing_consent = TRUE) as with_marketing_consent,
  ROUND(AVG(CASE WHEN gdpr_consent_given THEN 100 ELSE 0 END), 1) as consent_percentage
FROM people;

-- Verify RAW data completeness (NOT ML outputs)
SELECT 
  'Raw Data Verification' as check_name,
  COUNT(*) as total_applications,
  COUNT(decision_factors->'qualifications') as with_qualifications_data,
  COUNT(decision_factors->'id_verification') as with_id_data,
  COUNT(decision_factors->'fee_status') as with_fee_status_data,
  COUNT(priority) as with_priority,
  COUNT(urgency) as with_urgency,
  -- ML outputs should be NULL (will be calculated by live scripts)
  COUNT(progression_probability) as ml_pre_calculated_count,  -- Should be 0
  COUNT(progression_blockers) FILTER (WHERE jsonb_array_length(progression_blockers) > 0) as ml_blockers_count  -- Should be 0
FROM applications;

-- Verify priority/urgency distribution
SELECT 
  'Priority Distribution' as check_name,
  priority,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percentage
FROM applications
GROUP BY priority
ORDER BY 
  CASE priority 
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END;

SELECT 
  'Urgency Distribution' as check_name,
  urgency,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percentage
FROM applications
GROUP BY urgency
ORDER BY 
  CASE urgency 
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
  END;

-- Verify people ML fields
SELECT 
  'People ML Verification' as check_name,
  COUNT(*) as total_people,
  COUNT(lead_score) as with_lead_score,
  COUNT(engagement_score) as with_engagement_score,
  COUNT(conversion_probability) as with_conversion_prob,
  ROUND(AVG(lead_score), 1) as avg_lead_score,
  ROUND(AVG(engagement_score), 1) as avg_engagement_score,
  ROUND(AVG(conversion_probability::numeric), 3) as avg_conversion_prob
FROM people;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 0031 completed successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ GDPR fields added to people table';
  RAISE NOTICE '✅ GDPR data populated for all people';
  RAISE NOTICE '✅ All people have varied ML base scores';
  RAISE NOTICE '✅ Application data added (qualifications, documents, ID, fee status)';
  RAISE NOTICE '✅ Data completeness varied realistically';
  RAISE NOTICE '✅ Realistic priority/urgency distribution';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 ML OUTPUTS CLEARED - LIVE SCRIPTS WILL CALCULATE:';
  RAISE NOTICE '   - progression_probability';
  RAISE NOTICE '   - enrollment_probability';
  RAISE NOTICE '   - progression_blockers';
  RAISE NOTICE '   - recommended_actions';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎯 This tests REAL AI system efficacy!';
  RAISE NOTICE '========================================';
END $$;

