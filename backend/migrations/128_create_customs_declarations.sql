-- =====================================================
-- Migration 128: Customs Declarations Module
-- Complete customs clearance / بيان جمركي implementation
-- =====================================================

BEGIN;

-- ---------------------------------------------
-- 1) Customs Declaration Types (استيراد / تصدير / عبور)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS customs_declaration_types (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  
  code VARCHAR(30) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  
  -- Config
  direction VARCHAR(20) NOT NULL DEFAULT 'import', -- import, export, transit
  requires_inspection BOOLEAN DEFAULT FALSE,
  
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_customs_declaration_types_company ON customs_declaration_types(company_id);
CREATE INDEX IF NOT EXISTS idx_customs_declaration_types_direction ON customs_declaration_types(direction) WHERE deleted_at IS NULL;

-- Seed default declaration types
INSERT INTO customs_declaration_types (company_id, code, name_en, name_ar, direction, requires_inspection) VALUES
  (NULL, 'IMPORT', 'Import Declaration', 'بيان استيراد', 'import', true),
  (NULL, 'EXPORT', 'Export Declaration', 'بيان تصدير', 'export', false),
  (NULL, 'TRANSIT', 'Transit Declaration', 'بيان عبور', 'transit', false),
  (NULL, 'RE_EXPORT', 'Re-Export Declaration', 'بيان إعادة تصدير', 'export', false),
  (NULL, 'TEMP_IMPORT', 'Temporary Import', 'استيراد مؤقت', 'import', true),
  (NULL, 'FREE_ZONE', 'Free Zone Entry', 'دخول منطقة حرة', 'import', false)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------
-- 2) Customs Declaration Statuses (مسار البيان)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS customs_declaration_statuses (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  
  code VARCHAR(30) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  
  -- Workflow config
  stage_order INTEGER NOT NULL DEFAULT 0,
  is_initial BOOLEAN DEFAULT FALSE,
  is_final BOOLEAN DEFAULT FALSE,
  color VARCHAR(20) DEFAULT 'gray',
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  UNIQUE(company_id, code)
);

-- Seed statuses
INSERT INTO customs_declaration_statuses (company_id, code, name_en, name_ar, stage_order, is_initial, is_final, color) VALUES
  (NULL, 'DRAFT', 'Draft', 'مسودة', 1, true, false, 'gray'),
  (NULL, 'SUBMITTED', 'Submitted', 'مقدم', 2, false, false, 'blue'),
  (NULL, 'UNDER_REVIEW', 'Under Review', 'قيد المراجعة', 3, false, false, 'yellow'),
  (NULL, 'UNDERTAKING', 'Undertaking Not to Dispose', 'تعهد بعدم التصرف', 4, false, false, 'orange'),
  (NULL, 'HAS_NOTES', 'Has Notes/Observations', 'عليه ملاحظات', 5, false, false, 'yellow'),
  (NULL, 'INSPECTION_PENDING', 'Pending Inspection', 'عليه فحص', 6, false, false, 'purple'),
  (NULL, 'INSPECTION_DONE', 'Inspection Complete', 'تمت المعاينة', 7, false, false, 'cyan'),
  (NULL, 'FEES_CALCULATED', 'Fees Calculated', 'تم احتساب الرسوم', 8, false, false, 'purple'),
  (NULL, 'PENDING_PAYMENT', 'Pending Payment', 'بانتظار السداد', 9, false, false, 'orange'),
  (NULL, 'PAID', 'Paid', 'مسدد', 10, false, false, 'green'),
  (NULL, 'CLEARED', 'Cleared', 'مفسوح', 11, false, true, 'green'),
  (NULL, 'REJECTED', 'Rejected', 'مرفوض', 12, false, true, 'red'),
  (NULL, 'CANCELLED', 'Cancelled', 'ملغي', 13, false, true, 'gray')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------
