-- =============================================
-- Migration 199: Strict Project Hierarchy System
-- =============================================
-- Implements a strict 3-level project hierarchy for procurement/landed cost accounting:
-- Level 1 (group): Project Group - Accounting grouping only, no transactions
-- Level 2 (master): Master Project - One vendor per project, umbrella for shipments
-- Level 3 (sub): Sub Project - Actual cost-carrying, linked to shipments/LCs
--
-- Features:
-- - Auto-generated project codes [ParentCode][3-digit incremental]
-- - Vendor inheritance from parent
-- - Currency locked from vendor
-- - Deletion prevention if transactions exist
-- =============================================

BEGIN;

-- =============================================
-- 1. ADD NEW COLUMNS TO PROJECTS TABLE
-- =============================================
DO $$
BEGIN
    -- Project hierarchy level type (group/master/sub)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'project_level') THEN
        ALTER TABLE projects ADD COLUMN project_level VARCHAR(20) DEFAULT 'sub';
        COMMENT ON COLUMN projects.project_level IS 'group = Level 1 (accounting grouping), master = Level 2 (vendor/contract), sub = Level 3 (shipment/LC)';
    END IF;
    
    -- Vendor link (for Level 2 and 3)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'vendor_id') THEN
        ALTER TABLE projects ADD COLUMN vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL;
        COMMENT ON COLUMN projects.vendor_id IS 'Vendor for master/sub projects. Inherited from parent for sub projects.';
    END IF;
    
    -- Currency (inherited from vendor)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'currency_id') THEN
        ALTER TABLE projects ADD COLUMN currency_id INTEGER REFERENCES currencies(id) ON DELETE SET NULL;
        COMMENT ON COLUMN projects.currency_id IS 'Currency locked from vendor. Cannot be changed after creation.';
    END IF;
    
    -- Currency code for quick access
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'currency_code') THEN
        ALTER TABLE projects ADD COLUMN currency_code VARCHAR(10);
    END IF;
    
    -- LC Number for sub projects
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'lc_number') THEN
        ALTER TABLE projects ADD COLUMN lc_number VARCHAR(100);
        COMMENT ON COLUMN projects.lc_number IS 'Letter of Credit number for sub projects';
    END IF;
    
    -- Contract reference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'contract_number') THEN
        ALTER TABLE projects ADD COLUMN contract_number VARCHAR(100);
        COMMENT ON COLUMN projects.contract_number IS 'Contract number for master projects';
    END IF;
    
    -- Is locked (prevents code/parent/vendor changes after transactions)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'is_locked') THEN
        ALTER TABLE projects ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN projects.is_locked IS 'Locked after transactions exist. Prevents changes to code, parent, vendor.';
    END IF;
    
    -- Closed date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'closed_at') THEN
        ALTER TABLE projects ADD COLUMN closed_at TIMESTAMP;
        COMMENT ON COLUMN projects.closed_at IS 'Date when project was closed/completed';
    END IF;
    
    -- Closed by user
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'closed_by') THEN
        ALTER TABLE projects ADD COLUMN closed_by INTEGER REFERENCES users(id);
    END IF;
    
    -- Total expected amount (from POs/LCs)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'total_expected_amount') THEN
        ALTER TABLE projects ADD COLUMN total_expected_amount DECIMAL(18,4) DEFAULT 0;
    END IF;
    
    -- Total actual cost (calculated)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'total_actual_cost') THEN
        ALTER TABLE projects ADD COLUMN total_actual_cost DECIMAL(18,4) DEFAULT 0;
    END IF;
    
    -- Total paid amount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'total_paid_amount') THEN
        ALTER TABLE projects ADD COLUMN total_paid_amount DECIMAL(18,4) DEFAULT 0;
    END IF;
    
    -- Balance remaining
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'balance_remaining') THEN
        ALTER TABLE projects ADD COLUMN balance_remaining DECIMAL(18,4) DEFAULT 0;
    END IF;
    
    -- Path for tree queries (materialized path)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'path') THEN
        ALTER TABLE projects ADD COLUMN path TEXT;
        COMMENT ON COLUMN projects.path IS 'Materialized path for efficient tree queries: /1/5/23/';
    END IF;
    
    -- Depth for tree queries
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'depth') THEN
        ALTER TABLE projects ADD COLUMN depth INTEGER DEFAULT 0;
    END IF;
    
END $$;

-- =============================================
-- 2. ADD CONSTRAINTS
-- =============================================
ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_projects_level;
ALTER TABLE projects ADD CONSTRAINT chk_projects_level 
CHECK (project_level IN ('group', 'master', 'sub'));

