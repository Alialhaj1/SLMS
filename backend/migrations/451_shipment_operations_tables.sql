-- Migration 451: Shipment Operations Tables
-- Creates: shipment_containers, shipment_parties, shipment_compliance,
--          shipment_cost_allocations, shipment_document_requirements

-- ============================================================
-- 1. SHIPMENT CONTAINERS
-- ============================================================
CREATE TABLE IF NOT EXISTS shipment_containers (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shipment_id     INTEGER NOT NULL REFERENCES logistics_shipments(id) ON DELETE CASCADE,
  container_type_id INTEGER REFERENCES container_types(id),
  container_number VARCHAR(30) NOT NULL,
  seal_number     VARCHAR(50),
  bl_number       VARCHAR(50),
  gross_weight_kg NUMERIC(12,3) DEFAULT 0,
  tare_weight_kg  NUMERIC(12,3) DEFAULT 0,
  net_weight_kg   NUMERIC(12,3) DEFAULT 0,
  volume_cbm      NUMERIC(12,3) DEFAULT 0,
  packages_count  INTEGER DEFAULT 0,
  temperature_min NUMERIC(6,2),
  temperature_max NUMERIC(6,2),
  is_hazardous    BOOLEAN DEFAULT false,
  hazmat_class    VARCHAR(20),
  status          VARCHAR(30) DEFAULT 'pending',
  loading_date    TIMESTAMP,
  discharge_date  TIMESTAMP,
  release_date    TIMESTAMP,
  location        VARCHAR(200),
  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_by      INTEGER REFERENCES users(id),
  updated_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipment_containers_company ON shipment_containers(company_id);
CREATE INDEX IF NOT EXISTS idx_shipment_containers_shipment ON shipment_containers(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_containers_number ON shipment_containers(container_number);
CREATE INDEX IF NOT EXISTS idx_shipment_containers_deleted ON shipment_containers(deleted_at);

-- ============================================================
-- 2. SHIPMENT PARTIES
-- ============================================================
CREATE TABLE IF NOT EXISTS shipment_parties (
  id                    SERIAL PRIMARY KEY,
  company_id            INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shipment_id           INTEGER NOT NULL REFERENCES logistics_shipments(id) ON DELETE CASCADE,
  party_type            VARCHAR(30) NOT NULL,  -- importer, exporter, consignee, notify_party, broker, shipping_agent, freight_forwarder
  party_name            VARCHAR(255) NOT NULL,
  party_name_ar         VARCHAR(255),
  supplier_id           INTEGER,
  customer_id           INTEGER,
  tax_number            VARCHAR(50),
  commercial_register   VARCHAR(50),
  address               TEXT,
  city                  VARCHAR(100),
  country_id            INTEGER REFERENCES countries(id),
  phone                 VARCHAR(50),
  email                 VARCHAR(255),
  contact_person        VARCHAR(200),
  broker_license_number VARCHAR(50),
  is_primary            BOOLEAN DEFAULT false,
  notes                 TEXT,
  created_by            INTEGER REFERENCES users(id),
  updated_by            INTEGER REFERENCES users(id),
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at            TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipment_parties_company ON shipment_parties(company_id);
CREATE INDEX IF NOT EXISTS idx_shipment_parties_shipment ON shipment_parties(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_parties_type ON shipment_parties(party_type);
CREATE INDEX IF NOT EXISTS idx_shipment_parties_deleted ON shipment_parties(deleted_at);

-- ============================================================
-- 3. SHIPMENT COMPLIANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS shipment_compliance (
  id                  SERIAL PRIMARY KEY,
  company_id          INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shipment_id         INTEGER NOT NULL REFERENCES logistics_shipments(id) ON DELETE CASCADE,
  requirement_type    VARCHAR(50) NOT NULL,  -- customs_clearance, quality_inspection, health_certificate, phytosanitary, fumigation, sgs_inspection, lab_test, import_license, certificate_of_origin
  requirement_name    VARCHAR(200) NOT NULL,
  requirement_name_ar VARCHAR(200),
  authority           VARCHAR(200),
  reference_number    VARCHAR(100),
  status              VARCHAR(30) DEFAULT 'pending',  -- pending, in_progress, passed, failed, waived, expired
  due_date            TIMESTAMP,
  completed_date      TIMESTAMP,
  expiry_date         TIMESTAMP,
  inspector           VARCHAR(200),
  result_notes        TEXT,
  document_url        VARCHAR(500),
  cost                NUMERIC(18,4) DEFAULT 0,
  currency_id         INTEGER REFERENCES currencies(id),
  is_mandatory        BOOLEAN DEFAULT true,
  priority            VARCHAR(20) DEFAULT 'normal',  -- low, normal, high, critical
  notes               TEXT,
  created_by          INTEGER REFERENCES users(id),
  updated_by          INTEGER REFERENCES users(id),
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at          TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipment_compliance_company ON shipment_compliance(company_id);
CREATE INDEX IF NOT EXISTS idx_shipment_compliance_shipment ON shipment_compliance(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_compliance_status ON shipment_compliance(status);
CREATE INDEX IF NOT EXISTS idx_shipment_compliance_deleted ON shipment_compliance(deleted_at);

-- ============================================================
-- 4. SHIPMENT COST ALLOCATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS shipment_cost_allocations (
  id                  SERIAL PRIMARY KEY,
  company_id          INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shipment_id         INTEGER NOT NULL REFERENCES logistics_shipments(id) ON DELETE CASCADE,
  expense_id          INTEGER REFERENCES shipment_expenses(id),
  cost_id             INTEGER REFERENCES logistics_shipment_costs(id),
  item_id             INTEGER,
  item_code           VARCHAR(50),
  item_name           VARCHAR(255),
  allocation_method   VARCHAR(30) DEFAULT 'value',  -- value, weight, volume, quantity, equal, manual
  allocation_basis    NUMERIC(18,4) DEFAULT 0,
  allocation_percentage NUMERIC(8,4) DEFAULT 0,
  allocated_amount    NUMERIC(18,4) DEFAULT 0,
  currency_id         INTEGER REFERENCES currencies(id),
  allocated_amount_base NUMERIC(18,4) DEFAULT 0,
  is_posted           BOOLEAN DEFAULT false,
  posted_at           TIMESTAMP,
  journal_entry_id    INTEGER REFERENCES journal_entries(id),
  notes               TEXT,
  created_by          INTEGER REFERENCES users(id),
  updated_by          INTEGER REFERENCES users(id),
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at          TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipment_cost_alloc_company ON shipment_cost_allocations(company_id);
CREATE INDEX IF NOT EXISTS idx_shipment_cost_alloc_shipment ON shipment_cost_allocations(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_cost_alloc_expense ON shipment_cost_allocations(expense_id);
CREATE INDEX IF NOT EXISTS idx_shipment_cost_alloc_item ON shipment_cost_allocations(item_id);
CREATE INDEX IF NOT EXISTS idx_shipment_cost_alloc_deleted ON shipment_cost_allocations(deleted_at);

-- ============================================================
-- 5. SHIPMENT DOCUMENT REQUIREMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS shipment_document_requirements (
  id                  SERIAL PRIMARY KEY,
  company_id          INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shipment_type_id    INTEGER,
  requirement_code    VARCHAR(50) NOT NULL,
  name_en             VARCHAR(200) NOT NULL,
  name_ar             VARCHAR(200),
  description_en      TEXT,
  description_ar      TEXT,
  document_category   VARCHAR(50) DEFAULT 'general',  -- general, customs, shipping, insurance, compliance, financial
  is_mandatory        BOOLEAN DEFAULT true,
  applies_to          VARCHAR(50) DEFAULT 'all',  -- all, import, export, transit
  stage               VARCHAR(50),  -- pre_shipment, in_transit, at_port, customs, delivery, post_delivery
  valid_days          INTEGER,
  issuing_authority   VARCHAR(200),
  template_url        VARCHAR(500),
  sort_order          INTEGER DEFAULT 0,
  is_active           BOOLEAN DEFAULT true,
  created_by          INTEGER REFERENCES users(id),
  updated_by          INTEGER REFERENCES users(id),
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at          TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipment_doc_reqs_company ON shipment_document_requirements(company_id);
CREATE INDEX IF NOT EXISTS idx_shipment_doc_reqs_type ON shipment_document_requirements(shipment_type_id);
CREATE INDEX IF NOT EXISTS idx_shipment_doc_reqs_deleted ON shipment_document_requirements(deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shipment_doc_reqs_code ON shipment_document_requirements(company_id, requirement_code) WHERE deleted_at IS NULL;

-- ============================================================
-- PERMISSIONS
-- ============================================================
INSERT INTO permissions (permission_code, resource, action, name_en, name_ar, module, description, sort_order, is_active, is_system)
VALUES
  ('shipment_containers:view', 'shipment_containers', 'view', 'View Shipment Containers', 'عرض حاويات الشحنة', 'shipping', 'View shipment containers', 1, true, true),
  ('shipment_containers:create', 'shipment_containers', 'create', 'Create Shipment Container', 'إنشاء حاوية شحنة', 'shipping', 'Create shipment containers', 2, true, true),
  ('shipment_containers:edit', 'shipment_containers', 'edit', 'Edit Shipment Container', 'تعديل حاوية شحنة', 'shipping', 'Edit shipment containers', 3, true, true),
  ('shipment_containers:delete', 'shipment_containers', 'delete', 'Delete Shipment Container', 'حذف حاوية شحنة', 'shipping', 'Delete shipment containers', 4, true, true),
  ('shipment_parties:view', 'shipment_parties', 'view', 'View Shipment Parties', 'عرض أطراف الشحنة', 'shipping', 'View shipment parties', 1, true, true),
  ('shipment_parties:create', 'shipment_parties', 'create', 'Create Shipment Party', 'إنشاء طرف شحنة', 'shipping', 'Create shipment parties', 2, true, true),
  ('shipment_parties:edit', 'shipment_parties', 'edit', 'Edit Shipment Party', 'تعديل طرف شحنة', 'shipping', 'Edit shipment parties', 3, true, true),
  ('shipment_parties:delete', 'shipment_parties', 'delete', 'Delete Shipment Party', 'حذف طرف شحنة', 'shipping', 'Delete shipment parties', 4, true, true),
  ('shipment_compliance:view', 'shipment_compliance', 'view', 'View Shipment Compliance', 'عرض امتثال الشحنة', 'shipping', 'View compliance requirements', 1, true, true),
  ('shipment_compliance:create', 'shipment_compliance', 'create', 'Create Compliance Record', 'إنشاء سجل امتثال', 'shipping', 'Create compliance records', 2, true, true),
  ('shipment_compliance:edit', 'shipment_compliance', 'edit', 'Edit Compliance Record', 'تعديل سجل امتثال', 'shipping', 'Edit compliance records', 3, true, true),
  ('shipment_compliance:delete', 'shipment_compliance', 'delete', 'Delete Compliance Record', 'حذف سجل امتثال', 'shipping', 'Delete compliance records', 4, true, true),
  ('shipment_cost_allocations:view', 'shipment_cost_allocations', 'view', 'View Cost Allocations', 'عرض توزيع التكاليف', 'shipping', 'View cost allocations', 1, true, true),
  ('shipment_cost_allocations:create', 'shipment_cost_allocations', 'create', 'Create Cost Allocation', 'إنشاء توزيع تكلفة', 'shipping', 'Create cost allocations', 2, true, true),
  ('shipment_cost_allocations:edit', 'shipment_cost_allocations', 'edit', 'Edit Cost Allocation', 'تعديل توزيع تكلفة', 'shipping', 'Edit cost allocations', 3, true, true),
  ('shipment_cost_allocations:delete', 'shipment_cost_allocations', 'delete', 'Delete Cost Allocation', 'حذف توزيع تكلفة', 'shipping', 'Delete cost allocations', 4, true, true),
  ('shipment_accounting:view', 'shipment_accounting', 'view', 'View Shipment Accounting', 'عرض محاسبة الشحنات', 'shipping', 'View shipment accounting', 1, true, true),
  ('shipment_accounting:create', 'shipment_accounting', 'create', 'Create Shipment Journal', 'إنشاء قيد شحنة', 'shipping', 'Create shipment journal entries', 2, true, true),
  ('shipment_cockpit:view', 'shipment_cockpit', 'view', 'View Shipment Cockpit', 'عرض لوحة الشحنات', 'shipping', 'View shipment dashboard', 1, true, true),
  ('shipment_document_requirements:view', 'shipment_document_requirements', 'view', 'View Document Requirements', 'عرض متطلبات المستندات', 'shipping', 'View document requirements', 1, true, true),
  ('shipment_document_requirements:create', 'shipment_document_requirements', 'create', 'Create Document Requirement', 'إنشاء متطلب مستند', 'shipping', 'Create document requirements', 2, true, true),
  ('shipment_document_requirements:edit', 'shipment_document_requirements', 'edit', 'Edit Document Requirement', 'تعديل متطلب مستند', 'shipping', 'Edit document requirements', 3, true, true),
  ('shipment_document_requirements:delete', 'shipment_document_requirements', 'delete', 'Delete Document Requirement', 'حذف متطلب مستند', 'shipping', 'Delete document requirements', 4, true, true)
ON CONFLICT (permission_code) DO NOTHING;

-- Grant all new permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, p.id FROM permissions p
WHERE p.permission_code IN (
  'shipment_containers:view', 'shipment_containers:create', 'shipment_containers:edit', 'shipment_containers:delete',
  'shipment_parties:view', 'shipment_parties:create', 'shipment_parties:edit', 'shipment_parties:delete',
  'shipment_compliance:view', 'shipment_compliance:create', 'shipment_compliance:edit', 'shipment_compliance:delete',
  'shipment_cost_allocations:view', 'shipment_cost_allocations:create', 'shipment_cost_allocations:edit', 'shipment_cost_allocations:delete',
  'shipment_accounting:view', 'shipment_accounting:create',
  'shipment_cockpit:view',
  'shipment_document_requirements:view', 'shipment_document_requirements:create', 'shipment_document_requirements:edit', 'shipment_document_requirements:delete'
)
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = 1 AND rp.permission_id = p.id);