-- 3) Main Customs Declarations Table
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS customs_declarations (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Declaration Reference
  declaration_number VARCHAR(60) NOT NULL,
  declaration_type_id INTEGER NOT NULL REFERENCES customs_declaration_types(id),
  status_id INTEGER NOT NULL REFERENCES customs_declaration_statuses(id),
  
  -- Dates
  declaration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  submission_date DATE,
  clearance_date DATE,
  
  -- Linked Documents
  shipment_id INTEGER REFERENCES logistics_shipments(id),
  purchase_order_id INTEGER REFERENCES purchase_orders(id),
  commercial_invoice_id INTEGER REFERENCES purchase_invoices(id),
  project_id INTEGER REFERENCES projects(id),
  
  -- Customs Office
  customs_office_code VARCHAR(30),
  customs_office_name VARCHAR(255),
  entry_point_code VARCHAR(30), -- Port / Airport / Border
  entry_point_name VARCHAR(255),
  
  -- Transport
  transport_mode VARCHAR(30), -- sea, air, land
  vessel_name VARCHAR(255),
  voyage_number VARCHAR(60),
  bl_number VARCHAR(60),
  awb_number VARCHAR(60),
  manifest_number VARCHAR(60),
  
  -- Origin / Destination
  origin_country_id INTEGER REFERENCES countries(id),
  destination_country_id INTEGER REFERENCES countries(id),
  final_destination VARCHAR(255),
  
  -- Incoterm
  incoterm VARCHAR(20),
  
  -- Currency
  currency_id INTEGER NOT NULL REFERENCES currencies(id),
  exchange_rate DECIMAL(18, 6) DEFAULT 1,
  
  -- Values (Summary)
  total_cif_value DECIMAL(18, 4) DEFAULT 0,
  total_fob_value DECIMAL(18, 4) DEFAULT 0,
  freight_value DECIMAL(18, 4) DEFAULT 0,
  insurance_value DECIMAL(18, 4) DEFAULT 0,
  other_charges DECIMAL(18, 4) DEFAULT 0,
  
  -- Fees Summary
  total_customs_duty DECIMAL(18, 4) DEFAULT 0,
  total_vat DECIMAL(18, 4) DEFAULT 0,
  total_other_fees DECIMAL(18, 4) DEFAULT 0,
  total_fees DECIMAL(18, 4) DEFAULT 0,
  
  -- Weights & Packages
  total_gross_weight DECIMAL(18, 4) DEFAULT 0,
  total_net_weight DECIMAL(18, 4) DEFAULT 0,
  total_packages INTEGER DEFAULT 0,
  package_type VARCHAR(50),
  
  -- Notes
  notes TEXT,
  internal_notes TEXT,
  
  -- Workflow
  submitted_by INTEGER REFERENCES users(id),
  submitted_at TIMESTAMP,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  
  -- Audit
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  UNIQUE(company_id, declaration_number)
);

