-- Migration: Lead scoring weights system for adaptive ML optimization
-- Idempotent: creates tables for storing and auditing scoring weights

-- Current weights table (single row per org, updated by ML optimizer)
CREATE TABLE IF NOT EXISTS lead_scoring_weights (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES orgs(id),
    engagement decimal(3,2) NOT NULL DEFAULT 0.30,
    recency decimal(3,2) NOT NULL DEFAULT 0.25,
    source_quality decimal(3,2) NOT NULL DEFAULT 0.20,
    contactability decimal(3,2) NOT NULL DEFAULT 0.15,
    course_fit decimal(3,2) NOT NULL DEFAULT 0.10,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by text DEFAULT 'ML Optimizer',
    notes text
);

-- Audit trail for weight changes (full history)
CREATE TABLE IF NOT EXISTS lead_scoring_weights_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES orgs(id),
    weights_id uuid NOT NULL REFERENCES lead_scoring_weights(id),
    engagement decimal(3,2) NOT NULL,
    recency decimal(3,2) NOT NULL,
    source_quality decimal(3,2) NOT NULL,
    contactability decimal(3,2) NOT NULL,
    course_fit decimal(3,2) NOT NULL,
    change_reason text NOT NULL,
    sample_size int, -- number of outcomes used for optimization
    model_performance decimal(3,2), -- accuracy/AUC of the logistic model
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by text DEFAULT 'ML Optimizer'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_scoring_weights_org ON lead_scoring_weights(org_id);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_weights_active ON lead_scoring_weights(org_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_lead_scoring_weights_audit_org ON lead_scoring_weights_audit(org_id);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_weights_audit_weights ON lead_scoring_weights_audit(weights_id);

-- Ensure only one active weight set per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_scoring_weights_one_active_per_org 
ON lead_scoring_weights(org_id) WHERE is_active = true;

-- Insert default weights for existing orgs
INSERT INTO lead_scoring_weights (org_id, engagement, recency, source_quality, contactability, course_fit, notes)
SELECT 
    id as org_id,
    0.30 as engagement,
    0.25 as recency,
    0.20 as source_quality,
    0.15 as contactability,
    0.10 as course_fit,
    'Default weights from migration'
FROM orgs
ON CONFLICT (org_id) WHERE is_active = true DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE lead_scoring_weights IS 'Current lead scoring weights for ML-optimized triage';
COMMENT ON TABLE lead_scoring_weights_audit IS 'Audit trail of all weight changes for compliance and debugging';
COMMENT ON COLUMN lead_scoring_weights.engagement IS 'Weight for engagement factors (emails, events, portal logins)';
COMMENT ON COLUMN lead_scoring_weights.recency IS 'Weight for recency factors (days since last activity)';
COMMENT ON COLUMN lead_scoring_weights.source_quality IS 'Weight for source quality factors (UCAS, referrals, etc.)';
COMMENT ON COLUMN lead_scoring_weights.contactability IS 'Weight for contactability factors (email, phone, GDPR)';
COMMENT ON COLUMN lead_scoring_weights.course_fit IS 'Weight for course fit factors (specific course, degree level, supply)';
COMMENT ON COLUMN lead_scoring_weights_audit.sample_size IS 'Number of outcome records used for this optimization';
COMMENT ON COLUMN lead_scoring_weights_audit.model_performance IS 'Performance metric of the logistic regression model';
