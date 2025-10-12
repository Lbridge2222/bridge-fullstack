-- ============================================================================
-- Migration 0032: Application Audit Log System
-- ============================================================================
-- Purpose: Create comprehensive audit trail for all application data changes
--
-- This is CRITICAL for admissions compliance:
-- - Track who changed what and when
-- - Track old and new values
-- - Track field-level changes
-- - Immutable audit trail
-- - Support for compliance reporting
--
-- Changes:
-- 1. Create application_audit_log table
-- 2. Create audit trigger function
-- 3. Add trigger to applications table
-- 4. Add indexes for efficient querying
-- 5. Create audit log view for easy reporting
-- ============================================================================

-- ============================================================================
-- PART 1: Create Audit Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS application_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What was changed
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL DEFAULT 'applications',
    
    -- Who made the change
    changed_by_user_id UUID REFERENCES users(id),
    changed_by_user_email TEXT,
    changed_by_user_name TEXT,
    
    -- When
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- What changed
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    field_name TEXT,  -- Specific field that changed (for UPDATE)
    old_value JSONB,  -- Old value (for UPDATE/DELETE)
    new_value JSONB,  -- New value (for INSERT/UPDATE)
    
    -- Context
    change_reason TEXT,  -- Optional reason for change
    ip_address INET,  -- IP address of user making change
    user_agent TEXT,  -- Browser/client info
    
    -- Full row snapshots (for complete audit trail)
    old_row JSONB,  -- Complete row before change
    new_row JSONB,  -- Complete row after change
    
    -- Metadata
    change_source TEXT DEFAULT 'manual',  -- 'manual', 'api', 'import', 'migration', 'ml_calculation'
    session_id TEXT,  -- Session ID for grouping related changes
    
    -- Compliance
    is_sensitive_field BOOLEAN DEFAULT FALSE,  -- Flag for GDPR/sensitive data changes
    requires_approval BOOLEAN DEFAULT FALSE,  -- Flag for changes requiring approval
    approved_by_user_id UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    CONSTRAINT audit_log_valid_operation CHECK (
        (operation = 'INSERT' AND old_value IS NULL) OR
        (operation = 'DELETE' AND new_value IS NULL) OR
        (operation = 'UPDATE' AND old_value IS NOT NULL AND new_value IS NOT NULL)
    )
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_log_application_id ON application_audit_log(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON application_audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON application_audit_log(changed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_field_name ON application_audit_log(field_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON application_audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_audit_log_sensitive ON application_audit_log(is_sensitive_field) WHERE is_sensitive_field = TRUE;

-- GIN indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_audit_log_old_value_gin ON application_audit_log USING GIN (old_value);
CREATE INDEX IF NOT EXISTS idx_audit_log_new_value_gin ON application_audit_log USING GIN (new_value);

-- Comments for documentation
COMMENT ON TABLE application_audit_log IS 'Immutable audit trail for all application data changes';
COMMENT ON COLUMN application_audit_log.field_name IS 'Specific field that changed (NULL for full row operations)';
COMMENT ON COLUMN application_audit_log.old_value IS 'Previous value of the field (JSONB for flexibility)';
COMMENT ON COLUMN application_audit_log.new_value IS 'New value of the field (JSONB for flexibility)';
COMMENT ON COLUMN application_audit_log.change_source IS 'Source of change: manual, api, import, migration, ml_calculation';
COMMENT ON COLUMN application_audit_log.is_sensitive_field IS 'Flag for GDPR/sensitive data changes (requires special handling)';


-- ============================================================================
-- PART 2: Create Audit Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_application_changes()
RETURNS TRIGGER AS $$
DECLARE
    changed_fields TEXT[];
    field_name TEXT;
    old_val JSONB;
    new_val JSONB;
BEGIN
    -- For INSERT operations
    IF TG_OP = 'INSERT' THEN
        INSERT INTO application_audit_log (
            application_id,
            table_name,
            operation,
            new_row,
            change_source,
            changed_at
        ) VALUES (
            NEW.id,
            TG_TABLE_NAME,
            'INSERT',
            to_jsonb(NEW),
            'manual',
            NOW()
        );
        RETURN NEW;
    END IF;
    
    -- For DELETE operations
    IF TG_OP = 'DELETE' THEN
        INSERT INTO application_audit_log (
            application_id,
            table_name,
            operation,
            old_row,
            change_source,
            changed_at
        ) VALUES (
            OLD.id,
            TG_TABLE_NAME,
            'DELETE',
            to_jsonb(OLD),
            'manual',
            NOW()
        );
        RETURN OLD;
    END IF;
    
    -- For UPDATE operations - track field-level changes
    IF TG_OP = 'UPDATE' THEN
        -- Track each changed field separately
        
        -- Stage changes (critical for compliance)
        IF OLD.stage IS DISTINCT FROM NEW.stage THEN
            INSERT INTO application_audit_log (
                application_id,
                table_name,
                operation,
                field_name,
                old_value,
                new_value,
                old_row,
                new_row,
                change_source,
                changed_at
            ) VALUES (
                NEW.id,
                TG_TABLE_NAME,
                'UPDATE',
                'stage',
                to_jsonb(OLD.stage),
                to_jsonb(NEW.stage),
                to_jsonb(OLD),
                to_jsonb(NEW),
                'manual',
                NOW()
            );
        END IF;
        
        -- Status changes
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO application_audit_log (
                application_id,
                table_name,
                operation,
                field_name,
                old_value,
                new_value,
                change_source,
                changed_at
            ) VALUES (
                NEW.id,
                TG_TABLE_NAME,
                'UPDATE',
                'status',
                to_jsonb(OLD.status),
                to_jsonb(NEW.status),
                'manual',
                NOW()
            );
        END IF;
        
        -- Priority changes
        IF OLD.priority IS DISTINCT FROM NEW.priority THEN
            INSERT INTO application_audit_log (
                application_id,
                table_name,
                operation,
                field_name,
                old_value,
                new_value,
                change_source,
                changed_at
            ) VALUES (
                NEW.id,
                TG_TABLE_NAME,
                'UPDATE',
                'priority',
                to_jsonb(OLD.priority),
                to_jsonb(NEW.priority),
                'manual',
                NOW()
            );
        END IF;
        
        -- Urgency changes
        IF OLD.urgency IS DISTINCT FROM NEW.urgency THEN
            INSERT INTO application_audit_log (
                application_id,
                table_name,
                operation,
                field_name,
                old_value,
                new_value,
                change_source,
                changed_at
            ) VALUES (
                NEW.id,
                TG_TABLE_NAME,
                'UPDATE',
                'urgency',
                to_jsonb(OLD.urgency),
                to_jsonb(NEW.urgency),
                'manual',
                NOW()
            );
        END IF;
        
        -- Decision factors changes (qualifications, documents, etc.)
        IF OLD.decision_factors IS DISTINCT FROM NEW.decision_factors THEN
            INSERT INTO application_audit_log (
                application_id,
                table_name,
                operation,
                field_name,
                old_value,
                new_value,
                change_source,
                changed_at,
                is_sensitive_field
            ) VALUES (
                NEW.id,
                TG_TABLE_NAME,
                'UPDATE',
                'decision_factors',
                OLD.decision_factors,
                NEW.decision_factors,
                'manual',
                NOW(),
                TRUE  -- Decision factors may contain sensitive data
            );
        END IF;
        
        -- Programme changes
        IF OLD.programme_id IS DISTINCT FROM NEW.programme_id THEN
            INSERT INTO application_audit_log (
                application_id,
                table_name,
                operation,
                field_name,
                old_value,
                new_value,
                change_source,
                changed_at
            ) VALUES (
                NEW.id,
                TG_TABLE_NAME,
                'UPDATE',
                'programme_id',
                to_jsonb(OLD.programme_id),
                to_jsonb(NEW.programme_id),
                'manual',
                NOW()
            );
        END IF;
        
        -- Intake changes
        IF OLD.intake_id IS DISTINCT FROM NEW.intake_id THEN
            INSERT INTO application_audit_log (
                application_id,
                table_name,
                operation,
                field_name,
                old_value,
                new_value,
                change_source,
                changed_at
            ) VALUES (
                NEW.id,
                TG_TABLE_NAME,
                'UPDATE',
                'intake_id',
                to_jsonb(OLD.intake_id),
                to_jsonb(NEW.intake_id),
                'manual',
                NOW()
            );
        END IF;
        
        -- Assignee changes
        IF OLD.assignee_user_id IS DISTINCT FROM NEW.assignee_user_id THEN
            INSERT INTO application_audit_log (
                application_id,
                table_name,
                operation,
                field_name,
                old_value,
                new_value,
                change_source,
                changed_at
            ) VALUES (
                NEW.id,
                TG_TABLE_NAME,
                'UPDATE',
                'assignee_user_id',
                to_jsonb(OLD.assignee_user_id),
                to_jsonb(NEW.assignee_user_id),
                'manual',
                NOW()
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION audit_application_changes() IS 'Trigger function to automatically log all application changes';


-- ============================================================================
-- PART 3: Add Trigger to Applications Table
-- ============================================================================

DROP TRIGGER IF EXISTS audit_applications_trigger ON applications;

CREATE TRIGGER audit_applications_trigger
    AFTER INSERT OR UPDATE OR DELETE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION audit_application_changes();

COMMENT ON TRIGGER audit_applications_trigger ON applications IS 'Automatically logs all changes to applications table';


-- ============================================================================
-- PART 4: Create Audit Log View for Easy Reporting
-- ============================================================================

CREATE OR REPLACE VIEW vw_application_audit_trail AS
SELECT 
    aal.id as audit_id,
    aal.application_id,
    
    -- Application info
    a.stage as current_stage,
    a.status as current_status,
    p.first_name || ' ' || p.last_name as applicant_name,
    p.email as applicant_email,
    pr.name as programme_name,
    
    -- Change info
    aal.operation,
    aal.field_name,
    aal.old_value,
    aal.new_value,
    aal.changed_at,
    
    -- User info
    aal.changed_by_user_id,
    aal.changed_by_user_email,
    aal.changed_by_user_name,
    u.email as user_email,
    u.name as user_full_name,
    
    -- Context
    aal.change_reason,
    aal.change_source,
    aal.is_sensitive_field,
    aal.requires_approval,
    aal.approved_by_user_id,
    aal.approved_at,
    
    -- Approval info
    approver.email as approver_email,
    approver.name as approver_name,
    
    -- Calculated fields
    CASE 
        WHEN aal.field_name = 'stage' THEN 'Stage Change'
        WHEN aal.field_name = 'status' THEN 'Status Change'
        WHEN aal.field_name = 'priority' THEN 'Priority Change'
        WHEN aal.field_name = 'urgency' THEN 'Urgency Change'
        WHEN aal.field_name = 'decision_factors' THEN 'Application Data Change'
        WHEN aal.field_name = 'programme_id' THEN 'Programme Change'
        WHEN aal.field_name = 'intake_id' THEN 'Intake Change'
        WHEN aal.field_name = 'assignee_user_id' THEN 'Assignee Change'
        ELSE 'Other Change'
    END as change_type,
    
    -- Human-readable change description
    CASE 
        WHEN aal.field_name = 'stage' THEN 
            'Stage changed from ' || (aal.old_value->>0) || ' to ' || (aal.new_value->>0)
        WHEN aal.field_name = 'status' THEN 
            'Status changed from ' || (aal.old_value->>0) || ' to ' || (aal.new_value->>0)
        WHEN aal.field_name = 'priority' THEN 
            'Priority changed from ' || (aal.old_value->>0) || ' to ' || (aal.new_value->>0)
        WHEN aal.field_name = 'urgency' THEN 
            'Urgency changed from ' || (aal.old_value->>0) || ' to ' || (aal.new_value->>0)
        WHEN aal.operation = 'INSERT' THEN 'Application created'
        WHEN aal.operation = 'DELETE' THEN 'Application deleted'
        ELSE 'Field ' || aal.field_name || ' updated'
    END as change_description

FROM application_audit_log aal
LEFT JOIN applications a ON a.id = aal.application_id
LEFT JOIN people p ON p.id = a.person_id
LEFT JOIN programmes pr ON pr.id = a.programme_id
LEFT JOIN users u ON u.id = aal.changed_by_user_id
LEFT JOIN users approver ON approver.id = aal.approved_by_user_id
ORDER BY aal.changed_at DESC;

COMMENT ON VIEW vw_application_audit_trail IS 'Human-readable view of application audit trail with user and application context';


-- ============================================================================
-- PART 5: Create Helper Function for Manual Audit Logging
-- ============================================================================

CREATE OR REPLACE FUNCTION log_application_change(
    p_application_id UUID,
    p_field_name TEXT,
    p_old_value JSONB,
    p_new_value JSONB,
    p_changed_by_user_id UUID,
    p_change_reason TEXT DEFAULT NULL,
    p_change_source TEXT DEFAULT 'manual'
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO application_audit_log (
        application_id,
        field_name,
        old_value,
        new_value,
        operation,
        changed_by_user_id,
        change_reason,
        change_source,
        changed_at
    ) VALUES (
        p_application_id,
        p_field_name,
        p_old_value,
        p_new_value,
        'UPDATE',
        p_changed_by_user_id,
        p_change_reason,
        p_change_source,
        NOW()
    )
    RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_application_change IS 'Helper function for manually logging application changes from API';


-- ============================================================================
-- PART 6: Create Audit Summary Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_application_audit_summary(p_application_id UUID)
RETURNS TABLE (
    total_changes BIGINT,
    last_changed_at TIMESTAMPTZ,
    last_changed_by TEXT,
    stage_changes BIGINT,
    status_changes BIGINT,
    data_changes BIGINT,
    unique_editors BIGINT,
    sensitive_changes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_changes,
        MAX(changed_at) as last_changed_at,
        (SELECT changed_by_user_name FROM application_audit_log 
         WHERE application_id = p_application_id 
         ORDER BY changed_at DESC LIMIT 1) as last_changed_by,
        COUNT(*) FILTER (WHERE field_name = 'stage') as stage_changes,
        COUNT(*) FILTER (WHERE field_name = 'status') as status_changes,
        COUNT(*) FILTER (WHERE field_name = 'decision_factors') as data_changes,
        COUNT(DISTINCT changed_by_user_id) as unique_editors,
        COUNT(*) FILTER (WHERE is_sensitive_field = TRUE) as sensitive_changes
    FROM application_audit_log
    WHERE application_id = p_application_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_application_audit_summary IS 'Get summary statistics for an application audit trail';


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table creation
SELECT 
    'Audit Log Table' as check_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'application_audit_log';

-- Verify indexes
SELECT 
    'Audit Log Indexes' as check_name,
    COUNT(*) as index_count
FROM pg_indexes
WHERE tablename = 'application_audit_log';

-- Verify trigger
SELECT 
    'Audit Trigger' as check_name,
    COUNT(*) as trigger_count
FROM pg_trigger
WHERE tgname = 'audit_applications_trigger';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 0032 completed successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ application_audit_log table created';
    RAISE NOTICE '✅ Audit trigger function created';
    RAISE NOTICE '✅ Trigger attached to applications table';
    RAISE NOTICE '✅ Indexes created for efficient querying';
    RAISE NOTICE '✅ Audit trail view created';
    RAISE NOTICE '✅ Helper functions created';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 All application changes will now be logged';
    RAISE NOTICE '🔒 Immutable audit trail for compliance';
    RAISE NOTICE '========================================';
END $$;