CREATE INDEX IF NOT EXISTS idx_customs_declarations_company ON customs_declarations(company_id);
CREATE INDEX IF NOT EXISTS idx_customs_declarations_number ON customs_declarations(declaration_number);
CREATE INDEX IF NOT EXISTS idx_customs_declarations_type ON customs_declarations(declaration_type_id);
CREATE INDEX IF NOT EXISTS idx_customs_declarations_status ON customs_declarations(status_id);
CREATE INDEX IF NOT EXISTS idx_customs_declarations_date ON customs_declarations(declaration_date);
CREATE INDEX IF NOT EXISTS idx_customs_declarations_shipment ON customs_declarations(shipment_id);
CREATE INDEX IF NOT EXISTS idx_customs_declarations_po ON customs_declarations(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_customs_declarations_project ON customs_declarations(project_id);
CREATE INDEX IF NOT EXISTS idx_customs_declarations_deleted ON customs_declarations(deleted_at);

-- ---------------------------------------------
-- 4) Declaration Parties (أطراف البيان)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS customs_declaration_parties (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  declaration_id INTEGER NOT NULL REFERENCES customs_declarations(id) ON DELETE CASCADE,
  
  party_type VARCHAR(30) NOT NULL, -- importer, exporter, consignee, notify_party, broker, carrier
  
  -- Party Info
  party_name VARCHAR(255) NOT NULL,
  party_name_ar VARCHAR(255),
  tax_number VARCHAR(50),
  commercial_register VARCHAR(50),
  
  -- Contact
  address TEXT,
  city VARCHAR(100),
  country_id INTEGER REFERENCES countries(id),
  phone VARCHAR(50),
  email VARCHAR(255),
  
  -- For brokers
  broker_license_number VARCHAR(50),
  
  is_primary BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customs_declaration_parties_declaration ON customs_declaration_parties(declaration_id);
CREATE INDEX IF NOT EXISTS idx_customs_declaration_parties_type ON customs_declaration_parties(party_type);

-- ---------------------------------------------
-- 5) Declaration Items (أصناف البيان)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS customs_declaration_items (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  declaration_id INTEGER NOT NULL REFERENCES customs_declarations(id) ON DELETE CASCADE,
  
  line_number INTEGER NOT NULL,
  
  -- Item Reference
  item_id INTEGER REFERENCES items(id),
  item_code VARCHAR(50),
  item_description VARCHAR(500) NOT NULL,
  item_description_ar VARCHAR(500),
  
  -- HS Code
  hs_code VARCHAR(20) NOT NULL,
  hs_code_description VARCHAR(500),
  
  -- Origin
  origin_country_id INTEGER REFERENCES countries(id),
  
  -- Quantities
  quantity DECIMAL(18, 4) NOT NULL,
  unit_id INTEGER REFERENCES units_of_measure(id),
  unit_code VARCHAR(20),
  
  gross_weight DECIMAL(18, 4) DEFAULT 0,
  net_weight DECIMAL(18, 4) DEFAULT 0,
  packages INTEGER DEFAULT 1,
  
  -- Values
  unit_price DECIMAL(18, 4) NOT NULL,
  fob_value DECIMAL(18, 4) DEFAULT 0,
  freight_value DECIMAL(18, 4) DEFAULT 0,
  insurance_value DECIMAL(18, 4) DEFAULT 0,
  cif_value DECIMAL(18, 4) DEFAULT 0,
  
  -- Customs
  duty_rate DECIMAL(8, 4) DEFAULT 0,
  duty_amount DECIMAL(18, 4) DEFAULT 0,
  vat_rate DECIMAL(8, 4) DEFAULT 0,
  vat_amount DECIMAL(18, 4) DEFAULT 0,
  other_fees DECIMAL(18, 4) DEFAULT 0,
  total_fees DECIMAL(18, 4) DEFAULT 0,
  
  -- Exemptions
  exemption_id INTEGER REFERENCES customs_exemptions(id),
  exemption_rate DECIMAL(8, 4) DEFAULT 0,
  
  -- Inspection
  inspection_required BOOLEAN DEFAULT FALSE,
  inspection_result VARCHAR(50), -- passed, failed, pending
  inspection_notes TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customs_declaration_items_declaration ON customs_declaration_items(declaration_id);
CREATE INDEX IF NOT EXISTS idx_customs_declaration_items_item ON customs_declaration_items(item_id);
CREATE INDEX IF NOT EXISTS idx_customs_declaration_items_hs_code ON customs_declaration_items(hs_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_customs_declaration_items_line ON customs_declaration_items(declaration_id, line_number) WHERE deleted_at IS NULL;

-- ---------------------------------------------
-- 6) Declaration Containers (الحاويات)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS customs_declaration_containers (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  declaration_id INTEGER NOT NULL REFERENCES customs_declarations(id) ON DELETE CASCADE,
  
  container_number VARCHAR(20) NOT NULL,
  container_type VARCHAR(20), -- 20GP, 40GP, 40HC, etc.
  seal_number VARCHAR(50),
  
  gross_weight DECIMAL(18, 4) DEFAULT 0,
  tare_weight DECIMAL(18, 4) DEFAULT 0,
  net_weight DECIMAL(18, 4) DEFAULT 0,
  
  packages_count INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(30) DEFAULT 'pending', -- pending, inspected, released
  inspection_date TIMESTAMP,
  release_date TIMESTAMP,
  
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customs_declaration_containers_declaration ON customs_declaration_containers(declaration_id);
CREATE INDEX IF NOT EXISTS idx_customs_declaration_containers_number ON customs_declaration_containers(container_number);

-- ---------------------------------------------
-- 7) Declaration Fees (الرسوم الجمركية)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS customs_declaration_fees (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  declaration_id INTEGER NOT NULL REFERENCES customs_declarations(id) ON DELETE CASCADE,
  
  fee_type VARCHAR(50) NOT NULL, -- customs_duty, vat, inspection_fee, documentation, storage, etc.
  fee_code VARCHAR(30),
  fee_name_en VARCHAR(255) NOT NULL,
  fee_name_ar VARCHAR(255),
  
  -- Calculation
  base_amount DECIMAL(18, 4) DEFAULT 0,
  rate DECIMAL(8, 4) DEFAULT 0,
  calculated_amount DECIMAL(18, 4) NOT NULL,
  
  -- Exemption
  exemption_amount DECIMAL(18, 4) DEFAULT 0,
  final_amount DECIMAL(18, 4) NOT NULL,
  
  -- Payment status
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP,
  payment_reference VARCHAR(100),
  
  -- GL Account
  account_id INTEGER REFERENCES accounts(id),
  
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customs_declaration_fees_declaration ON customs_declaration_fees(declaration_id);
CREATE INDEX IF NOT EXISTS idx_customs_declaration_fees_type ON customs_declaration_fees(fee_type);

-- ---------------------------------------------
-- 8) Declaration Inspections (المعاينات)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS customs_declaration_inspections (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  declaration_id INTEGER NOT NULL REFERENCES customs_declarations(id) ON DELETE CASCADE,
  
  inspection_type VARCHAR(50) NOT NULL, -- document_review, physical_inspection, sampling, x_ray
  inspection_date TIMESTAMP NOT NULL,
  
  inspector_name VARCHAR(255),
  inspector_id_number VARCHAR(50),
  
  location VARCHAR(255),
  
  -- Result
  result VARCHAR(30) NOT NULL, -- passed, failed, conditional, pending
  findings TEXT,
  recommendations TEXT,
  
  -- Photos / Docs
  attachments_count INTEGER DEFAULT 0,
  
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customs_declaration_inspections_declaration ON customs_declaration_inspections(declaration_id);
CREATE INDEX IF NOT EXISTS idx_customs_declaration_inspections_result ON customs_declaration_inspections(result);

-- ---------------------------------------------
-- 9) Declaration Payments (المدفوعات)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS customs_declaration_payments (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  declaration_id INTEGER NOT NULL REFERENCES customs_declarations(id) ON DELETE CASCADE,
  
  payment_date DATE NOT NULL,
  payment_method VARCHAR(30) NOT NULL, -- cash, bank_transfer, cheque, sadad
  payment_reference VARCHAR(100),
  
  amount DECIMAL(18, 4) NOT NULL,
  currency_id INTEGER NOT NULL REFERENCES currencies(id),
  
  -- Bank details
  bank_name VARCHAR(255),
  account_number VARCHAR(50),
  
  -- Sadad details
  sadad_number VARCHAR(50),
  
  -- Receipt
  receipt_number VARCHAR(100),
  receipt_date DATE,
  
  -- GL Integration
  journal_entry_id INTEGER REFERENCES journal_entries(id),
  
  notes TEXT,
  
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customs_declaration_payments_declaration ON customs_declaration_payments(declaration_id);
CREATE INDEX IF NOT EXISTS idx_customs_declaration_payments_date ON customs_declaration_payments(payment_date);

-- ---------------------------------------------
-- 10) Declaration Attachments (المرفقات)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS customs_declaration_attachments (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  declaration_id INTEGER NOT NULL REFERENCES customs_declarations(id) ON DELETE CASCADE,
  
  document_type VARCHAR(50) NOT NULL, -- commercial_invoice, packing_list, bl, certificate_origin, etc.
  document_name VARCHAR(255) NOT NULL,
  
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  
  -- Reference
  document_number VARCHAR(100),
  document_date DATE,
  
  is_required BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  
  notes TEXT,
  
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customs_declaration_attachments_declaration ON customs_declaration_attachments(declaration_id);
CREATE INDEX IF NOT EXISTS idx_customs_declaration_attachments_type ON customs_declaration_attachments(document_type);

-- ---------------------------------------------
-- 11) Declaration History (سجل التغييرات)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS customs_declaration_history (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  declaration_id INTEGER NOT NULL REFERENCES customs_declarations(id) ON DELETE CASCADE,
  
  action VARCHAR(50) NOT NULL, -- created, updated, status_changed, submitted, approved, rejected, etc.
  
  old_status_id INTEGER REFERENCES customs_declaration_statuses(id),
  new_status_id INTEGER REFERENCES customs_declaration_statuses(id),
  
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  
  notes TEXT,
  
  performed_by INTEGER REFERENCES users(id),
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_customs_declaration_history_declaration ON customs_declaration_history(declaration_id);
CREATE INDEX IF NOT EXISTS idx_customs_declaration_history_action ON customs_declaration_history(action);
CREATE INDEX IF NOT EXISTS idx_customs_declaration_history_date ON customs_declaration_history(performed_at);

-- ---------------------------------------------
-- 12) Fee Types Reference
-- ---------------------------------------------
INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar, is_active) VALUES
  (NULL, 'customs_fee_types', 'CUSTOMS_DUTY', 'Customs Duty', 'رسوم جمركية', 'Import customs duty', 'رسوم الاستيراد الجمركية', true),
  (NULL, 'customs_fee_types', 'VAT', 'Value Added Tax', 'ضريبة القيمة المضافة', 'VAT on imported goods', 'ضريبة القيمة المضافة على السلع المستوردة', true),
  (NULL, 'customs_fee_types', 'INSPECTION_FEE', 'Inspection Fee', 'رسوم المعاينة', 'Physical inspection fee', 'رسوم المعاينة الفعلية', true),
  (NULL, 'customs_fee_types', 'DOCUMENTATION_FEE', 'Documentation Fee', 'رسوم التوثيق', 'Documentation and processing', 'رسوم التوثيق والمعالجة', true),
  (NULL, 'customs_fee_types', 'STORAGE_FEE', 'Storage Fee', 'رسوم التخزين', 'Warehouse storage fee', 'رسوم التخزين في المستودع', true),
  (NULL, 'customs_fee_types', 'DEMURRAGE', 'Demurrage', 'غرامات التأخير', 'Container demurrage charges', 'غرامات تأخير الحاويات', true),
  (NULL, 'customs_fee_types', 'QUARANTINE_FEE', 'Quarantine Fee', 'رسوم الحجر', 'Quarantine inspection fee', 'رسوم فحص الحجر الصحي', true),
  (NULL, 'customs_fee_types', 'CERTIFICATION_FEE', 'Certification Fee', 'رسوم الشهادات', 'Certificate issuance fee', 'رسوم إصدار الشهادات', true),
  (NULL, 'customs_fee_types', 'HANDLING_FEE', 'Handling Fee', 'رسوم المناولة', 'Cargo handling fee', 'رسوم مناولة البضائع', true),
  (NULL, 'customs_fee_types', 'BROKERAGE_FEE', 'Brokerage Fee', 'أتعاب التخليص', 'Customs broker fee', 'أتعاب المخلص الجمركي', true)
