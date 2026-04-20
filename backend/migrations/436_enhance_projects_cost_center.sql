-- Migration 436: Enhance Projects as Cost Centers
-- Adds budget allocated/consumed tracking, financial status, risk level, tags
-- ================================================================

DO $$
BEGIN
    -- Budget/Revenue tracking columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'budget_allocated') THEN
        ALTER TABLE projects ADD COLUMN budget_allocated NUMERIC(18,4) DEFAULT 0;
        COMMENT ON COLUMN projects.budget_allocated IS 'Total allocated budget for this project';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'budget_consumed') THEN
        ALTER TABLE projects ADD COLUMN budget_consumed NUMERIC(18,4) DEFAULT 0;
        COMMENT ON COLUMN projects.budget_consumed IS 'Total consumed budget from linked transactions';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'revenue_target') THEN
        ALTER TABLE projects ADD COLUMN revenue_target NUMERIC(18,4) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'revenue_actual') THEN
        ALTER TABLE projects ADD COLUMN revenue_actual NUMERIC(18,4) DEFAULT 0;
    END IF;

    -- Financial status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'financial_status') THEN
        ALTER TABLE projects ADD COLUMN financial_status VARCHAR(30) DEFAULT 'open';
        COMMENT ON COLUMN projects.financial_status IS 'Financial lifecycle: open, in_review, approved, closed, archived';
    END IF;

    -- Completion percentage (separate from progress_percent which is task-based)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'completion_pct') THEN
        ALTER TABLE projects ADD COLUMN completion_pct SMALLINT DEFAULT 0;
    END IF;

    -- Risk level
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'risk_level') THEN
        ALTER TABLE projects ADD COLUMN risk_level VARCHAR(20) DEFAULT 'low';
        COMMENT ON COLUMN projects.risk_level IS 'Risk assessment: low, medium, high, critical';
    END IF;

    -- Tags for flexible categorization
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'tags') THEN
        ALTER TABLE projects ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;

    -- Custom fields for extensibility
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'custom_fields') THEN
        ALTER TABLE projects ADD COLUMN custom_fields JSONB DEFAULT '{}';
    END IF;

    RAISE NOTICE 'Projects cost center columns added successfully';
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_financial_status ON projects(financial_status);
CREATE INDEX IF NOT EXISTS idx_projects_company_status   ON projects(company_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_parent_level     ON projects(parent_project_id, project_level);
CREATE INDEX IF NOT EXISTS idx_projects_risk_level       ON projects(risk_level);
CREATE INDEX IF NOT EXISTS idx_projects_tags             ON projects USING GIN(tags);

-- Sync budget_allocated from existing budget column for existing records
UPDATE projects
SET budget_allocated = COALESCE(budget, 0)
WHERE budget_allocated = 0 AND budget > 0 AND deleted_at IS NULL;

DO $$ BEGIN RAISE NOTICE 'Migration 436 complete: Projects enhanced as cost centers'; END $$;
