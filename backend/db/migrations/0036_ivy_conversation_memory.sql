-- Phase 2: Conversation Memory for Ivy
-- Enables multi-turn conversations with context awareness
-- Date: 2025-10-29

-- Conversation sessions for grouping related queries
CREATE TABLE IF NOT EXISTS public.ivy_conversation_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    board_context VARCHAR(50) NOT NULL, -- 'applications', 'leads', 'people', etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),

    -- Metadata for analytics
    total_messages INTEGER DEFAULT 0,
    last_query TEXT
);

-- Individual messages in conversations
CREATE TABLE IF NOT EXISTS public.ivy_conversation_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.ivy_conversation_sessions(session_id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Structured context for applicant-related messages
    mentioned_application_ids TEXT[], -- Array of application IDs mentioned
    query_intent VARCHAR(50), -- 'pipeline_health', 'urgent_followup', 'enrolment_forecast', etc.
    backend_candidates TEXT[], -- Candidates suggested by backend (for call-to-action tracking)

    -- Metadata
    confidence FLOAT,
    query_type VARCHAR(50)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ivy_messages_session ON public.ivy_conversation_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ivy_sessions_user ON public.ivy_conversation_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ivy_sessions_expires ON public.ivy_conversation_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_ivy_sessions_board ON public.ivy_conversation_sessions(board_context, updated_at DESC);

-- Function to update session updated_at timestamp
CREATE OR REPLACE FUNCTION update_ivy_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.ivy_conversation_sessions
    SET
        updated_at = NOW(),
        expires_at = NOW() + INTERVAL '2 hours',
        total_messages = total_messages + 1,
        last_query = CASE WHEN NEW.role = 'user' THEN NEW.content ELSE last_query END
    WHERE session_id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update session on new message
CREATE TRIGGER trigger_update_ivy_session_on_message
AFTER INSERT ON public.ivy_conversation_messages
FOR EACH ROW
EXECUTE FUNCTION update_ivy_session_updated_at();

-- Function to clean up expired sessions (to be called by cron)
CREATE OR REPLACE FUNCTION cleanup_expired_ivy_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete sessions older than 24 hours
    DELETE FROM public.ivy_conversation_sessions
    WHERE expires_at < NOW() - INTERVAL '24 hours';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE public.ivy_conversation_sessions IS 'Stores Ivy conversation sessions for multi-turn dialogue with context awareness';
COMMENT ON TABLE public.ivy_conversation_messages IS 'Individual messages within Ivy conversation sessions';
COMMENT ON COLUMN public.ivy_conversation_sessions.expires_at IS 'Sessions expire after 2 hours of inactivity, extended on each new message';
COMMENT ON COLUMN public.ivy_conversation_messages.mentioned_application_ids IS 'Application IDs mentioned in this message for context tracking';
COMMENT ON COLUMN public.ivy_conversation_messages.backend_candidates IS 'Candidates suggested by backend, used for follow-up detection';
COMMENT ON FUNCTION cleanup_expired_ivy_sessions() IS 'Cleanup function for expired sessions, run daily via cron';