ON CONFLICT DO NOTHING;

-- Document types
INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar, is_active) VALUES
  (NULL, 'customs_document_types', 'COMMERCIAL_INVOICE', 'Commercial Invoice', 'فاتورة تجارية', 'Commercial invoice document', 'مستند الفاتورة التجارية', true),
  (NULL, 'customs_document_types', 'PACKING_LIST', 'Packing List', 'قائمة التعبئة', 'Packing list document', 'مستند قائمة التعبئة', true),
  (NULL, 'customs_document_types', 'BILL_OF_LADING', 'Bill of Lading', 'بوليصة الشحن', 'Bill of lading', 'بوليصة الشحن البحري', true),
  (NULL, 'customs_document_types', 'AIRWAY_BILL', 'Airway Bill', 'بوليصة الشحن الجوي', 'Air waybill', 'بوليصة الشحن الجوي', true),
  (NULL, 'customs_document_types', 'CERTIFICATE_ORIGIN', 'Certificate of Origin', 'شهادة المنشأ', 'Certificate of origin', 'شهادة بلد المنشأ', true),
  (NULL, 'customs_document_types', 'HEALTH_CERTIFICATE', 'Health Certificate', 'شهادة صحية', 'Health/sanitary certificate', 'الشهادة الصحية', true),
  (NULL, 'customs_document_types', 'CONFORMITY_CERTIFICATE', 'Conformity Certificate', 'شهادة المطابقة', 'Certificate of conformity', 'شهادة المطابقة للمواصفات', true),
  (NULL, 'customs_document_types', 'INSURANCE_CERTIFICATE', 'Insurance Certificate', 'شهادة التأمين', 'Insurance certificate', 'شهادة التأمين', true),
  (NULL, 'customs_document_types', 'IMPORT_LICENSE', 'Import License', 'رخصة استيراد', 'Import permit/license', 'رخصة الاستيراد', true),
  (NULL, 'customs_document_types', 'SASO_CERTIFICATE', 'SASO Certificate', 'شهادة ساسو', 'SASO conformity certificate', 'شهادة المطابقة من هيئة المواصفات', true)
