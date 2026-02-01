-- =============================================
-- Migration 123: Enhanced Project Management
-- =============================================
-- Adds hierarchical project support, project types, items/tasks,
-- cost tracking, and integration with other modules.
-- =============================================

BEGIN;

-- =============================================
-- PROJECT TYPES (Reference Data)
-- =============================================
CREATE TABLE IF NOT EXISTS project_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,  -- NULL = global
    code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    icon VARCHAR(50),           -- Icon name for UI
    color VARCHAR(20),          -- Color code for UI
    is_system BOOLEAN DEFAULT FALSE,  -- System types cannot be deleted
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint per company (or global if company_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_types_company_code 
ON project_types(COALESCE(company_id, 0), code);

-- =============================================
-- ENHANCE PROJECTS TABLE
-- =============================================
-- Add new columns to existing projects table
DO $$
BEGIN
    -- Hierarchy
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'parent_project_id') THEN
        ALTER TABLE projects ADD COLUMN parent_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'level') THEN
        ALTER TABLE projects ADD COLUMN level INTEGER DEFAULT 0;
    END IF;
    
    -- Classification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'project_type_id') THEN
        ALTER TABLE projects ADD COLUMN project_type_id INTEGER REFERENCES project_types(id) ON DELETE SET NULL;
    END IF;
    
    -- Description
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'description') THEN
        ALTER TABLE projects ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'description_ar') THEN
        ALTER TABLE projects ADD COLUMN description_ar TEXT;
    END IF;
    
    -- Manager
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'manager_id') THEN
        ALTER TABLE projects ADD COLUMN manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    -- Priority
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'priority') THEN
        ALTER TABLE projects ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
    END IF;
    
    -- Actual dates
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'actual_start_date') THEN
        ALTER TABLE projects ADD COLUMN actual_start_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'actual_end_date') THEN
        ALTER TABLE projects ADD COLUMN actual_end_date DATE;
    END IF;
    
    -- Budget breakdown
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'budget_materials') THEN
        ALTER TABLE projects ADD COLUMN budget_materials DECIMAL(18,4) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'budget_labor') THEN
        ALTER TABLE projects ADD COLUMN budget_labor DECIMAL(18,4) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'budget_services') THEN
        ALTER TABLE projects ADD COLUMN budget_services DECIMAL(18,4) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'budget_miscellaneous') THEN
        ALTER TABLE projects ADD COLUMN budget_miscellaneous DECIMAL(18,4) DEFAULT 0;
    END IF;
    
    -- Progress
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'progress_percent') THEN
        ALTER TABLE projects ADD COLUMN progress_percent INTEGER DEFAULT 0;
    END IF;
    
END $$;

