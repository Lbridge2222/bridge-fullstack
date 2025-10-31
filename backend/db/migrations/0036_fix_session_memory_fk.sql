-- Migration 0036: Fix user_session_memory FK constraint
-- The FK constraint was incorrectly pointing to auth.users instead of public.users

-- Drop the incorrect FK constraint
ALTER TABLE public.user_session_memory
DROP CONSTRAINT IF EXISTS user_session_memory_user_id_fkey;

-- Add the correct FK constraint pointing to public.users
ALTER TABLE public.user_session_memory
ADD CONSTRAINT user_session_memory_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Verify the fix
COMMENT ON CONSTRAINT user_session_memory_user_id_fkey ON public.user_session_memory
IS 'FK to public.users (not auth.users)';