ON CONFLICT DO NOTHING;

-- Transport modes
INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar, is_active) VALUES
  (NULL, 'transport_modes', 'SEA', 'Sea Freight', 'شحن بحري', 'Maritime transport', 'النقل البحري', true),
  (NULL, 'transport_modes', 'AIR', 'Air Freight', 'شحن جوي', 'Air transport', 'النقل الجوي', true),
  (NULL, 'transport_modes', 'LAND', 'Land Transport', 'نقل بري', 'Road/land transport', 'النقل البري', true),
  (NULL, 'transport_modes', 'RAIL', 'Rail Freight', 'شحن سككي', 'Railway transport', 'النقل بالسكك الحديدية', true),
  (NULL, 'transport_modes', 'MULTI', 'Multimodal', 'متعدد الوسائط', 'Combined transport', 'النقل المتعدد الوسائط', true)
ON CONFLICT DO NOTHING;

-- Container types
INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar, is_active) VALUES
  (NULL, 'container_types', '20GP', '20ft Standard', 'حاوية 20 قدم', '20 feet general purpose container', 'حاوية عامة 20 قدم', true),
  (NULL, 'container_types', '40GP', '40ft Standard', 'حاوية 40 قدم', '40 feet general purpose container', 'حاوية عامة 40 قدم', true),
  (NULL, 'container_types', '40HC', '40ft High Cube', 'حاوية 40 قدم عالية', '40 feet high cube container', 'حاوية عالية 40 قدم', true),
  (NULL, 'container_types', '20RF', '20ft Reefer', 'حاوية مبردة 20 قدم', '20 feet refrigerated container', 'حاوية مبردة 20 قدم', true),
  (NULL, 'container_types', '40RF', '40ft Reefer', 'حاوية مبردة 40 قدم', '40 feet refrigerated container', 'حاوية مبردة 40 قدم', true),
  (NULL, 'container_types', '20OT', '20ft Open Top', 'حاوية مفتوحة 20 قدم', '20 feet open top container', 'حاوية مفتوحة 20 قدم', true),
  (NULL, 'container_types', '40OT', '40ft Open Top', 'حاوية مفتوحة 40 قدم', '40 feet open top container', 'حاوية مفتوحة 40 قدم', true),
  (NULL, 'container_types', 'FLAT', 'Flat Rack', 'منصة مسطحة', 'Flat rack container', 'حاوية منصة مسطحة', true),
  (NULL, 'container_types', 'TANK', 'Tank Container', 'حاوية صهريج', 'Tank container', 'حاوية صهريج', true)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------