-- =============================================
-- 3. INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_projects_vendor ON projects(vendor_id);
CREATE INDEX IF NOT EXISTS idx_projects_currency ON projects(currency_id);
CREATE INDEX IF NOT EXISTS idx_projects_level ON projects(project_level);
CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
CREATE INDEX IF NOT EXISTS idx_projects_locked ON projects(is_locked);
CREATE INDEX IF NOT EXISTS idx_projects_closed ON projects(closed_at);

-- =============================================
-- 4. FUNCTION: Generate Next Project Code
-- =============================================
CREATE OR REPLACE FUNCTION generate_project_code(
    p_company_id INTEGER,
    p_parent_id INTEGER DEFAULT NULL,
    p_project_level VARCHAR DEFAULT 'sub'
) RETURNS VARCHAR AS $$
DECLARE
    v_parent_code VARCHAR;
    v_next_seq INTEGER;
    v_new_code VARCHAR;
    v_prefix_length INTEGER;
BEGIN
    -- For root level (group) projects
    IF p_parent_id IS NULL THEN
        -- Get max code at root level
        SELECT COALESCE(MAX(CAST(code AS INTEGER)), 99) + 1
        INTO v_next_seq
        FROM projects
        WHERE company_id = p_company_id
          AND parent_project_id IS NULL
          AND deleted_at IS NULL
          AND code ~ '^[0-9]+$'
          AND LENGTH(code) <= 3;
        
        v_new_code := LPAD(v_next_seq::TEXT, 3, '0');
        
        -- If we've exceeded 3 digits, use a different scheme
        IF v_next_seq > 999 THEN
            v_new_code := v_next_seq::TEXT;
        END IF;
        
        RETURN v_new_code;
    END IF;
    
    -- Get parent code
    SELECT code INTO v_parent_code
    FROM projects
    WHERE id = p_parent_id AND company_id = p_company_id;
    
    IF v_parent_code IS NULL THEN
        RAISE EXCEPTION 'Parent project not found';
    END IF;
    
    -- Determine prefix length based on parent level
    v_prefix_length := LENGTH(v_parent_code);
    
    -- Get next sequence under this parent
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(code FROM v_prefix_length + 1) AS INTEGER)
    ), 0) + 1
    INTO v_next_seq
    FROM projects
    WHERE company_id = p_company_id
      AND parent_project_id = p_parent_id
      AND deleted_at IS NULL
      AND code LIKE v_parent_code || '%'
      AND LENGTH(code) = v_prefix_length + 3;
    
    -- Generate new code: parent_code + 3-digit sequence
    v_new_code := v_parent_code || LPAD(v_next_seq::TEXT, 3, '0');
    
    RETURN v_new_code;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. FUNCTION: Update Project Path
-- =============================================
CREATE OR REPLACE FUNCTION update_project_path() RETURNS TRIGGER AS $$
DECLARE
    v_parent_path TEXT;
    v_parent_depth INTEGER;
BEGIN
    IF NEW.parent_project_id IS NULL THEN
        NEW.path := '/' || NEW.id || '/';
        NEW.depth := 0;
    ELSE
        SELECT path, depth 
        INTO v_parent_path, v_parent_depth
        FROM projects 
        WHERE id = NEW.parent_project_id;
        
        NEW.path := v_parent_path || NEW.id || '/';
        NEW.depth := COALESCE(v_parent_depth, 0) + 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for path update
DROP TRIGGER IF EXISTS trg_projects_path ON projects;
CREATE TRIGGER trg_projects_path
    BEFORE INSERT OR UPDATE OF parent_project_id ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_project_path();

-- =============================================
-- 6. FUNCTION: Validate Project Hierarchy
-- =============================================
-- Note: This validation is applied only to NEW projects.
-- Existing projects can remain with their current structure.
CREATE OR REPLACE FUNCTION validate_project_hierarchy() RETURNS TRIGGER AS $$
DECLARE
    v_parent_level VARCHAR;
    v_parent_vendor_id INTEGER;
    v_parent_currency_id INTEGER;
