-- Migration 437: Create Project Phases Table
-- Supports both global templates and project-specific phases
-- ================================================================

CREATE TABLE IF NOT EXISTS project_phases (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER REFERENCES companies(id),
    project_id      INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    -- NULL project_id = global template, otherwise = phase for specific project

    code            VARCHAR(20)  NOT NULL,
    name            VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description     TEXT,
    description_ar  TEXT,
    phase_type      VARCHAR(30)  NOT NULL DEFAULT 'custom',
    -- phase_type IN: planning, procurement, execution, testing, closure, custom

    -- Sequencing and dates
    sort_order      SMALLINT NOT NULL DEFAULT 0,
    planned_start   DATE,
    planned_end     DATE,
    actual_start    DATE,
    actual_end      DATE,
    duration_days   INTEGER DEFAULT 0,

    -- Budgeting
    budget          NUMERIC(18,4) DEFAULT 0,
    actual_cost     NUMERIC(18,4) DEFAULT 0,

    -- Progress
    completion_pct  SMALLINT DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'pending',
    -- status IN: pending, in_progress, completed, skipped

    -- Template flag
    is_template     BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,

    -- Audit
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP,

    CONSTRAINT uq_project_phases_code UNIQUE (company_id, project_id, code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_phases_project   ON project_phases(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_phases_template  ON project_phases(is_template) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_phases_company   ON project_phases(company_id) WHERE deleted_at IS NULL;

-- Seed: Global phase templates (company_id = NULL, project_id = NULL)
INSERT INTO project_phases (company_id, project_id, code, name, name_ar, description, description_ar, phase_type, sort_order, duration_days, is_template, is_active)
VALUES
    (NULL, NULL, 'PLAN',  'Planning',     'التخطيط',     'Project planning and requirements gathering',    'تخطيط المشروع وجمع المتطلبات',     'planning',     1, 14, TRUE, TRUE),
    (NULL, NULL, 'PROC',  'Procurement',  'المشتريات',   'Sourcing, vendor selection, and procurement',    'التوريد واختيار الموردين والمشتريات', 'procurement',  2, 30, TRUE, TRUE),
    (NULL, NULL, 'EXEC',  'Execution',    'التنفيذ',     'Main execution and delivery phase',              'مرحلة التنفيذ والتسليم الرئيسية',    'execution',    3, 60, TRUE, TRUE),
    (NULL, NULL, 'TEST',  'Testing',      'الفحص',       'Quality assurance and testing',                  'ضمان الجودة والفحص',                'testing',      4, 7,  TRUE, TRUE),
    (NULL, NULL, 'CLOSE', 'Closure',      'الإغلاق',     'Project closure and final documentation',        'إغلاق المشروع والتوثيق النهائي',    'closure',      5, 5,  TRUE, TRUE)
ON CONFLICT DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE 'Migration 437 complete: project_phases table created with 5 default templates';
END $$;