-- 13) Permissions
-- ---------------------------------------------
INSERT INTO permissions (permission_code, resource, action, description, module, name_en, name_ar) VALUES
  ('customs:declarations:view', 'customs:declarations', 'view', 'View customs declarations', 'Customs', 'View Customs Declarations', 'عرض البيانات الجمركية'),
  ('customs:declarations:create', 'customs:declarations', 'create', 'Create customs declarations', 'Customs', 'Create Customs Declarations', 'إنشاء البيانات الجمركية'),
  ('customs:declarations:edit', 'customs:declarations', 'edit', 'Edit customs declarations', 'Customs', 'Edit Customs Declarations', 'تعديل البيانات الجمركية'),
  ('customs:declarations:delete', 'customs:declarations', 'delete', 'Delete customs declarations', 'Customs', 'Delete Customs Declarations', 'حذف البيانات الجمركية'),
  ('customs:declarations:submit', 'customs:declarations', 'submit', 'Submit customs declarations', 'Customs', 'Submit Customs Declarations', 'تقديم البيانات الجمركية'),
  ('customs:declarations:approve', 'customs:declarations', 'approve', 'Approve customs declarations', 'Customs', 'Approve Customs Declarations', 'الموافقة على البيانات الجمركية'),
  ('customs:declarations:reject', 'customs:declarations', 'reject', 'Reject customs declarations', 'Customs', 'Reject Customs Declarations', 'رفض البيانات الجمركية'),
  ('customs:declarations:print', 'customs:declarations', 'print', 'Print customs declarations', 'Customs', 'Print Customs Declarations', 'طباعة البيانات الجمركية'),
  
  ('customs:inspections:view', 'customs:inspections', 'view', 'View customs inspections', 'Customs', 'View Customs Inspections', 'عرض المعاينات الجمركية'),
  ('customs:inspections:create', 'customs:inspections', 'create', 'Record customs inspections', 'Customs', 'Create Customs Inspections', 'تسجيل المعاينات الجمركية'),
  ('customs:inspections:manage', 'customs:inspections', 'manage', 'Manage customs inspections', 'Customs', 'Manage Customs Inspections', 'إدارة المعاينات الجمركية'),
  
  ('customs:payments:view', 'customs:payments', 'view', 'View customs payments', 'Customs', 'View Customs Payments', 'عرض المدفوعات الجمركية'),
  ('customs:payments:create', 'customs:payments', 'create', 'Create customs payments', 'Customs', 'Create Customs Payments', 'إنشاء المدفوعات الجمركية'),
  ('customs:payments:manage', 'customs:payments', 'manage', 'Manage customs payments', 'Customs', 'Manage Customs Payments', 'إدارة المدفوعات الجمركية'),
  
  ('customs:reports:view', 'customs:reports', 'view', 'View customs reports', 'Customs', 'View Customs Reports', 'عرض التقارير الجمركية'),
  ('customs:reports:export', 'customs:reports', 'export', 'Export customs reports', 'Customs', 'Export Customs Reports', 'تصدير التقارير الجمركية')
ON CONFLICT (permission_code) DO NOTHING;

-- Grant to super_admin
DO $$
DECLARE
  all_permissions JSONB;
  super_admin_id INTEGER;
BEGIN
  SELECT jsonb_agg(permission_code) INTO all_permissions FROM permissions;

  SELECT id INTO super_admin_id
  FROM roles
  WHERE name = 'super_admin' OR name = 'Super Admin'
  LIMIT 1;

  IF super_admin_id IS NOT NULL AND all_permissions IS NOT NULL THEN
    UPDATE roles
    SET permissions = all_permissions,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = super_admin_id;
  END IF;
END $$;

COMMIT;
