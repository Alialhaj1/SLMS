-- Migration 439: Create Project Report Snapshots Table
-- Stores periodic snapshots of project financial data for historical reporting
-- ================================================================

CREATE TABLE IF NOT EXISTS project_report_snapshots (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id),
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    snapshot_date   DATE NOT NULL,
    report_type     VARCHAR(30) NOT NULL,
    -- report_type: daily_cost, weekly_summary, monthly_summary, milestone, manual
    data            JSONB NOT NULL DEFAULT '{}',
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_project
    ON project_report_snapshots(project_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_company
    ON project_report_snapshots(company_id, report_type);

-- Add permissions for project phases and reports
INSERT INTO permissions (permission_code, resource, action, name_en, name_ar, module, description)
VALUES 
    ('projects:reports:view', 'projects', 'reports:view', 'View Project Reports', 'عرض تقارير المشاريع', 'projects', 'View project financial reports and analytics'),
    ('projects:reports:export', 'projects', 'reports:export', 'Export Project Reports', 'تصدير تقارير المشاريع', 'projects', 'Export project reports as PDF/Excel'),
    ('projects:links:manage', 'projects', 'links:manage', 'Manage Project Links', 'إدارة ربط المشاريع', 'projects', 'Link/unlink transactions to projects'),
    ('projects:financial:close', 'projects', 'financial:close', 'Close Project Financially', 'إغلاق مالي للمشروع', 'projects', 'Financially close a project (irreversible)')
ON CONFLICT (permission_code) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE 'Migration 439 complete: project_report_snapshots table + new permissions created';
END $$;