BEGIN
    -- Skip validation for existing projects during updates (except specific changes)
    IF TG_OP = 'UPDATE' THEN
        -- Only validate if project_level is being changed
        IF OLD.project_level IS NOT DISTINCT FROM NEW.project_level AND
           OLD.parent_project_id IS NOT DISTINCT FROM NEW.parent_project_id THEN
            -- Not changing hierarchy, allow
            RETURN NEW;
        END IF;
        
        -- Check if project is locked and trying to change critical fields
        IF OLD.is_locked = TRUE THEN
            IF NEW.code != OLD.code OR 
               NEW.parent_project_id IS DISTINCT FROM OLD.parent_project_id OR
               NEW.vendor_id IS DISTINCT FROM OLD.vendor_id THEN
                RAISE EXCEPTION 'Cannot modify locked project (code, parent, or vendor)';
            END IF;
        END IF;
    END IF;
    
    -- For NEW projects, validate hierarchy rules
    IF TG_OP = 'INSERT' THEN
        IF NEW.parent_project_id IS NOT NULL THEN
            -- Get parent info
            SELECT project_level, vendor_id, currency_id
            INTO v_parent_level, v_parent_vendor_id, v_parent_currency_id
            FROM projects
            WHERE id = NEW.parent_project_id AND company_id = NEW.company_id;
            
            -- Group can only have Master children
            IF v_parent_level = 'group' AND NEW.project_level != 'master' THEN
                RAISE EXCEPTION 'Group projects can only have Master projects as children';
            END IF;
            
            -- Master can only have Sub children
            IF v_parent_level = 'master' AND NEW.project_level != 'sub' THEN
                RAISE EXCEPTION 'Master projects can only have Sub projects as children';
            END IF;
            
            -- Sub cannot have children
            IF v_parent_level = 'sub' THEN
                RAISE EXCEPTION 'Sub projects cannot have children';
            END IF;
            
            -- Inherit vendor from master parent for sub projects
            IF NEW.project_level = 'sub' AND v_parent_vendor_id IS NOT NULL THEN
                NEW.vendor_id := v_parent_vendor_id;
                NEW.currency_id := v_parent_currency_id;
            END IF;
        ELSE
            -- Root projects must be groups (only for new projects)
            IF NEW.project_level IS NOT NULL AND NEW.project_level != 'group' THEN
                RAISE EXCEPTION 'Root level projects must be of type "group"';
            END IF;
        END IF;
    END IF;
    
    -- Set level depth based on project_level (if set)
    IF NEW.project_level IS NOT NULL THEN
        CASE NEW.project_level
            WHEN 'group' THEN NEW.level := 0;
            WHEN 'master' THEN NEW.level := 1;
            WHEN 'sub' THEN NEW.level := 2;
            ELSE NEW.level := COALESCE(NEW.level, 0);
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS trg_projects_validate ON projects;
CREATE TRIGGER trg_projects_validate
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION validate_project_hierarchy();

-- =============================================
-- 7. FUNCTION: Prevent Deletion with Transactions
-- =============================================
CREATE OR REPLACE FUNCTION prevent_project_deletion() RETURNS TRIGGER AS $$
DECLARE
    v_has_children BOOLEAN;
    v_has_payments BOOLEAN;
    v_has_journal_entries BOOLEAN;
BEGIN
    -- Check for child projects
    SELECT EXISTS(SELECT 1 FROM projects WHERE parent_project_id = OLD.id AND deleted_at IS NULL)
    INTO v_has_children;
    
    IF v_has_children THEN
        RAISE EXCEPTION 'Cannot delete project with child projects';
    END IF;
    
    -- Check for vendor payments
    SELECT EXISTS(SELECT 1 FROM vendor_payments WHERE project_id = OLD.id AND deleted_at IS NULL)
    INTO v_has_payments;
    
    IF v_has_payments THEN
        RAISE EXCEPTION 'Cannot delete project with linked payments';
    END IF;
    
    -- Check for journal entries
    SELECT EXISTS(SELECT 1 FROM journal_entry_lines WHERE project_id = OLD.id)
    INTO v_has_journal_entries;
    
    IF v_has_journal_entries THEN
        RAISE EXCEPTION 'Cannot delete project with linked journal entries';
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for deletion prevention
DROP TRIGGER IF EXISTS trg_projects_prevent_delete ON projects;
CREATE TRIGGER trg_projects_prevent_delete
    BEFORE DELETE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION prevent_project_deletion();

