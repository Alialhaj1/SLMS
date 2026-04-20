-- Migration 355: Fix provision_company_master_data + Create Governance Tables
-- ============================================================================
-- Fixes:
--   1. shipping_methods clone was missing NOT NULL columns (name_en, shipment_type_id, pricing_basis)
--   2. unit_types uses name_en (not name) and has no tenant_id column
--   3. Creates governance tables: security_policies, approval_policies, visibility_policies
--   4. Adds is_provisioned/provisioned_at columns to companies table

-- ============================================================================
-- Part 0: Add missing columns to companies table
-- ============================================================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_provisioned BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMPTZ;

-- ============================================================================
-- Part 1: Fix provision_company_master_data function
-- The Section C (CLONE SHIPPING METHODS) INSERT was missing columns:
--   name_en (NOT NULL), shipment_type_id (NOT NULL), pricing_basis (NOT NULL DEFAULT 'per_kg')
-- Section G (UNIT TYPES) was using tenant_id and name which don't exist
-- ============================================================================

CREATE OR REPLACE FUNCTION provision_company_master_data(
  p_company_id INTEGER,
  p_tenant_id INTEGER DEFAULT NULL,
  p_country_code VARCHAR DEFAULT 'SAU',
  p_created_by INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
AS $function$
DECLARE
  result JSONB := '{}'::JSONB;
  cnt INTEGER;
  v_country_id INTEGER;
BEGIN
  -- Get country ID
  SELECT id INTO v_country_id FROM countries WHERE code = p_country_code AND deleted_at IS NULL LIMIT 1;

  -- =============================================
  -- A. CLONE CURRENCIES (Hybrid)
  -- =============================================
  INSERT INTO currencies (company_id, tenant_id, code, name, name_ar, symbol, decimal_places,
                          source_id, is_global, is_system, is_editable, data_layer)
  SELECT p_company_id, p_tenant_id, g.code, g.name, g.name_ar, g.symbol, g.decimal_places,
         g.id, FALSE, FALSE, TRUE, 'TENANT'
  FROM currencies g
  WHERE g.is_global = TRUE AND g.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM currencies c
      WHERE c.company_id = p_company_id AND c.code = g.code AND c.deleted_at IS NULL
    )
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('currencies_cloned', cnt);

  -- Set base currency based on country
  UPDATE currencies
  SET is_base_currency = TRUE
  WHERE company_id = p_company_id
    AND code = (SELECT currency_code FROM countries WHERE code = p_country_code LIMIT 1)
    AND deleted_at IS NULL;

  -- =============================================
  -- B. CLONE PAYMENT METHODS (Hybrid)
  -- =============================================
  INSERT INTO payment_methods (company_id, tenant_id, code, name, name_ar, payment_type,
                               source_id, is_global, is_system, is_editable, data_layer)
  SELECT p_company_id, p_tenant_id, g.code, g.name,
         COALESCE(g.name_ar, g.name), g.payment_type,
         g.id, FALSE, FALSE, TRUE, 'TENANT'
  FROM payment_methods g
  WHERE g.is_global = TRUE AND g.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM payment_methods c
      WHERE c.company_id = p_company_id AND c.code = g.code AND c.deleted_at IS NULL
    )
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('payment_methods_cloned', cnt);

  -- =============================================
  -- C. CLONE SHIPPING METHODS (Hybrid) — FIXED: includes name_en, shipment_type_id, pricing_basis
  -- =============================================
  INSERT INTO shipping_methods (company_id, tenant_id, code, name, name_ar, name_en,
                                transport_mode, shipment_type_id, pricing_basis,
                                source_id, is_global, is_system, is_editable, data_layer)
  SELECT p_company_id, p_tenant_id, g.code, g.name,
         COALESCE(g.name_ar, g.name),
         COALESCE(g.name_en, g.name),
         g.transport_mode,
         g.shipment_type_id,
         COALESCE(g.pricing_basis, 'per_kg'),
         g.id, FALSE, FALSE, TRUE, 'TENANT'
  FROM shipping_methods g
  WHERE g.is_global = TRUE AND g.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM shipping_methods c
      WHERE c.company_id = p_company_id AND c.code = g.code AND c.deleted_at IS NULL
    )
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('shipping_methods_cloned', cnt);

  -- =============================================
  -- D. SEED TAX TYPES (Company-Scoped, ZATCA)
  -- =============================================
  INSERT INTO tax_types (company_id, tenant_id, code, name, name_ar, tax_category, rate, is_system, data_layer)
  VALUES
    (p_company_id, p_tenant_id, 'VAT-STD', 'Standard VAT 15%', 'ضريبة القيمة المضافة 15%', 'vat', 15.00, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'VAT-ZERO', 'Zero Rated VAT', 'ضريبة القيمة المضافة صفرية', 'vat', 0.00, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'VAT-EXEMPT', 'VAT Exempt', 'معفى من ضريبة القيمة المضافة', 'vat', 0.00, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'CUSTOMS-STD', 'Standard Customs Duty 5%', 'الرسوم الجمركية 5%', 'customs', 5.00, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'CUSTOMS-12', 'Customs Duty 12%', 'الرسوم الجمركية 12%', 'customs', 12.00, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'CUSTOMS-15', 'Customs Duty 15%', 'الرسوم الجمركية 15%', 'customs', 15.00, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'CUSTOMS-20', 'Customs Duty 20%', 'الرسوم الجمركية 20%', 'customs', 20.00, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'CUSTOMS-EXEMPT', 'Customs Duty Exempt', 'معفى من الرسوم الجمركية', 'customs', 0.00, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'WHT-20', 'Withholding Tax 20%', 'ضريبة الاستقطاع 20%', 'withholding', 20.00, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'WHT-15', 'Withholding Tax 15%', 'ضريبة الاستقطاع 15%', 'withholding', 15.00, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'WHT-5', 'Withholding Tax 5%', 'ضريبة الاستقطاع 5%', 'withholding', 5.00, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'ZAKAT', 'Zakat 2.5%', 'زكاة 2.5%', 'zakat', 2.50, TRUE, 'TENANT')
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('tax_types_seeded', cnt);

  -- =============================================
  -- E. SEED PAYMENT TERMS (Hybrid)
  -- =============================================
  INSERT INTO payment_terms (company_id, tenant_id, code, name, name_ar, days, is_system, data_layer)
  VALUES
    (p_company_id, p_tenant_id, 'CASH', 'Cash / Immediate', 'نقد / فوري', 0, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'NET15', 'Net 15 Days', 'صافي 15 يوم', 15, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'NET30', 'Net 30 Days', 'صافي 30 يوم', 30, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'NET45', 'Net 45 Days', 'صافي 45 يوم', 45, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'NET60', 'Net 60 Days', 'صافي 60 يوم', 60, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'NET90', 'Net 90 Days', 'صافي 90 يوم', 90, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'NET120', 'Net 120 Days', 'صافي 120 يوم', 120, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'ADVANCE', 'Advance Payment', 'دفع مقدم', 0, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'COD', 'Cash on Delivery', 'الدفع عند التسليم', 0, TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'INST3', '3 Monthly Installments', '3 أقساط شهرية', 90, TRUE, 'TENANT')
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('payment_terms_seeded', cnt);

  -- =============================================
  -- F. SEED EXPENSE CATEGORIES (Hybrid)
  -- =============================================
  INSERT INTO expense_categories (company_id, code, name, name_ar, is_system, data_layer)
  VALUES
    (p_company_id, 'FREIGHT', 'Freight & Transportation', 'الشحن والنقل', TRUE, 'TENANT'),
    (p_company_id, 'CUSTOMS', 'Customs & Duties', 'الجمارك والرسوم', TRUE, 'TENANT'),
    (p_company_id, 'INSURANCE', 'Insurance', 'التأمين', TRUE, 'TENANT'),
    (p_company_id, 'CLEARANCE', 'Customs Clearance', 'التخليص الجمركي', TRUE, 'TENANT'),
    (p_company_id, 'DEMURRAGE', 'Demurrage & Detention', 'الأرضيات والتأخير', TRUE, 'TENANT'),
    (p_company_id, 'STORAGE', 'Storage & Warehousing', 'التخزين والمستودعات', TRUE, 'TENANT'),
    (p_company_id, 'HANDLING', 'Handling & Loading', 'المناولة والتحميل', TRUE, 'TENANT'),
    (p_company_id, 'PORT', 'Port Charges', 'رسوم الموانئ', TRUE, 'TENANT'),
    (p_company_id, 'DOCUMENTATION', 'Documentation', 'التوثيق والمستندات', TRUE, 'TENANT'),
    (p_company_id, 'INSPECTION', 'Inspection & Testing', 'الفحص والاختبار', TRUE, 'TENANT'),
    (p_company_id, 'OTHER', 'Other Expenses', 'مصروفات أخرى', TRUE, 'TENANT')
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('expense_categories_seeded', cnt);

  -- =============================================
  -- G. SEED UNIT TYPES (NO tenant_id, uses name_en instead of name)
  -- =============================================
  INSERT INTO unit_types (company_id, code, name_en, name_ar, is_system)
  VALUES
    (p_company_id, 'WEIGHT', 'Weight', 'الوزن', TRUE),
    (p_company_id, 'VOLUME', 'Volume', 'الحجم', TRUE),
    (p_company_id, 'LENGTH', 'Length', 'الطول', TRUE),
    (p_company_id, 'QUANTITY', 'Quantity', 'الكمية', TRUE),
    (p_company_id, 'AREA', 'Area', 'المساحة', TRUE)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('unit_types_seeded', cnt);

  -- =============================================
  -- H. SEED NUMBERING SERIES (Company-Scoped)
  -- =============================================
  INSERT INTO numbering_series (company_id, tenant_id, module, prefix, current_number, padding_length, format, is_system, data_layer)
  VALUES
    (p_company_id, p_tenant_id, 'shipments', 'SHP', 1, 6, '{prefix}-{year}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'purchase_orders', 'PO', 1, 6, '{prefix}-{year}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'sales_orders', 'SO', 1, 6, '{prefix}-{year}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'invoices', 'INV', 1, 6, '{prefix}-{year}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'payments', 'PAY', 1, 6, '{prefix}-{year}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'receipts', 'REC', 1, 6, '{prefix}-{year}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'journals', 'JV', 1, 6, '{prefix}-{year}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'customs_declarations', 'CD', 1, 6, '{prefix}-{year}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'expense_requests', 'EXP', 1, 6, '{prefix}-{year}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'projects', 'PRJ', 1, 6, '{prefix}-{year}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'contracts', 'CNT', 1, 6, '{prefix}-{year}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'letters_of_credit', 'LC', 1, 6, '{prefix}-{year}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'goods_receipt', 'GRN', 1, 6, '{prefix}-{year}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'delivery_notes', 'DN', 1, 6, '{prefix}-{year}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'credit_notes', 'CN', 1, 6, '{prefix}-{year}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'debit_notes', 'DBN', 1, 6, '{prefix}-{year}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'quotations', 'QTN', 1, 6, '{prefix}-{year}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'vendors', 'VND', 1, 6, '{prefix}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'customers', 'CUS', 1, 6, '{prefix}-{number}', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'items', 'ITM', 1, 6, '{prefix}-{number}', TRUE, 'TENANT')
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('numbering_series_seeded', cnt);

  -- =============================================
  -- I. SEED VENDOR CATEGORIES (Company-Scoped)
  -- =============================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_categories') THEN
    INSERT INTO vendor_categories (company_id, tenant_id, code, name, name_ar, is_system, data_layer)
    VALUES
      (p_company_id, p_tenant_id, 'SHIPPING', 'Shipping & Freight', 'الشحن والنقل', TRUE, 'TENANT'),
      (p_company_id, p_tenant_id, 'CLEARANCE', 'Customs Clearance', 'التخليص الجمركي', TRUE, 'TENANT'),
      (p_company_id, p_tenant_id, 'SUPPLIER', 'Goods Supplier', 'مورد بضائع', TRUE, 'TENANT'),
      (p_company_id, p_tenant_id, 'SERVICES', 'Service Provider', 'مزود خدمات', TRUE, 'TENANT'),
      (p_company_id, p_tenant_id, 'INSURANCE', 'Insurance Provider', 'شركة تأمين', TRUE, 'TENANT'),
      (p_company_id, p_tenant_id, 'TRANSPORT', 'Local Transport', 'نقل محلي', TRUE, 'TENANT'),
      (p_company_id, p_tenant_id, 'GOVERNMENT', 'Government Entity', 'جهة حكومية', TRUE, 'TENANT'),
      (p_company_id, p_tenant_id, 'MAINTENANCE', 'Maintenance & Repair', 'صيانة وإصلاح', TRUE, 'TENANT')
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS cnt = ROW_COUNT;
    result := result || jsonb_build_object('vendor_categories_seeded', cnt);
  END IF;

  -- =============================================
  -- J. SEED WAREHOUSE TYPES (uses name_en not name)
  -- =============================================
  INSERT INTO warehouse_types (company_id, tenant_id, code, name_en, name_ar, warehouse_category, is_system, data_layer)
  VALUES
    (p_company_id, p_tenant_id, 'GENERAL', 'General Warehouse', 'مستودع عام', 'general', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'COLD', 'Cold Storage', 'تخزين بارد', 'cold_storage', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'BONDED', 'Bonded Warehouse', 'مستودع جمركي', 'bonded', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'TRANSIT', 'Transit Warehouse', 'مستودع عبور', 'transit', TRUE, 'TENANT'),
    (p_company_id, p_tenant_id, 'HAZMAT', 'Hazardous Materials', 'مواد خطرة', 'hazmat', TRUE, 'TENANT')
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('warehouse_types_seeded', cnt);

  -- =============================================
  -- I. MARK COMPANY AS PROVISIONED
  -- =============================================
  UPDATE companies
  SET is_provisioned = TRUE,
      provisioned_at = NOW(),
      updated_at = NOW()
  WHERE id = p_company_id;

  result := result || jsonb_build_object('status', 'SUCCESS', 'company_id', p_company_id);

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Provisioning failed for company %: % - %', p_company_id, SQLERRM, SQLSTATE;
    RETURN jsonb_build_object('status', 'ERROR', 'company_id', p_company_id, 'error', SQLERRM);
