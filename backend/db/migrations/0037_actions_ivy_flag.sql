-- Phase 3: Add created_by_ivy flag to action_queue table
-- Enables tracking of Ivy-generated actions
-- Date: 2025-10-29

ALTER TABLE public.action_queue
ADD COLUMN IF NOT EXISTS created_by_ivy BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_action_queue_created_by_ivy
ON public.action_queue(created_by_ivy)
WHERE created_by_ivy = TRUE;

COMMENT ON COLUMN public.action_queue.created_by_ivy IS 'Flag indicating action was created by Ivy AI assistant';

-- Also add description field for Ivy-generated action descriptions
ALTER TABLE public.action_queue
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.action_queue.description IS 'Detailed description of the action (especially for Ivy-generated actions)';
