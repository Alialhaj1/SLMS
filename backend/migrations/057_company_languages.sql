-- Migration 057: Company Languages (default + enabled per company)
-- Date: 2025-12-31

BEGIN;

CREATE TABLE IF NOT EXISTS company_languages (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL REFERENCES system_languages(code),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, language_code)
);

-- Enforce ONE default language per company
CREATE UNIQUE INDEX IF NOT EXISTS ux_company_languages_one_default
  ON company_languages(company_id)
  WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_company_languages_company ON company_languages(company_id);

-- Seed each existing company with EN + AR enabled (EN default)
INSERT INTO company_languages (company_id, language_code, is_enabled, is_default)
SELECT c.id, sl.code, TRUE, (sl.code = 'en')
FROM companies c
JOIN system_languages sl ON sl.code IN ('en', 'ar')
WHERE NOT EXISTS (
  SELECT 1 FROM company_languages cl
  WHERE cl.company_id = c.id AND cl.language_code = sl.code
);

-- If a company has no default set (edge-case), force EN as default
UPDATE company_languages cl
SET is_default = TRUE
WHERE cl.language_code = 'en'
  AND NOT EXISTS (
    SELECT 1 FROM company_languages x
    WHERE x.company_id = cl.company_id AND x.is_default = TRUE
  );

-- Seed permissions
INSERT INTO permissions (permission_code, resource, action, description)
VALUES
  ('settings:language:view',   'language', 'view', 'View System Languages'),
  ('settings:language:update', 'language', 'edit', 'Update Default Language')
ON CONFLICT (permission_code) DO NOTHING;

COMMIT;
