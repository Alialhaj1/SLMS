-- Migration: Enhanced Audit Trail for Items Module
-- Purpose: Advanced audit logging with before/after snapshots for compliance and forensics
-- Phase: Phase 3 Enhancement (Audit Trail & Compliance)
-- Date: 2026-01-31

-- ============================================
-- 1. Enhanced Audit Table with Before/After
-- ============================================

CREATE TABLE IF NOT EXISTS item_audit_trail (
    id SERIAL PRIMARY KEY,
    
    -- Target Item
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    item_code VARCHAR(50) NOT NULL, -- Denormalized for historical reference
    
    -- Action Details
    action_type VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOCK, ARCHIVE, etc.
    table_name VARCHAR(100) NOT NULL, -- items, item_groups, item_warehouses, etc.
    
    -- Before/After Snapshots (JSONB for flexibility)
    before_snapshot JSONB, -- State before change (NULL for CREATE)
    after_snapshot JSONB, -- State after change (NULL for DELETE)
    changed_fields TEXT[], -- Array of field names that changed
    
    -- Movement Lock Context
    had_movement_before BOOLEAN DEFAULT false,
    has_movement_after BOOLEAN DEFAULT false,
    movement_count INTEGER DEFAULT 0, -- Snapshot of movement count
    
    -- User & Session Context
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    reason TEXT -- Optional reason for manual audit entries
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_item_audit_item_id ON item_audit_trail (item_id);
CREATE INDEX IF NOT EXISTS idx_item_audit_action ON item_audit_trail (action_type);
CREATE INDEX IF NOT EXISTS idx_item_audit_created_at ON item_audit_trail (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_audit_user_id ON item_audit_trail (user_id);

COMMENT ON TABLE item_audit_trail IS 'Enhanced audit trail for items module with before/after snapshots';
COMMENT ON COLUMN item_audit_trail.before_snapshot IS 'Full JSONB snapshot of state before change';
COMMENT ON COLUMN item_audit_trail.after_snapshot IS 'Full JSONB snapshot of state after change';
COMMENT ON COLUMN item_audit_trail.changed_fields IS 'Array of field names for quick filtering (e.g., {base_uom_id, tracking_policy})';
COMMENT ON COLUMN item_audit_trail.had_movement_before IS 'Movement lock state before change (for policy violation detection)';

-- ============================================
-- 2. Audit Triggers for Auto-Capture
-- ============================================

-- Function to capture audit trail on item changes
CREATE OR REPLACE FUNCTION item_audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    v_action_type VARCHAR(50);
    v_changed_fields TEXT[];
    v_has_movement BOOLEAN;
    v_movement_count INTEGER;
BEGIN
    -- Determine action type
    IF (TG_OP = 'INSERT') THEN
        v_action_type := 'CREATE';
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action_type := 'UPDATE';
    ELSIF (TG_OP = 'DELETE') THEN
        v_action_type := 'DELETE';
    END IF;
    
    -- Check movement status
    SELECT 
        item_has_movement(COALESCE(NEW.id, OLD.id)),
        COUNT(*)
    INTO v_has_movement, v_movement_count
    FROM inventory_movements
    WHERE item_id = COALESCE(NEW.id, OLD.id);
    
    -- Detect changed fields (UPDATE only)
    IF (TG_OP = 'UPDATE') THEN
        v_changed_fields := ARRAY[]::TEXT[];
        
        IF OLD.code IS DISTINCT FROM NEW.code THEN
            v_changed_fields := array_append(v_changed_fields, 'code');
        END IF;
        IF OLD.name IS DISTINCT FROM NEW.name THEN
            v_changed_fields := array_append(v_changed_fields, 'name');
        END IF;
        IF OLD.base_uom_id IS DISTINCT FROM NEW.base_uom_id THEN
            v_changed_fields := array_append(v_changed_fields, 'base_uom_id');
        END IF;
        IF OLD.tracking_policy IS DISTINCT FROM NEW.tracking_policy THEN
            v_changed_fields := array_append(v_changed_fields, 'tracking_policy');
        END IF;
        IF OLD.valuation_method IS DISTINCT FROM NEW.valuation_method THEN
            v_changed_fields := array_append(v_changed_fields, 'valuation_method');
        END IF;
        IF OLD.is_composite IS DISTINCT FROM NEW.is_composite THEN
            v_changed_fields := array_append(v_changed_fields, 'is_composite');
        END IF;
        IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
            v_changed_fields := array_append(v_changed_fields, 'is_active');
        END IF;
    END IF;
    
    -- Insert audit record
    INSERT INTO item_audit_trail (
        item_id,
        item_code,
        action_type,
        table_name,
        before_snapshot,
        after_snapshot,
        changed_fields,
        had_movement_before,
        has_movement_after,
        movement_count,
        user_id,
        user_email
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.code, OLD.code),
        v_action_type,
        TG_TABLE_NAME,
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        v_changed_fields,
        v_has_movement,
        v_has_movement,
        v_movement_count,
        current_setting('app.current_user_id', true)::INTEGER,
        current_setting('app.current_user_email', true)
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to items table
DROP TRIGGER IF EXISTS item_audit_trigger ON items;
CREATE TRIGGER item_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON items
    FOR EACH ROW EXECUTE FUNCTION item_audit_trigger_func();

-- ============================================
-- 3. Audit View for Query Convenience
-- ============================================

CREATE OR REPLACE VIEW v_item_audit_trail AS
SELECT 
    a.id,
    a.item_id,
    a.item_code,
    i.name AS current_item_name,
    a.action_type,
    a.table_name,
    
    -- Extract key fields from snapshots
    a.before_snapshot->>'name' AS before_name,
    a.after_snapshot->>'name' AS after_name,
    a.before_snapshot->>'base_uom_id' AS before_uom,
    a.after_snapshot->>'base_uom_id' AS after_uom,
    a.before_snapshot->>'tracking_policy' AS before_tracking,
    a.after_snapshot->>'tracking_policy' AS after_tracking,
    a.before_snapshot->>'valuation_method' AS before_valuation,
    a.after_snapshot->>'valuation_method' AS after_valuation,
    
    a.changed_fields,
    a.had_movement_before,
    a.has_movement_after,
    a.movement_count,
    
    a.user_id,
    a.user_email,
    u.full_name AS user_name,
    a.ip_address,
    a.created_at,
    a.reason
FROM item_audit_trail a
LEFT JOIN items i ON a.item_id = i.id
LEFT JOIN users u ON a.user_id = u.id
ORDER BY a.created_at DESC;

COMMENT ON VIEW v_item_audit_trail IS 'User-friendly audit trail view with extracted snapshot fields';

-- ============================================
-- 4. Policy Violation Detection Query
-- ============================================

-- Function to detect unauthorized policy changes
CREATE OR REPLACE FUNCTION detect_policy_violations(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    violation_id INTEGER,
    item_code VARCHAR,
    item_name TEXT,
    action_type VARCHAR,
    changed_fields TEXT[],
    had_movement BOOLEAN,
    user_email VARCHAR,
    created_at TIMESTAMP,
    severity VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id AS violation_id,
        a.item_code,
        i.item_name,
        a.action_type,
        a.changed_fields,
        a.had_movement_before AS had_movement,
        a.user_email,
        a.created_at,
        CASE 
            WHEN 'base_uom_id' = ANY(a.changed_fields) AND a.had_movement_before THEN 'CRITICAL'
            WHEN 'tracking_policy' = ANY(a.changed_fields) AND a.had_movement_before THEN 'CRITICAL'
            WHEN 'valuation_method' = ANY(a.changed_fields) AND a.had_movement_before THEN 'CRITICAL'
            WHEN 'is_composite' = ANY(a.changed_fields) AND a.had_movement_before THEN 'HIGH'
            ELSE 'LOW'
        END AS severity
    FROM item_audit_trail a
    LEFT JOIN items i ON a.item_id = i.id
    WHERE 
        a.created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days
        AND a.action_type IN ('UPDATE', 'DELETE')
        AND a.had_movement_before = true
        AND (
            'base_uom_id' = ANY(a.changed_fields)
            OR 'tracking_policy' = ANY(a.changed_fields)
            OR 'valuation_method' = ANY(a.changed_fields)
            OR 'is_composite' = ANY(a.changed_fields)
        )
    ORDER BY 
        CASE 
            WHEN 'base_uom_id' = ANY(a.changed_fields) THEN 1
            WHEN 'tracking_policy' = ANY(a.changed_fields) THEN 2
            WHEN 'valuation_method' = ANY(a.changed_fields) THEN 3
            ELSE 4
        END,
        a.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_policy_violations IS 'Detects unauthorized changes to locked policy fields (for compliance audits)';

-- ============================================
-- 5. Audit Retention Policy (Optional)
-- ============================================

-- Function to archive old audit records (>2 years) to separate table
CREATE TABLE IF NOT EXISTS item_audit_trail_archive (
    LIKE item_audit_trail INCLUDING ALL
);

CREATE OR REPLACE FUNCTION archive_old_audit_records()
RETURNS INTEGER AS $$
DECLARE
    v_archived_count INTEGER;
BEGIN
    -- Move records older than 2 years to archive
    WITH archived AS (
        DELETE FROM item_audit_trail
        WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '2 years'
        RETURNING *
    )
    INSERT INTO item_audit_trail_archive
    SELECT * FROM archived;
    
    GET DIAGNOSTICS v_archived_count = ROW_COUNT;
    
    RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive_old_audit_records IS 'Archives audit records older than 2 years (run monthly via cron)';

-- ============================================
-- 6. Sample Usage Queries (Documentation)
-- ============================================

-- Query 1: Get full audit history for an item
-- SELECT * FROM v_item_audit_trail WHERE item_id = 1 ORDER BY created_at DESC;

-- Query 2: Detect policy violations in last 30 days
-- SELECT * FROM detect_policy_violations(30);

-- Query 3: Find who changed locked fields
-- SELECT item_code, user_email, changed_fields, created_at
-- FROM item_audit_trail
-- WHERE 'base_uom_id' = ANY(changed_fields) AND had_movement_before = true;

-- Query 4: Compare before/after for specific change
-- SELECT 
--     item_code,
--     before_snapshot->>'tracking_policy' AS before,
--     after_snapshot->>'tracking_policy' AS after,
--     user_email,
--     created_at
-- FROM item_audit_trail
-- WHERE id = 123;

-- Query 5: Archive old records (run monthly)
-- SELECT archive_old_audit_records();

-- ============================================
-- 7. Indexes for Performance
-- ============================================

CREATE INDEX idx_item_audit_changed_fields ON item_audit_trail USING GIN (changed_fields);
CREATE INDEX idx_item_audit_snapshots ON item_audit_trail USING GIN (before_snapshot, after_snapshot);
CREATE INDEX idx_item_audit_movement_lock ON item_audit_trail (had_movement_before) WHERE had_movement_before = true;

-- ============================================
-- Migration Complete
-- ============================================

-- Verify objects created
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM pg_tables WHERE tablename IN ('item_audit_trail', 'item_audit_trail_archive');
    IF v_count < 2 THEN
        RAISE EXCEPTION 'Migration failed: Audit tables not created';
    END IF;
    
    RAISE NOTICE 'Migration 190 completed successfully: Enhanced audit trail with before/after snapshots';
END $$;
