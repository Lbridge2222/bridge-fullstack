-- Migration: Repository Cleanup and Consolidation
-- This migration helps clean up the repository by removing redundant seed files
-- and consolidating the data structure

-- Note: This is a documentation migration - the actual cleanup should be done
-- by removing the old migration files from the filesystem

-- ============================================================================
-- REPOSITORY CLEANUP INSTRUCTIONS
-- ============================================================================

-- After running the merged seed (0020_merged_comprehensive_seed.sql), 
-- you can safely remove these old migration files to clean up your repository:

-- REMOVE THESE FILES (they are now consolidated in 0020_merged_comprehensive_seed.sql):
-- - 0002_seed_minimal.sql (minimal seed data)
-- - 0013_enhanced_seed_data.sql (enhanced seed data) 
-- - 0019_comprehensive_seed_data.sql (comprehensive seed data)

-- KEEP THESE ESSENTIAL MIGRATIONS:
-- - 0001_init.sql (database initialization)
-- - 0003_mv_board_applications.sql (materialized views)
-- - 0004_people_lifecycle_enum.sql (enum definitions)
-- - 0005_people_contact_enhancements.sql (contact enhancements)
-- - 0006_programmes_details.sql (programme details)
-- - 0007_analytics_touchpoints.sql (analytics)
-- - 0008_consents_retention.sql (consents)
-- - 0009_attribution_models.sql (attribution)
-- - 0010_perf_indexes.sql (performance indexes)
-- - 0011_applications_priority_urgency.sql (priority fields)
-- - 0012_enriched_views.sql (enriched views)
-- - 0014_lifecycle_stage_alignment.sql (lifecycle alignment)
-- - 0015_fix_area_views_add_created_at.sql (view fixes)
-- - 0016_fix_days_in_pipeline_int.sql (pipeline fixes)
-- - 0017_create_offers_management_view.sql (offers view)
-- - 0018_create_dashboard_metrics_view.sql (dashboard view)
-- - 0020_merged_comprehensive_seed.sql (consolidated seed data)

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- After cleanup, verify your data integrity with these queries:

-- Check total records in each table:
-- SELECT 'people' as table_name, COUNT(*) as record_count FROM people
-- UNION ALL
-- SELECT 'applications', COUNT(*) FROM applications
-- UNION ALL
-- SELECT 'offers', COUNT(*) FROM offers
-- UNION ALL
-- SELECT 'enrollments', COUNT(*) FROM enrollments
-- UNION ALL
-- SELECT 'document_checklist', COUNT(*) FROM document_checklist;

-- Check lifecycle state distribution:
-- SELECT lifecycle_state, COUNT(*) as count 
-- FROM people 
-- GROUP BY lifecycle_state 
-- ORDER BY count DESC;

-- Check application stage distribution:
-- SELECT stage, COUNT(*) as count 
-- FROM applications 
-- GROUP BY stage 
-- ORDER BY count DESC;

-- Check offer status distribution:
-- SELECT offer_status, COUNT(*) as count 
-- FROM offers 
-- GROUP BY offer_status 
-- ORDER BY count DESC;

-- ============================================================================
-- MIGRATION ORDER FOR CLEAN INSTALL
-- ============================================================================

-- For a clean installation, run migrations in this order:
-- 1. 0001_init.sql (database structure)
-- 2. 0003_mv_board_applications.sql (views)
-- 3. 0004_people_lifecycle_enum.sql (enums)
-- 4. 0005_people_contact_enhancements.sql (enhancements)
-- 5. 0006_programmes_details.sql (programmes)
-- 6. 0007_analytics_touchpoints.sql (analytics)
-- 7. 0008_consents_retention.sql (consents)
-- 8. 0009_attribution_models.sql (attribution)
-- 9. 0010_perf_indexes.sql (indexes)
-- 10. 0011_applications_priority_urgency.sql (priority)
-- 11. 0012_enriched_views.sql (views)
-- 12. 0014_lifecycle_stage_alignment.sql (alignment)
-- 13. 0015_fix_area_views_add_created_at.sql (fixes)
-- 14. 0016_fix_days_in_pipeline_int.sql (fixes)
-- 15. 0017_create_offers_management_view.sql (offers view)
-- 16. 0018_create_dashboard_metrics_view.sql (dashboard view)
-- 17. 0020_merged_comprehensive_seed.sql (consolidated data)

-- ============================================================================
-- BENEFITS OF CONSOLIDATION
-- ============================================================================

-- 1. Cleaner Repository: Single seed file instead of multiple overlapping ones
-- 2. Better Maintainability: One place to update seed data
-- 3. Consistent Data: No conflicts between different seed files
-- 4. Easier Testing: Single migration to run for data setup
-- 5. Better Documentation: Clear structure with essential infrastructure + CRM data
-- 6. Reduced Confusion: No duplicate or conflicting seed data

-- ============================================================================
-- ROLLBACK CONSIDERATIONS
-- ============================================================================

-- If you need to rollback, you can:
-- 1. Restore the old migration files from git history
-- 2. Run the specific migrations you need
-- 3. Or restore from a database backup

-- The merged seed file is designed to be idempotent and safe to run multiple times
