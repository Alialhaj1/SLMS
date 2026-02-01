-- Migration 027: Master Data Group 1 - System & General Settings
-- Date: 2025-12-25
-- Description: Numbering Series, Printed Templates, Digital Signatures, System Languages, UI Themes, System Policies

-- =====================================================
-- 1. Numbering Series
-- =====================================================
CREATE TABLE IF NOT EXISTS numbering_series (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL, -- 'shipments', 'invoices', 'vouchers', 'items', 'customers', 'suppliers'
  prefix VARCHAR(10),
  suffix VARCHAR(10),
  current_number INTEGER NOT NULL DEFAULT 1,
  padding_length INTEGER DEFAULT 6, -- 000001
  format VARCHAR(100), -- {PREFIX}{YYYY}{MM}{NNNNNN}{SUFFIX}
  sample_output VARCHAR(100), -- SHP-2025-12-000001
  reset_frequency VARCHAR(20) DEFAULT 'never', -- 'never', 'yearly', 'monthly', 'daily'
  last_reset_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes_en TEXT,
  notes_ar TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP,
  UNIQUE(company_id, module, deleted_at)
);

CREATE INDEX idx_numbering_series_company_id ON numbering_series(company_id);
CREATE INDEX idx_numbering_series_module ON numbering_series(module);
CREATE INDEX idx_numbering_series_active ON numbering_series(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE numbering_series IS 'Auto-numbering configuration for all modules (shipments, invoices, vouchers, etc.)';

-- =====================================================
-- 2. Printed Templates
-- =====================================================
CREATE TABLE IF NOT EXISTS printed_templates (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  template_type VARCHAR(50) NOT NULL, -- 'invoice', 'shipment', 'voucher', 'contract', 'report', 'label'
  module VARCHAR(50), -- 'sales', 'purchases', 'logistics', 'accounting', 'hr'
  language VARCHAR(10) DEFAULT 'en', -- 'en', 'ar', 'both'
  header_html TEXT, -- HTML header with logo, company info
  body_html TEXT, -- HTML body with {{placeholders}} for dynamic data
  footer_html TEXT, -- HTML footer with terms, signatures
  css TEXT, -- Custom CSS styles
  paper_size VARCHAR(20) DEFAULT 'A4', -- 'A4', 'Letter', 'Legal', 'A5'
  orientation VARCHAR(20) DEFAULT 'portrait', -- 'portrait', 'landscape'
  margin_top INTEGER DEFAULT 10, -- mm
  margin_bottom INTEGER DEFAULT 10,
  margin_left INTEGER DEFAULT 10,
  margin_right INTEGER DEFAULT 10,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  preview_url VARCHAR(500),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_printed_templates_company_id ON printed_templates(company_id);
CREATE INDEX idx_printed_templates_type ON printed_templates(template_type);
CREATE INDEX idx_printed_templates_module ON printed_templates(module);
CREATE INDEX idx_printed_templates_active ON printed_templates(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE printed_templates IS 'HTML/CSS templates for invoices, reports, labels, contracts';

-- =====================================================
-- 3. Digital Signatures
-- =====================================================
CREATE TABLE IF NOT EXISTS digital_signatures (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  signature_name_en VARCHAR(255) NOT NULL,
  signature_name_ar VARCHAR(255) NOT NULL,
  signature_title_en VARCHAR(255), -- 'CEO', 'Finance Manager', 'Logistics Director'
  signature_title_ar VARCHAR(255),
  department VARCHAR(100),
  signature_image_url VARCHAR(500), -- Path to uploaded signature image file
  signature_type VARCHAR(30) DEFAULT 'manual', -- 'manual', 'digital_certificate', 'biometric'
  certificate_path VARCHAR(500), -- Path to digital certificate (.pfx/.p12)
  certificate_issuer VARCHAR(255),
  certificate_serial VARCHAR(100),
  certificate_issued_date DATE,
  certificate_expiry_date DATE,
  signature_authority VARCHAR(255), -- Authorization level
  requires_2fa BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_digital_signatures_company_id ON digital_signatures(company_id);
CREATE INDEX idx_digital_signatures_user_id ON digital_signatures(user_id);
CREATE INDEX idx_digital_signatures_active ON digital_signatures(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE digital_signatures IS 'Digital signatures for document approval and e-signing';

-- =====================================================
-- 4. System Languages
-- =====================================================
CREATE TABLE IF NOT EXISTS system_languages (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE, -- 'en', 'ar', 'fr', 'es'
  name_en VARCHAR(100) NOT NULL,
  name_native VARCHAR(100) NOT NULL, -- 'English', 'العربية', 'Français'
  direction VARCHAR(3) DEFAULT 'ltr', -- 'ltr', 'rtl'
  date_format VARCHAR(50) DEFAULT 'YYYY-MM-DD', -- Date display format
  time_format VARCHAR(50) DEFAULT 'HH:mm:ss', -- Time display format
  number_format VARCHAR(50) DEFAULT '#,##0.00', -- Number display format
  currency_position VARCHAR(20) DEFAULT 'before', -- 'before', 'after'
  decimal_separator VARCHAR(1) DEFAULT '.',
  thousands_separator VARCHAR(1) DEFAULT ',',
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  flag_icon VARCHAR(100), -- Country flag emoji or icon code
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_system_languages_code ON system_languages(code);
CREATE INDEX idx_system_languages_active ON system_languages(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE system_languages IS 'Supported languages for multi-language UI';

-- Seed default languages
INSERT INTO system_languages (code, name_en, name_native, direction, is_default, is_active, flag_icon, sort_order) VALUES
('en', 'English', 'English', 'ltr', TRUE, TRUE, '🇬🇧', 1),
('ar', 'Arabic', 'العربية', 'rtl', FALSE, TRUE, '🇸🇦', 2)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 5. UI Themes
-- =====================================================
CREATE TABLE IF NOT EXISTS ui_themes (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE, -- NULL = system-wide theme
  name_en VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  theme_code VARCHAR(50) NOT NULL, -- 'default', 'dark', 'blue', 'green', 'corporate'
  primary_color VARCHAR(7), -- Hex color #3B82F6
  secondary_color VARCHAR(7),
  accent_color VARCHAR(7),
  background_color VARCHAR(7),
  text_color VARCHAR(7),
  sidebar_color VARCHAR(7),
  header_color VARCHAR(7),
  logo_url VARCHAR(500), -- Company logo
  logo_dark_url VARCHAR(500), -- Logo for dark mode
  favicon_url VARCHAR(500),
  font_family VARCHAR(100) DEFAULT 'Inter', -- CSS font family
  font_size_base INTEGER DEFAULT 14, -- Base font size in px
  border_radius INTEGER DEFAULT 6, -- Border radius in px
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP,
  UNIQUE(company_id, theme_code, deleted_at)
);

CREATE INDEX idx_ui_themes_company_id ON ui_themes(company_id);
CREATE INDEX idx_ui_themes_code ON ui_themes(theme_code);
CREATE INDEX idx_ui_themes_active ON ui_themes(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE ui_themes IS 'Custom UI themes (colors, logos, fonts) per company';

-- =====================================================
-- 6. System Policies
-- =====================================================
CREATE TABLE IF NOT EXISTS system_policies (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE, -- NULL = system-wide policy
  policy_key VARCHAR(100) NOT NULL, -- 'session_timeout_minutes', 'password_min_length', 'max_login_attempts'
  policy_value TEXT NOT NULL, -- JSON or plain text value
  description_en TEXT,
  description_ar TEXT,
  data_type VARCHAR(20) DEFAULT 'string', -- 'string', 'integer', 'boolean', 'json', 'float'
  category VARCHAR(50), -- 'security', 'performance', 'compliance', 'general'
  default_value TEXT, -- Default value if not overridden
  validation_regex TEXT, -- Validation pattern for the value
  is_system_policy BOOLEAN DEFAULT FALSE, -- System-level (cannot be deleted)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP,
  UNIQUE(company_id, policy_key, deleted_at)
);

CREATE INDEX idx_system_policies_company_id ON system_policies(company_id);
CREATE INDEX idx_system_policies_key ON system_policies(policy_key);
CREATE INDEX idx_system_policies_category ON system_policies(category);
CREATE INDEX idx_system_policies_active ON system_policies(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE system_policies IS 'Configurable system policies (session timeout, password rules, etc.)';

-- Seed default system policies (system-wide, company_id = NULL)
INSERT INTO system_policies (company_id, policy_key, policy_value, description_en, description_ar, data_type, category, default_value, is_system_policy, is_active) 
SELECT 
  NULL, 
  vals.policy_key, 
  vals.policy_value, 
  vals.description_en, 
  vals.description_ar, 
  vals.data_type, 
  vals.category, 
  vals.default_value, 
  vals.is_system_policy, 
  vals.is_active
FROM (VALUES
  ('session_timeout_minutes', '15', 'Session timeout in minutes', 'مدة انتهاء الجلسة بالدقائق', 'integer', 'security', '15', TRUE, TRUE),
  ('password_min_length', '8', 'Minimum password length', 'الحد الأدنى لطول كلمة المرور', 'integer', 'security', '8', TRUE, TRUE),
  ('password_require_uppercase', 'true', 'Require uppercase letter in password', 'يتطلب حرف كبير في كلمة المرور', 'boolean', 'security', 'true', TRUE, TRUE),
  ('password_require_lowercase', 'true', 'Require lowercase letter in password', 'يتطلب حرف صغير في كلمة المرور', 'boolean', 'security', 'true', TRUE, TRUE),
  ('password_require_number', 'true', 'Require number in password', 'يتطلب رقم في كلمة المرور', 'boolean', 'security', 'true', TRUE, TRUE),
  ('password_require_special_char', 'false', 'Require special character in password', 'يتطلب رمز خاص في كلمة المرور', 'boolean', 'security', 'false', TRUE, TRUE),
  ('max_login_attempts', '5', 'Maximum login attempts before lockout', 'الحد الأقصى لمحاولات تسجيل الدخول قبل الحظر', 'integer', 'security', '5', TRUE, TRUE),
  ('lockout_duration_minutes', '30', 'Account lockout duration in minutes', 'مدة حظر الحساب بالدقائق', 'integer', 'security', '30', TRUE, TRUE),
  ('refresh_token_expiry_days', '30', 'Refresh token expiry in days', 'انتهاء رمز التحديث بالأيام', 'integer', 'security', '30', TRUE, TRUE),
  ('enable_2fa', 'false', 'Enable two-factor authentication', 'تفعيل المصادقة الثنائية', 'boolean', 'security', 'false', TRUE, TRUE),
  ('backup_retention_days', '30', 'Backup retention period in days', 'مدة الاحتفاظ بالنسخ الاحتياطية بالأيام', 'integer', 'general', '30', TRUE, TRUE),
  ('audit_log_retention_days', '365', 'Audit log retention period in days', 'مدة الاحتفاظ بسجلات المراجعة بالأيام', 'integer', 'compliance', '365', TRUE, TRUE),
  ('api_rate_limit_per_minute', '60', 'API rate limit per minute per user', 'حد استدعاء API في الدقيقة لكل مستخدم', 'integer', 'performance', '60', TRUE, TRUE),
  ('max_file_upload_size_mb', '10', 'Maximum file upload size in MB', 'الحد الأقصى لحجم تحميل الملف بالميجابايت', 'integer', 'performance', '10', TRUE, TRUE),
  ('default_page_size', '25', 'Default pagination page size', 'عدد السجلات الافتراضي في الصفحة', 'integer', 'performance', '25', TRUE, TRUE)
) AS vals(policy_key, policy_value, description_en, description_ar, data_type, category, default_value, is_system_policy, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM system_policies sp 
  WHERE sp.company_id IS NULL 
    AND sp.policy_key = vals.policy_key 
    AND sp.deleted_at IS NULL
);

-- =====================================================
-- Permissions for Group 1
-- =====================================================
INSERT INTO permissions (permission_code, resource, action, description) VALUES
('numbering_series:view', 'numbering_series', 'view', 'View numbering series'),
('numbering_series:create', 'numbering_series', 'create', 'Create new numbering series'),
('numbering_series:edit', 'numbering_series', 'edit', 'Edit numbering series'),
('numbering_series:delete', 'numbering_series', 'delete', 'Delete numbering series'),
('printed_templates:view', 'printed_templates', 'view', 'View printed templates'),
('printed_templates:create', 'printed_templates', 'create', 'Create new printed templates'),
('printed_templates:edit', 'printed_templates', 'edit', 'Edit printed templates'),
('printed_templates:delete', 'printed_templates', 'delete', 'Delete printed templates'),
('digital_signatures:view', 'digital_signatures', 'view', 'View digital signatures'),
('digital_signatures:create', 'digital_signatures', 'create', 'Create new digital signatures'),
('digital_signatures:edit', 'digital_signatures', 'edit', 'Edit digital signatures'),
('digital_signatures:delete', 'digital_signatures', 'delete', 'Delete digital signatures'),
('system_languages:view', 'system_languages', 'view', 'View system languages'),
('system_languages:create', 'system_languages', 'create', 'Create new system languages'),
('system_languages:edit', 'system_languages', 'edit', 'Edit system languages'),
('system_languages:delete', 'system_languages', 'delete', 'Delete system languages'),
('ui_themes:view', 'ui_themes', 'view', 'View UI themes'),
('ui_themes:create', 'ui_themes', 'create', 'Create new UI themes'),
('ui_themes:edit', 'ui_themes', 'edit', 'Edit UI themes'),
('ui_themes:delete', 'ui_themes', 'delete', 'Delete UI themes'),
('system_policies:view', 'system_policies', 'view', 'View system policies'),
('system_policies:create', 'system_policies', 'create', 'Create new system policies'),
('system_policies:edit', 'system_policies', 'edit', 'Edit system policies'),
('system_policies:delete', 'system_policies', 'delete', 'Delete system policies')
ON CONFLICT (permission_code) DO NOTHING;

-- =====================================================
-- Grant permissions to super_admin and admin roles
-- =====================================================
DO $$
DECLARE
  super_admin_role_id INTEGER;
  admin_role_id INTEGER;
  perm RECORD;
BEGIN
  -- Get role IDs
  SELECT id INTO super_admin_role_id FROM roles WHERE name = 'super_admin';
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';

  -- Grant all Group 1 permissions to super_admin and admin
  FOR perm IN 
    SELECT id FROM permissions 
    WHERE permission_code LIKE 'numbering_series:%' 
       OR permission_code LIKE 'printed_templates:%'
       OR permission_code LIKE 'digital_signatures:%'
       OR permission_code LIKE 'system_languages:%'
       OR permission_code LIKE 'ui_themes:%'
       OR permission_code LIKE 'system_policies:%'
  LOOP
    -- Grant to super_admin
    IF super_admin_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (super_admin_role_id, perm.id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;

    -- Grant to admin
    IF admin_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (admin_role_id, perm.id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 027 completed successfully';
  RAISE NOTICE '📊 Created 6 tables: numbering_series, printed_templates, digital_signatures, system_languages, ui_themes, system_policies';
  RAISE NOTICE '🔐 Added 24 permissions for Group 1 entities';
  RAISE NOTICE '👤 Granted permissions to super_admin and admin roles';
END $$;