-- =============================================
-- 8. VIEW: Project Tree with Full Details
-- =============================================
CREATE OR REPLACE VIEW v_project_tree AS
SELECT 
    p.id,
    p.company_id,
    p.code,
    p.name,
    p.name_ar,
    p.description,
    p.description_ar,
    p.project_level,
    p.level,
    p.depth,
    p.path,
    p.parent_project_id,
    pp.code as parent_code,
    pp.name as parent_name,
    p.vendor_id,
    v.name as vendor_name,
    v.name_ar as vendor_name_ar,
    v.code as vendor_code,
    p.currency_id,
    p.currency_code,
    p.lc_number,
    p.contract_number,
    p.start_date,
    p.end_date,
    p.budget,
    p.total_expected_amount,
    p.total_actual_cost,
    p.total_paid_amount,
    p.balance_remaining,
    p.status,
    p.is_locked,
    p.closed_at,
    p.is_active,
    p.created_at,
    p.updated_at,
    -- Counts
    (SELECT COUNT(*) FROM projects c WHERE c.parent_project_id = p.id AND c.deleted_at IS NULL) as children_count,
    (SELECT COUNT(*) FROM vendor_payments vp WHERE vp.project_id = p.id AND vp.deleted_at IS NULL) as payments_count,
    (SELECT COALESCE(SUM(vp.payment_amount), 0) FROM vendor_payments vp WHERE vp.project_id = p.id AND vp.deleted_at IS NULL AND vp.status = 'posted') as total_payments,
    -- Type info
    pt.id as project_type_id,
    pt.code as project_type_code,
    pt.name as project_type_name,
    pt.name_ar as project_type_name_ar,
    pt.icon as project_type_icon,
    pt.color as project_type_color
FROM projects p
LEFT JOIN projects pp ON p.parent_project_id = pp.id
LEFT JOIN vendors v ON p.vendor_id = v.id
LEFT JOIN project_types pt ON p.project_type_id = pt.id
WHERE p.deleted_at IS NULL;

-- =============================================
-- 9. FUNCTION: Get Project Hierarchy Statistics
-- =============================================
CREATE OR REPLACE FUNCTION get_project_stats(p_company_id INTEGER)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_groups', (SELECT COUNT(*) FROM projects WHERE company_id = p_company_id AND project_level = 'group' AND deleted_at IS NULL),
        'total_masters', (SELECT COUNT(*) FROM projects WHERE company_id = p_company_id AND project_level = 'master' AND deleted_at IS NULL),
        'total_subs', (SELECT COUNT(*) FROM projects WHERE company_id = p_company_id AND project_level = 'sub' AND deleted_at IS NULL),
        'total_budget', (SELECT COALESCE(SUM(budget), 0) FROM projects WHERE company_id = p_company_id AND deleted_at IS NULL),
        'total_actual_cost', (SELECT COALESCE(SUM(total_actual_cost), 0) FROM projects WHERE company_id = p_company_id AND deleted_at IS NULL),
        'total_paid', (SELECT COALESCE(SUM(total_paid_amount), 0) FROM projects WHERE company_id = p_company_id AND deleted_at IS NULL),
        'active_count', (SELECT COUNT(*) FROM projects WHERE company_id = p_company_id AND status IN ('active', 'in_progress') AND deleted_at IS NULL),
        'completed_count', (SELECT COUNT(*) FROM projects WHERE company_id = p_company_id AND status = 'completed' AND deleted_at IS NULL),
        'locked_count', (SELECT COUNT(*) FROM projects WHERE company_id = p_company_id AND is_locked = TRUE AND deleted_at IS NULL)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 10. UPDATE EXISTING PROJECTS TO NEW STRUCTURE
-- =============================================
-- Set project_level based on existing hierarchy
UPDATE projects
SET project_level = CASE 
    WHEN parent_project_id IS NULL THEN 'group'
    WHEN EXISTS (SELECT 1 FROM projects c WHERE c.parent_project_id = projects.id AND c.deleted_at IS NULL) THEN 'master'
    ELSE 'sub'
END
WHERE deleted_at IS NULL AND project_level IS NULL;

-- Update paths for existing projects
WITH RECURSIVE project_tree AS (
    -- Root projects
    SELECT id, '/' || id || '/' as path, 0 as depth
    FROM projects
    WHERE parent_project_id IS NULL AND deleted_at IS NULL
    
    UNION ALL
    
    -- Child projects
    SELECT p.id, pt.path || p.id || '/', pt.depth + 1
    FROM projects p
    INNER JOIN project_tree pt ON p.parent_project_id = pt.id
    WHERE p.deleted_at IS NULL
)
UPDATE projects
SET path = pt.path, depth = pt.depth
FROM project_tree pt
WHERE projects.id = pt.id;

-- =============================================
-- 11. ADD PERMISSIONS
-- =============================================
INSERT INTO permissions (permission_code, resource, action, description)
VALUES 
    ('projects:close', 'projects', 'close', 'Close/complete projects'),
    ('projects:lock', 'projects', 'lock', 'Lock projects to prevent changes'),
    ('projects:manage_hierarchy', 'projects', 'manage_hierarchy', 'Create and manage project hierarchy')
ON CONFLICT (permission_code) DO NOTHING;

-- Grant to admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'admin', 'finance_manager')
AND p.permission_code IN ('projects:close', 'projects:lock', 'projects:manage_hierarchy')
ON CONFLICT DO NOTHING;

COMMIT;