END;
$function$;

-- ============================================================================
-- Part 2: Create Governance Tables
-- ============================================================================

-- 2a. Security Policies — per-tenant security rules
CREATE TABLE IF NOT EXISTS security_policies (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  company_id INTEGER REFERENCES companies(id),
  policy_name VARCHAR(100) NOT NULL,
  policy_code VARCHAR(50) NOT NULL,
  description TEXT,
  description_ar TEXT,
  policy_type VARCHAR(50) NOT NULL DEFAULT 'general',
  -- Policy settings as JSONB for flexibility
  settings JSONB DEFAULT '{}',
  -- Examples: password_min_length, password_require_uppercase, session_timeout_minutes,
  -- ip_whitelist, max_failed_attempts, two_factor_required, etc.
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, policy_code)
);

CREATE INDEX IF NOT EXISTS idx_security_policies_tenant ON security_policies(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_security_policies_company ON security_policies(company_id) WHERE deleted_at IS NULL;

-- 2b. Approval Policies — workflow approval rules per entity/action
CREATE TABLE IF NOT EXISTS approval_policies (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  company_id INTEGER REFERENCES companies(id),
  policy_name VARCHAR(100) NOT NULL,
  policy_code VARCHAR(50) NOT NULL,
  description TEXT,
  description_ar TEXT,
  entity_type VARCHAR(50) NOT NULL,  -- e.g. 'purchase_order', 'journal_entry', 'shipment'
  trigger_action VARCHAR(50) NOT NULL DEFAULT 'create', -- create, update, delete, post, approve
  -- Approval chain as JSONB array of steps
  -- Each step: { "role": "manager", "min_approvers": 1, "timeout_hours": 24 }
  approval_chain JSONB DEFAULT '[]',
  -- Conditions for when this policy applies
  conditions JSONB DEFAULT '{}',
  -- e.g. { "amount_gt": 10000, "currency": "SAR" }
  auto_approve_below NUMERIC(18,2),
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, company_id, policy_code)
);

