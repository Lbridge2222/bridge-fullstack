-- Migration 0035: Actions System
-- Implements intelligent action triage, execution tracking, and session memory
-- For Phase A: Next Best Action with sophisticated prioritization

-- ============================================================================
-- 1. Session State (User Context & Preferences)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_session_memory (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  session_ctx JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_session_memory IS 'Stores user session context for personalized action triage';
COMMENT ON COLUMN public.user_session_memory.session_ctx IS 'JSON: activeStage, viewedApplications, lastTriageIds, preferences';

CREATE INDEX IF NOT EXISTS idx_user_session_updated ON public.user_session_memory(updated_at);

-- ============================================================================
-- 2. Action Queue (Ephemeral Priority Queue)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.action_queue (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('email', 'call', 'flag', 'unblock')),
  reason TEXT NOT NULL,
  priority NUMERIC NOT NULL DEFAULT 0.0,
  expected_gain NUMERIC,  -- Expected probability increase
  artifacts JSONB,  -- { message, context[], suggested_subject }
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.action_queue IS 'Ephemeral priority queue of recommended actions (TTL: end of day)';
COMMENT ON COLUMN public.action_queue.priority IS 'Calculated: conversion_probability * urgency_multiplier * impact_weight';
COMMENT ON COLUMN public.action_queue.expected_gain IS 'Expected progression probability increase (0-1)';
COMMENT ON COLUMN public.action_queue.artifacts IS 'JSON: {message, context[], suggested_subject, applicant_context}';

CREATE INDEX IF NOT EXISTS idx_action_queue_user_priority ON public.action_queue(user_id, priority DESC);
CREATE INDEX IF NOT EXISTS idx_action_queue_expires ON public.action_queue(expires_at);
CREATE INDEX IF NOT EXISTS idx_action_queue_application ON public.action_queue(application_id);

-- ============================================================================
-- 3. Action Executions (Closed-Loop Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.action_executions (
  id BIGSERIAL PRIMARY KEY,
  queue_id BIGINT REFERENCES public.action_queue(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result TEXT CHECK (result IN ('sent', 'failed', 'skipped', 'simulated')),
  lead_moved BOOLEAN DEFAULT FALSE,  -- Did stage advance?
  time_to_next_stage_days NUMERIC,  -- Measured outcome
  metadata JSONB,  -- Execution details, error messages, etc

  -- Outcome tracking (for ROI measurement)
  outcome_measured_at TIMESTAMPTZ,
  conversion_delta NUMERIC,  -- Actual probability change
  response_received BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE public.action_executions IS 'Tracks all action executions for ROI analysis and closed-loop learning';
COMMENT ON COLUMN public.action_executions.conversion_delta IS 'Measured impact on conversion probability';

CREATE INDEX IF NOT EXISTS idx_action_exec_app ON public.action_executions(application_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_exec_user ON public.action_executions(user_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_exec_outcome ON public.action_executions(outcome_measured_at) WHERE outcome_measured_at IS NOT NULL;

-- ============================================================================
-- 4. AI Event Telemetry (Enhanced)
-- ============================================================================

-- Check if ai_events table exists, if not create it
DO $create_table$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_events') THEN
    CREATE TABLE public.ai_events (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      model TEXT,
      latency_ms INTEGER,
      redacted BOOLEAN DEFAULT TRUE,
      prompt_hash TEXT,
      output_hash TEXT,
      payload_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $create_table$;

-- Add missing columns if table already exists (from previous migrations)
DO $migration$
BEGIN
  -- Add event_type if missing
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_events' AND column_name = 'event_type') THEN
    ALTER TABLE public.ai_events ADD COLUMN event_type TEXT NOT NULL DEFAULT 'unknown';
    ALTER TABLE public.ai_events ALTER COLUMN event_type DROP DEFAULT;
  END IF;

  -- Add model if missing
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_events' AND column_name = 'model') THEN
    ALTER TABLE public.ai_events ADD COLUMN model TEXT;
  END IF;

  -- Add latency_ms if missing
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_events' AND column_name = 'latency_ms') THEN
    ALTER TABLE public.ai_events ADD COLUMN latency_ms INTEGER;
  END IF;

  -- Add redacted if missing
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_events' AND column_name = 'redacted') THEN
    ALTER TABLE public.ai_events ADD COLUMN redacted BOOLEAN DEFAULT TRUE;
  END IF;

  -- Add prompt_hash if missing
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_events' AND column_name = 'prompt_hash') THEN
    ALTER TABLE public.ai_events ADD COLUMN prompt_hash TEXT;
  END IF;

  -- Add output_hash if missing
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_events' AND column_name = 'output_hash') THEN
    ALTER TABLE public.ai_events ADD COLUMN output_hash TEXT;
  END IF;

  -- Add payload_json if missing
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_events' AND column_name = 'payload_json') THEN
    ALTER TABLE public.ai_events ADD COLUMN payload_json JSONB;
  END IF;

  -- Add user_id if missing
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_events' AND column_name = 'user_id') THEN
    ALTER TABLE public.ai_events ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $migration$;

-- Create indexes (IF NOT EXISTS handles if they already exist)
CREATE INDEX IF NOT EXISTS idx_ai_events_type ON public.ai_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_events_user ON public.ai_events(user_id, created_at DESC);

-- Add comments
COMMENT ON TABLE public.ai_events IS 'Telemetry for all AI operations (LLM calls, triage, scoring)';
COMMENT ON COLUMN public.ai_events.redacted IS 'PII removed from payload';
COMMENT ON COLUMN public.ai_events.prompt_hash IS 'SHA256 hash of prompt for deduplication';

-- ============================================================================
-- 5. Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.user_session_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_events ENABLE ROW LEVEL SECURITY;

-- Session memory: users can only access their own
CREATE POLICY "own_session" ON public.user_session_memory
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Action queue: users can only access their own
CREATE POLICY "own_action_queue" ON public.action_queue
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Action executions: users can see their own
CREATE POLICY "own_executions_select" ON public.action_executions
  FOR SELECT USING (auth.uid() = user_id);

-- AI events: users can see their own events
CREATE POLICY "own_ai_events_select" ON public.ai_events
  FOR SELECT USING (auth.uid() = user_id);

-- Optional: Admin policy for service role (analytics, monitoring)
-- CREATE POLICY "admin_all" ON public.ai_events
--   FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 6. Helper Functions
-- ============================================================================

-- Function to clean expired actions (run daily)
CREATE OR REPLACE FUNCTION clean_expired_actions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.action_queue
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION clean_expired_actions IS 'Removes expired actions from queue (run daily via cron)';

-- Function to get top actions for user
CREATE OR REPLACE FUNCTION get_top_actions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id BIGINT,
  application_id UUID,
  action_type TEXT,
  reason TEXT,
  priority NUMERIC,
  expected_gain NUMERIC,
  artifacts JSONB,
  applicant_name TEXT,
  stage TEXT,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    aq.id,
    aq.application_id,
    aq.action_type,
    aq.reason,
    aq.priority,
    aq.expected_gain,
    aq.artifacts,
    p.first_name || ' ' || p.last_name AS applicant_name,
    a.stage,
    aq.expires_at
  FROM public.action_queue aq
  JOIN applications a ON a.id = aq.application_id
  JOIN people p ON p.id = a.person_id
  WHERE aq.user_id = p_user_id
    AND (aq.expires_at IS NULL OR aq.expires_at > NOW())
  ORDER BY aq.priority DESC, aq.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_top_actions IS 'Returns top priority actions for user with applicant details';

-- ============================================================================
-- 7. Sample Data (for testing)
-- ============================================================================

-- Insert sample session context
INSERT INTO public.user_session_memory (user_id, session_ctx)
SELECT
  id,
  jsonb_build_object(
    'activeStage', 'conditional_offer_no_response',
    'viewedApplications', '[]'::jsonb,
    'lastTriageIds', '[]'::jsonb,
    'preferences', jsonb_build_object('comms', 'email')
  )
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Note: Action queue will be populated dynamically by triage engine
-- Sample actions can be generated via: POST /api/applications/triage

-- ============================================================================
-- 8. Grants
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_session_memory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_queue TO authenticated;
GRANT SELECT, INSERT ON public.action_executions TO authenticated;
GRANT SELECT, INSERT ON public.ai_events TO authenticated;

-- Grant sequence access (only if sequences exist)
DO $grant_sequences$
BEGIN
  -- action_queue sequence
  IF EXISTS (SELECT FROM pg_class WHERE relkind = 'S' AND relname = 'action_queue_id_seq') THEN
    GRANT USAGE, SELECT ON SEQUENCE action_queue_id_seq TO authenticated;
  END IF;

  -- action_executions sequence
  IF EXISTS (SELECT FROM pg_class WHERE relkind = 'S' AND relname = 'action_executions_id_seq') THEN
    GRANT USAGE, SELECT ON SEQUENCE action_executions_id_seq TO authenticated;
  END IF;

  -- ai_events sequence (may have different name from previous migration)
  IF EXISTS (SELECT FROM pg_class WHERE relkind = 'S' AND relname = 'ai_events_id_seq') THEN
    GRANT USAGE, SELECT ON SEQUENCE ai_events_id_seq TO authenticated;
  END IF;
END $grant_sequences$;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Tables created:
--   - user_session_memory (session context)
--   - action_queue (priority queue)
--   - action_executions (closed-loop tracking)
--   - ai_events (enhanced telemetry)
--
-- Functions created:
--   - clean_expired_actions() (daily maintenance)
--   - get_top_actions(user_id, limit) (optimized query)
--
-- RLS enabled for all tables
-- ============================================================================