-- Add constraints
ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_projects_priority;
ALTER TABLE projects ADD CONSTRAINT chk_projects_priority 
CHECK (priority IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_projects_status;
ALTER TABLE projects ADD CONSTRAINT chk_projects_status 
CHECK (status IN ('planned', 'in_progress', 'on_hold', 'completed', 'cancelled', 'active', 'draft'));

ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_projects_progress;
ALTER TABLE projects ADD CONSTRAINT chk_projects_progress 
CHECK (progress_percent >= 0 AND progress_percent <= 100);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_parent ON projects(parent_project_id);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_manager ON projects(manager_id);

-- =============================================
-- PROJECT ITEMS / TASKS
-- =============================================
CREATE TABLE IF NOT EXISTS project_items (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_item_id INTEGER REFERENCES project_items(id) ON DELETE SET NULL,
    
    code VARCHAR(30) NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    description TEXT,
    description_ar TEXT,
    
    item_type VARCHAR(20) NOT NULL DEFAULT 'task',  -- task, milestone, deliverable, phase
    
    -- Assignment
    assigned_to_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    vendor_id INTEGER,  -- Will reference vendors table
    
    -- Dates
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    duration_days INTEGER,
    
    -- Costs
    estimated_cost DECIMAL(18,4) DEFAULT 0,
    actual_cost DECIMAL(18,4) DEFAULT 0,
    estimated_hours DECIMAL(10,2) DEFAULT 0,
    actual_hours DECIMAL(10,2) DEFAULT 0,
    
    -- Progress
    progress_percent INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, in_progress, completed, cancelled
    priority VARCHAR(20) DEFAULT 'medium',
    
    -- Hierarchy
    sort_order INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    deleted_by INTEGER REFERENCES users(id),
    
    CONSTRAINT chk_project_items_type CHECK (item_type IN ('task', 'milestone', 'deliverable', 'phase')),
    CONSTRAINT chk_project_items_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT chk_project_items_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT chk_project_items_progress CHECK (progress_percent >= 0 AND progress_percent <= 100)
);

CREATE INDEX IF NOT EXISTS idx_project_items_project ON project_items(project_id);
CREATE INDEX IF NOT EXISTS idx_project_items_parent ON project_items(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_project_items_assigned ON project_items(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_project_items_status ON project_items(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_items_code ON project_items(company_id, project_id, code) WHERE deleted_at IS NULL;

-- =============================================
-- PROJECT COSTS
-- =============================================
CREATE TABLE IF NOT EXISTS project_costs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_item_id INTEGER REFERENCES project_items(id) ON DELETE SET NULL,
    
    category VARCHAR(30) NOT NULL,  -- materials, labor, services, equipment, transportation, miscellaneous
    description VARCHAR(500) NOT NULL,
    description_ar VARCHAR(500),
    
    -- Amounts
    budgeted_amount DECIMAL(18,4) DEFAULT 0,
    actual_amount DECIMAL(18,4) DEFAULT 0,
    
    -- Source reference
    source_type VARCHAR(30),  -- invoice, expense, payment, manual
    source_id INTEGER,
    source_reference VARCHAR(50),
    
    -- Date
    cost_date DATE NOT NULL,
    
    -- Metadata
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT chk_project_costs_category CHECK (category IN ('materials', 'labor', 'services', 'equipment', 'transportation', 'miscellaneous'))
);

CREATE INDEX IF NOT EXISTS idx_project_costs_project ON project_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_costs_item ON project_costs(project_item_id);
CREATE INDEX IF NOT EXISTS idx_project_costs_category ON project_costs(category);
CREATE INDEX IF NOT EXISTS idx_project_costs_source ON project_costs(source_type, source_id);

-- =============================================
-- PROJECT LINKS (Shipments, Invoices, etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS project_links (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_item_id INTEGER REFERENCES project_items(id) ON DELETE SET NULL,
    
    link_type VARCHAR(30) NOT NULL,  -- shipment, purchase_invoice, sales_invoice, expense, payment
    linked_id INTEGER NOT NULL,
    linked_reference VARCHAR(50),
    linked_date DATE,
    linked_amount DECIMAL(18,4) DEFAULT 0,
    linked_description TEXT,
    linked_status VARCHAR(30),
    
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_project_links_type CHECK (link_type IN ('shipment', 'purchase_invoice', 'sales_invoice', 'expense', 'payment')),
    UNIQUE(project_id, link_type, linked_id)
);

CREATE INDEX IF NOT EXISTS idx_project_links_project ON project_links(project_id);
CREATE INDEX IF NOT EXISTS idx_project_links_type ON project_links(link_type);
CREATE INDEX IF NOT EXISTS idx_project_links_linked ON project_links(link_type, linked_id);

-- =============================================
-- SEED DEFAULT PROJECT TYPES
-- =============================================
INSERT INTO project_types (code, name, name_ar, description, description_ar, icon, color, is_system, sort_order)
VALUES 
    ('construction', 'Construction', 'بناء', 'Building and construction projects', 'مشاريع البناء والتشييد', 'BuildingOfficeIcon', 'orange', TRUE, 1),
    ('procurement', 'External Procurement', 'مشتريات خارجية', 'External procurement and sourcing projects', 'مشاريع المشتريات والتوريد الخارجي', 'TruckIcon', 'blue', TRUE, 2),
    ('real_estate', 'Real Estate', 'عقارات', 'Real estate acquisition and management', 'اقتناء وإدارة العقارات', 'HomeModernIcon', 'green', TRUE, 3),
    ('new_branch', 'New Branch', 'إنشاء فرع جديد', 'Opening new branches and locations', 'افتتاح فروع ومواقع جديدة', 'MapPinIcon', 'purple', TRUE, 4),
    ('internal_dev', 'Internal Development', 'تطوير داخلي', 'Internal development and improvement projects', 'مشاريع التطوير والتحسين الداخلي', 'CogIcon', 'gray', TRUE, 5),
    ('research_marketing', 'Research & Marketing', 'بحوث وتسويق', 'Research, marketing, and business development', 'البحوث والتسويق وتطوير الأعمال', 'ChartBarIcon', 'pink', TRUE, 6),
    ('it_infrastructure', 'IT Infrastructure', 'بنية تحتية تقنية', 'IT systems and infrastructure projects', 'مشاريع الأنظمة والبنية التحتية التقنية', 'ServerIcon', 'cyan', TRUE, 7),
    ('other', 'Other', 'أخرى', 'Other project types', 'أنواع مشاريع أخرى', 'FolderIcon', 'slate', TRUE, 99)
ON CONFLICT DO NOTHING;

-- =============================================
-- FUNCTION: Calculate project totals
-- =============================================
CREATE OR REPLACE FUNCTION calculate_project_totals(p_project_id INTEGER)
RETURNS TABLE(
    total_budget DECIMAL,
    total_actual_cost DECIMAL,
    children_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE project_tree AS (
        SELECT id, budget, 0 AS depth
        FROM projects WHERE id = p_project_id AND deleted_at IS NULL
        
        UNION ALL
        
        SELECT p.id, p.budget, pt.depth + 1
        FROM projects p
        INNER JOIN project_tree pt ON p.parent_project_id = pt.id
        WHERE p.deleted_at IS NULL
    ),
    project_costs_sum AS (
        SELECT pt.id, COALESCE(SUM(pc.actual_amount), 0) AS costs
        FROM project_tree pt
        LEFT JOIN project_costs pc ON pc.project_id = pt.id AND pc.deleted_at IS NULL
        GROUP BY pt.id
    )
    SELECT 
        COALESCE(SUM(pt.budget), 0)::DECIMAL AS total_budget,
        COALESCE(SUM(pcs.costs), 0)::DECIMAL AS total_actual_cost,
        (COUNT(*) - 1)::INTEGER AS children_count
    FROM project_tree pt
    LEFT JOIN project_costs_sum pcs ON pcs.id = pt.id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE project_types IS 'Project type classifications';
COMMENT ON TABLE project_items IS 'Project tasks, milestones, deliverables, and phases';
COMMENT ON TABLE project_costs IS 'Cost entries for projects';
COMMENT ON TABLE project_links IS 'Links between projects and other entities (shipments, invoices, etc.)';
COMMENT ON FUNCTION calculate_project_totals IS 'Calculate aggregated budget and costs for a project including all children';

-- =============================================
-- PROJECT PERMISSIONS
-- =============================================
INSERT INTO permissions (permission_code, resource, action, description, name_en, name_ar, module) VALUES
    ('projects:view', 'projects', 'view', 'View projects module', 'View Projects', 'عرض المشاريع', 'projects'),
    ('projects:create', 'projects', 'create', 'Create new projects', 'Create Projects', 'إنشاء المشاريع', 'projects'),
    ('projects:edit', 'projects', 'edit', 'Edit projects', 'Edit Projects', 'تعديل المشاريع', 'projects'),
    ('projects:delete', 'projects', 'delete', 'Delete projects', 'Delete Projects', 'حذف المشاريع', 'projects'),
    ('projects:projects:view', 'projects', 'projects:view', 'View projects list', 'View Projects List', 'عرض قائمة المشاريع', 'projects'),
    ('projects:projects:create', 'projects', 'projects:create', 'Create project entries', 'Create Project Entries', 'إنشاء سجلات المشاريع', 'projects'),
    ('projects:projects:edit', 'projects', 'projects:edit', 'Edit project entries', 'Edit Project Entries', 'تعديل سجلات المشاريع', 'projects'),
    ('projects:projects:delete', 'projects', 'projects:delete', 'Delete project entries', 'Delete Project Entries', 'حذف سجلات المشاريع', 'projects'),
    ('projects:phases:view', 'projects', 'phases:view', 'View project phases', 'View Project Phases', 'عرض مراحل المشاريع', 'projects'),
    ('projects:phases:create', 'projects', 'phases:create', 'Create project phases', 'Create Project Phases', 'إنشاء مراحل المشاريع', 'projects'),
    ('projects:phases:edit', 'projects', 'phases:edit', 'Edit project phases', 'Edit Project Phases', 'تعديل مراحل المشاريع', 'projects'),
    ('projects:phases:delete', 'projects', 'phases:delete', 'Delete project phases', 'Delete Project Phases', 'حذف مراحل المشاريع', 'projects'),
    ('projects:items:view', 'projects', 'items:view', 'View project items/tasks', 'View Project Items', 'عرض مهام المشاريع', 'projects'),
    ('projects:items:create', 'projects', 'items:create', 'Create project items/tasks', 'Create Project Items', 'إنشاء مهام المشاريع', 'projects'),
    ('projects:items:edit', 'projects', 'items:edit', 'Edit project items/tasks', 'Edit Project Items', 'تعديل مهام المشاريع', 'projects'),
    ('projects:items:delete', 'projects', 'items:delete', 'Delete project items/tasks', 'Delete Project Items', 'حذف مهام المشاريع', 'projects'),
    ('projects:costs:view', 'projects', 'costs:view', 'View project costs', 'View Project Costs', 'عرض تكاليف المشاريع', 'projects'),
    ('projects:costs:create', 'projects', 'costs:create', 'Create project cost entries', 'Create Project Costs', 'إنشاء تكاليف المشاريع', 'projects'),
    ('projects:costs:edit', 'projects', 'costs:edit', 'Edit project cost entries', 'Edit Project Costs', 'تعديل تكاليف المشاريع', 'projects'),
    ('projects:costs:delete', 'projects', 'costs:delete', 'Delete project cost entries', 'Delete Project Costs', 'حذف تكاليف المشاريع', 'projects'),
    ('projects:links:manage', 'projects', 'links:manage', 'Manage project links', 'Manage Project Links', 'إدارة روابط المشاريع', 'projects'),
    ('project_types:view', 'project_types', 'view', 'View project types', 'View Project Types', 'عرض أنواع المشاريع', 'projects'),
    ('project_types:manage', 'project_types', 'manage', 'Manage project types', 'Manage Project Types', 'إدارة أنواع المشاريع', 'projects')
ON CONFLICT (permission_code) DO NOTHING;

-- Grant project permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('admin', 'super_admin')
AND p.permission_code LIKE 'projects:%'
ON CONFLICT DO NOTHING;

COMMIT;