CREATE INDEX IF NOT EXISTS idx_approval_policies_tenant ON approval_policies(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_approval_policies_entity ON approval_policies(entity_type) WHERE deleted_at IS NULL;

-- 2c. Visibility Policies — control field/data visibility per role/user
CREATE TABLE IF NOT EXISTS visibility_policies (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  company_id INTEGER REFERENCES companies(id),
  policy_name VARCHAR(100) NOT NULL,
  policy_code VARCHAR(50) NOT NULL,
  description TEXT,
  description_ar TEXT,
  entity_type VARCHAR(50) NOT NULL,  -- e.g. 'customers', 'shipments', 'journal_entries'
  -- Role or user scope
  target_role_id INTEGER REFERENCES roles(id),
  target_user_id INTEGER REFERENCES users(id),
  -- Field visibility rules as JSONB
  -- { "hidden_fields": ["cost_price", "margin"], "readonly_fields": ["code"], "masked_fields": ["phone"] }
  field_rules JSONB DEFAULT '{}',
  -- Row-level visibility filter (SQL WHERE clause fragment)
  row_filter VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, policy_code)
);

CREATE INDEX IF NOT EXISTS idx_visibility_policies_tenant ON visibility_policies(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visibility_policies_entity ON visibility_policies(entity_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visibility_policies_role ON visibility_policies(target_role_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- Part 3: Seed default security policies
-- ============================================================================
INSERT INTO security_policies (tenant_id, policy_name, policy_code, description, policy_type, settings, is_active)
VALUES
  (NULL, 'Default Password Policy', 'password_default', 'Platform-wide password requirements', 'password', 
   '{"min_length": 8, "require_uppercase": true, "require_lowercase": true, "require_number": true, "require_special": false, "max_age_days": 90}', TRUE),
  (NULL, 'Default Session Policy', 'session_default', 'Platform-wide session settings', 'session',
   '{"timeout_minutes": 30, "max_concurrent_sessions": 5, "extend_on_activity": true}', TRUE),
  (NULL, 'Default Login Policy', 'login_default', 'Platform-wide login security', 'login',
   '{"max_failed_attempts": 5, "lockout_minutes": 15, "require_captcha_after": 3}', TRUE)
ON CONFLICT DO NOTHING;
