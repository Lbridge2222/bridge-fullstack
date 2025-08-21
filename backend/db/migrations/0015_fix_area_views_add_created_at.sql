-- This migration was originally intended to add created_at to get_people_by_system_area function
-- However, this was incorporated directly into migration 0014_lifecycle_stage_alignment.sql
-- This file is kept for migration numbering consistency but performs no operations

-- Add a comment to document this migration's purpose
COMMENT ON FUNCTION get_people_by_system_area(text) IS 'Returns people filtered by system area with created_at for proper ordering';