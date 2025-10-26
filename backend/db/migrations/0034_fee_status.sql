-- Migration: Add Fee Status to Applications
-- Phase 2E: Fee status (home/international) is CRITICAL for UK HE scoring
-- International and home students have vastly different conversion patterns

-- Add fee_status to applications table
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS fee_status TEXT CHECK (fee_status IN ('home', 'international', 'eu', 'unknown'));

-- Add priority and urgency fields if they don't exist (for completeness)
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS priority TEXT,
ADD COLUMN IF NOT EXISTS urgency TEXT;

-- Create index for efficient fee_status queries
CREATE INDEX IF NOT EXISTS idx_applications_fee_status
ON applications(fee_status, stage);

-- Add comment explaining fee status values
COMMENT ON COLUMN applications.fee_status IS 'Fee status: home (UK), international (non-EU), eu (EU/EEA), unknown';

-- Seed realistic fee status data for existing applications (testing only)
-- In production, this would come from application forms
UPDATE applications
SET fee_status = CASE
    WHEN RANDOM() < 0.70 THEN 'home'          -- 70% home students (typical UK HE)
    WHEN RANDOM() < 0.90 THEN 'international'  -- 20% international
    ELSE 'eu'                                  -- 10% EU
END
WHERE fee_status IS NULL;
