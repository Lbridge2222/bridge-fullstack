-- Make user_id nullable for Ivy-generated actions
-- Phase 3: Allow actions created by Ivy without specific user assignment
-- Date: 2025-10-30

ALTER TABLE public.action_queue
ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN public.action_queue.user_id IS 'User assigned to action. NULL for Ivy-generated actions awaiting assignment.';
