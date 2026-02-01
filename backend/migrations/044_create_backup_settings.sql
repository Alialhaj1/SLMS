-- =====================================================
-- 044 - Backup Settings (Settings/Admin phase)
-- =====================================================

-- Backup settings per company
CREATE TABLE IF NOT EXISTS backup_settings (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  storage_type VARCHAR(20) NOT NULL DEFAULT 'local', -- local, s3, azure
  storage_path TEXT, -- local path or bucket/container name
  schedule_cron VARCHAR(100),
  retention_days INTEGER NOT NULL DEFAULT 30,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_run_at TIMESTAMP,
  last_status VARCHAR(20), -- queued, running, success, failed
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP,
  UNIQUE(company_id, deleted_at)
);

CREATE INDEX IF NOT EXISTS idx_backup_settings_company_id ON backup_settings(company_id);

-- Backup runs history (queue/execution tracking)
CREATE TABLE IF NOT EXISTS backup_runs (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  backup_settings_id INTEGER REFERENCES backup_settings(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued', -- queued, running, success, failed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_backup_runs_company_id ON backup_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_backup_runs_created_at ON backup_runs(created_at);

-- Permissions (must match frontend constants)
INSERT INTO permissions (permission_code, resource, action, description)
VALUES
  ('backup_settings:view', 'backup_settings', 'view', 'View backup settings'),
  ('backup_settings:edit', 'backup_settings', 'edit', 'Edit backup settings'),
  ('backup_settings:execute', 'backup_settings', 'execute', 'Execute backups')
ON CONFLICT (permission_code) DO NOTHING;
