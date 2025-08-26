-- Migration: Enhance ai_events table for AI guardrails and PII redaction
-- Idempotent: adds columns if they don't exist

-- First, create the ai_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL,
    meta jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Add enhanced columns for AI guardrails
ALTER TABLE ai_events ADD COLUMN IF NOT EXISTS raw_prompt text;
ALTER TABLE ai_events ADD COLUMN IF NOT EXISTS redacted_prompt text;
ALTER TABLE ai_events ADD COLUMN IF NOT EXISTS raw_response text;
ALTER TABLE ai_events ADD COLUMN IF NOT EXISTS redacted_response text;
ALTER TABLE ai_events ADD COLUMN IF NOT EXISTS confidence decimal(3,2);
ALTER TABLE ai_events ADD COLUMN IF NOT EXISTS reason_codes text[];

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_events_action ON ai_events(action);
CREATE INDEX IF NOT EXISTS idx_ai_events_created_at ON ai_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_events_confidence ON ai_events(confidence) WHERE confidence IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE ai_events IS 'AI event telemetry with PII redaction and guardrails';
COMMENT ON COLUMN ai_events.raw_prompt IS 'Original prompt sent to AI model (may contain PII)';
COMMENT ON COLUMN ai_events.redacted_prompt IS 'PII-redacted version of prompt for safe storage';
COMMENT ON COLUMN ai_events.raw_response IS 'Original response from AI model (may contain PII)';
COMMENT ON COLUMN ai_events.redacted_response IS 'PII-redacted version of response for safe storage';
COMMENT ON COLUMN ai_events.confidence IS 'AI model confidence score (0.0-1.0)';
COMMENT ON COLUMN ai_events.reason_codes IS 'Array of reason codes explaining AI decisions';
