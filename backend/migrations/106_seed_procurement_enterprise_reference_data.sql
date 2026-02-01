-- =============================================
-- PROCUREMENT MODULE - ENTERPRISE REFERENCE DATA (ERP-grade)
-- Migration 106: Align reference lists to enterprise spec
--
-- Goals:
-- - No mock/test placeholders
-- - Idempotent (safe to re-run)
-- - Company-scoped (applies to all companies)
-- =============================================

-- =============================================
-- 1) Vendor Categories
-- =============================================
WITH categories AS (
  SELECT * FROM (VALUES
    ('LOCAL_SUP', 'Local Suppliers', 'موردون محليون', 'Suppliers based in the local market', 'مورّدون داخل السوق المحلي', 10),
    ('INTL_SUP', 'International Suppliers', 'موردون دوليون', 'Suppliers based outside the local market', 'مورّدون خارج السوق المحلي', 20),
    ('LOGISTICS', 'Logistics Providers', 'مقدمو الخدمات اللوجستية', 'Freight forwarding, shipping, and logistics service providers', 'شركات الشحن والتخليص والخدمات اللوجستية', 30),
    ('RAW_MAT', 'Raw Material Suppliers', 'موردو المواد الخام', 'Raw materials suppliers for manufacturing and operations', 'مورّدو المواد الخام للتصنيع والعمليات', 40),
    ('SERVICES', 'Service Providers', 'مقدمو الخدمات', 'Professional and operational service providers', 'مقدمو الخدمات المهنية والتشغيلية', 50)
  ) AS v(code, name, name_ar, description, description_ar, sort_order)
)
INSERT INTO vendor_categories (company_id, code, name, name_ar, description, description_ar, sort_order, is_active, created_by)
SELECT c.id, x.code, x.name, x.name_ar, x.description, x.description_ar, x.sort_order, true, NULL
FROM companies c
CROSS JOIN categories x
ON CONFLICT (company_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- =============================================
-- 2) Vendor Types
-- =============================================
WITH types AS (
  SELECT * FROM (VALUES
    ('MANUFACTURER', 'Manufacturer', 'مصنّع', 'Manufacturer / producer', 'مصنّع / منتج', true, false, 10),
    ('DISTRIBUTOR', 'Distributor', 'موزّع', 'Distributor / authorized distributor', 'موزّع / موزّع معتمد', true, false, 20),
    ('WHOLESALER', 'Wholesaler', 'تاجر جملة', 'Wholesaler', 'تاجر جملة', true, false, 30),
    ('FREIGHT_FWD', 'Freight Forwarder', 'وكيل شحن', 'Freight forwarding service provider', 'مزود خدمة الشحن والتخليص', false, false, 40),
    ('CUSTOMS_BRK', 'Customs Broker', 'مخلص جمركي', 'Customs clearance broker', 'مخلص جمركي', false, false, 50)
  ) AS v(code, name, name_ar, description, description_ar, affects_inventory, creates_asset, sort_order)
)
INSERT INTO vendor_types (company_id, code, name, name_ar, description, description_ar, affects_inventory, creates_asset, sort_order, is_active, created_by)
SELECT c.id, x.code, x.name, x.name_ar, x.description, x.description_ar, x.affects_inventory, x.creates_asset, x.sort_order, true, NULL
FROM companies c
CROSS JOIN types x
ON CONFLICT (company_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  affects_inventory = EXCLUDED.affects_inventory,
  creates_asset = EXCLUDED.creates_asset,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- =============================================
-- 3) Vendor Statuses
-- =============================================
WITH statuses AS (
  SELECT * FROM (VALUES
    ('ACTIVE', 'Active', 'نشط', 'Active vendor', 'مورد نشط', 'green', true, true, true, true, 10),
    ('ON_HOLD', 'On Hold', 'معلّق', 'Temporarily on hold', 'معلّق مؤقتاً', 'yellow', false, false, true, false, 20),
    ('BLACKLISTED', 'Blacklisted', 'محظور', 'Blacklisted vendor', 'مورد محظور', 'red', false, false, false, false, 30),
    ('UNDER_REVIEW', 'Under Review', 'قيد المراجعة', 'Vendor under compliance/review', 'مورد قيد المراجعة/الامتثال', 'blue', false, false, false, false, 40)
  ) AS v(code, name, name_ar, description, description_ar, color, allows_po, allows_inv, allows_pay, is_default, sort_order)
)
INSERT INTO vendor_statuses (company_id, code, name, name_ar, description, description_ar, color, allows_purchase_orders, allows_invoices, allows_payments, is_default, sort_order, is_active)
SELECT c.id, x.code, x.name, x.name_ar, x.description, x.description_ar, x.color, x.allows_po, x.allows_inv, x.allows_pay, x.is_default, x.sort_order, true
FROM companies c
CROSS JOIN statuses x
ON CONFLICT (company_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  color = EXCLUDED.color,
  allows_purchase_orders = EXCLUDED.allows_purchase_orders,
  allows_invoices = EXCLUDED.allows_invoices,
  allows_payments = EXCLUDED.allows_payments,
  is_default = EXCLUDED.is_default,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- Ensure only one default per company (prefer ACTIVE)
UPDATE vendor_statuses vs
SET is_default = (vs.code = 'ACTIVE')
WHERE vs.company_id IN (SELECT id FROM companies)
  AND vs.deleted_at IS NULL;

-- =============================================
-- 4) Vendor Payment Terms
-- =============================================
WITH terms AS (
  SELECT * FROM (VALUES
    ('COD', 'Cash on Delivery', 'الدفع عند الاستلام', 'Payment due upon delivery/receipt', 'الدفع مستحق عند التسليم/الاستلام', 'cash', 0, 0, 0.00, false, 10),
    ('NET15', 'Net 15', 'صافي 15', 'Payment due within 15 days', 'الدفع خلال 15 يوم', 'credit', 15, 0, 0.00, false, 20),
    ('NET30', 'Net 30', 'صافي 30', 'Payment due within 30 days', 'الدفع خلال 30 يوم', 'credit', 30, 0, 0.00, true, 30),
    ('NET60', 'Net 60', 'صافي 60', 'Payment due within 60 days', 'الدفع خلال 60 يوم', 'credit', 60, 0, 0.00, false, 40),
    ('ADV50', 'Advance Payment 50%', 'دفعة مقدمة 50%', '50% advance payment', 'دفعة مقدمة بنسبة 50%', 'cash', 0, 0, 0.00, false, 50)
  ) AS v(code, name, name_ar, description, description_ar, payment_type, due_days, discount_days, discount_percent, is_default, sort_order)
)
INSERT INTO vendor_payment_terms (
  company_id, code, name, name_ar, description, description_ar,
  payment_type, due_days, discount_days, discount_percent,
  is_default, sort_order, is_active, created_by
)
SELECT c.id, x.code, x.name, x.name_ar, x.description, x.description_ar,
       x.payment_type, x.due_days, x.discount_days, x.discount_percent,
       x.is_default, x.sort_order, true, NULL
FROM companies c
CROSS JOIN terms x
ON CONFLICT (company_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  payment_type = EXCLUDED.payment_type,
  due_days = EXCLUDED.due_days,
  discount_days = EXCLUDED.discount_days,
  discount_percent = EXCLUDED.discount_percent,
  is_default = EXCLUDED.is_default,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- Ensure only one default per company (prefer NET30)
UPDATE vendor_payment_terms vpt
SET is_default = (vpt.code = 'NET30')
WHERE vpt.company_id IN (SELECT id FROM companies)
  AND vpt.deleted_at IS NULL;

-- =============================================
-- 5) Purchase Order Types
-- =============================================
WITH po_types AS (
  SELECT * FROM (VALUES
    ('LOCAL_PURCHASE', 'Local Purchase', 'شراء محلي', 'Domestic purchase order', 'أمر شراء محلي', true, true, false, 10),
    ('IMPORT_PURCHASE', 'Import Purchase', 'شراء استيراد', 'Import purchase order', 'أمر شراء استيراد', true, true, false, 20),
    ('SERVICE_PURCHASE', 'Service Purchase', 'شراء خدمات', 'Service purchase order', 'أمر شراء خدمات', false, false, false, 30),
    ('EMERGENCY_PURCHASE', 'Emergency Purchase', 'شراء طارئ', 'Emergency/urgent purchase', 'شراء طارئ/عاجل', true, true, false, 40)
  ) AS v(code, name, name_ar, description, description_ar, affects_inventory, requires_grn, creates_asset, sort_order)
)
INSERT INTO purchase_order_types (
  company_id, code, name, name_ar, description, description_ar,
  affects_inventory, requires_grn, creates_asset,
  sort_order, is_active
)
SELECT c.id, x.code, x.name, x.name_ar, x.description, x.description_ar,
       x.affects_inventory, x.requires_grn, x.creates_asset,
       x.sort_order, true
FROM companies c
CROSS JOIN po_types x
ON CONFLICT (company_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  affects_inventory = EXCLUDED.affects_inventory,
  requires_grn = EXCLUDED.requires_grn,
  creates_asset = EXCLUDED.creates_asset,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- =============================================
-- 6) Supply Terms
-- =============================================
WITH supply AS (
  SELECT * FROM (VALUES
    ('PARTIAL_ALLOWED', 'Partial Delivery Allowed', 'السماح بالتسليم الجزئي', 'Partial delivery is allowed', 'السماح بالتسليم الجزئي', 'partial', true, 10, 10),
    ('COMPLETE_REQUIRED', 'Complete Delivery Required', 'يشترط التسليم الكامل', 'Complete delivery is required', 'يشترط التسليم الكامل', 'full', false, 100, 20),
    ('BY_SCHEDULE', 'Delivery by Schedule', 'التسليم حسب جدول', 'Delivery by schedule/plan', 'التسليم حسب جدول/خطة', 'partial', true, 20, 30),
    ('JIT', 'Just-In-Time (JIT)', 'التسليم في الوقت المناسب', 'Just-in-time delivery', 'التسليم في الوقت المناسب', 'partial', true, 20, 40)
  ) AS v(code, name, name_ar, description, description_ar, supply_type, allows_partial_delivery, min_delivery_percent, sort_order)
)
INSERT INTO supply_terms (
  company_id, code, name, name_ar, description, description_ar,
  supply_type, allows_partial_delivery, min_delivery_percent,
  sort_order, is_active
)
SELECT c.id, x.code, x.name, x.name_ar, x.description, x.description_ar,
       x.supply_type, x.allows_partial_delivery, x.min_delivery_percent,
       x.sort_order, true
FROM companies c
CROSS JOIN supply x
ON CONFLICT (company_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  supply_type = EXCLUDED.supply_type,
  allows_partial_delivery = EXCLUDED.allows_partial_delivery,
  min_delivery_percent = EXCLUDED.min_delivery_percent,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- =============================================
-- 7) Contract Types
-- =============================================
WITH ct AS (
  SELECT * FROM (VALUES
    ('ANNUAL_SUPPLY', 'Annual Supply Contract', 'عقد توريد سنوي', 'Annual supply contract', 'عقد توريد سنوي', 'annual', true, 10),
    ('SPOT', 'Spot Contract', 'عقد فوري', 'Spot (one-off) contract', 'عقد فوري (لمرة واحدة)', 'shipment', true, 20),
    ('FRAMEWORK', 'Framework Agreement', 'اتفاقية إطار', 'Framework agreement', 'اتفاقية إطار', 'annual', true, 30),
    ('SERVICE', 'Service Contract', 'عقد خدمات', 'Service contract', 'عقد خدمات', 'annual', true, 40)
  ) AS v(code, name, name_ar, description, description_ar, duration_type, requires_approval, sort_order)
)
INSERT INTO contract_types (
  company_id, code, name, name_ar, description, description_ar,
  duration_type, requires_approval,
  sort_order, is_active
)
SELECT c.id, x.code, x.name, x.name_ar, x.description, x.description_ar,
       x.duration_type, x.requires_approval,
       x.sort_order, true
FROM companies c
CROSS JOIN ct x
ON CONFLICT (company_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  duration_type = EXCLUDED.duration_type,
  requires_approval = EXCLUDED.requires_approval,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- =============================================
-- 8) Contract Statuses
-- =============================================
WITH cs AS (
  SELECT * FROM (VALUES
    ('DRAFT', 'Draft', 'مسودة', 'Contract draft', 'gray', false, false, 10),
    ('UNDER_REVIEW', 'Under Review', 'قيد المراجعة', 'Under review', 'blue', false, false, 20),
    ('APPROVED', 'Approved', 'معتمد', 'Approved (ready to activate)', 'green', false, false, 30),
    ('ACTIVE', 'Active', 'ساري', 'Active contract', 'green', true, false, 40),
    ('EXPIRED', 'Expired', 'منتهي', 'Expired contract', 'yellow', false, true, 50),
    ('TERMINATED', 'Terminated', 'ملغى', 'Terminated contract', 'red', false, true, 60)
  ) AS v(code, name, name_ar, description, color, allows_po, is_terminal, sort_order)
)
INSERT INTO contract_statuses (
  company_id, code, name, name_ar, description,
  color, allows_purchase_orders, is_terminal,
  sort_order, is_active
)
SELECT c.id, x.code, x.name, x.name_ar, x.description,
       x.color, x.allows_po, x.is_terminal,
       x.sort_order, true
FROM companies c
CROSS JOIN cs x
ON CONFLICT (company_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  allows_purchase_orders = EXCLUDED.allows_purchase_orders,
  is_terminal = EXCLUDED.is_terminal,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- =============================================
-- 9) Contract Approval Stages (mapped to required approval statuses)
-- =============================================
WITH stages AS (
  SELECT * FROM (VALUES
    ('LEGAL', 'Pending Legal Review', 'بانتظار المراجعة القانونية', 10, 'manager'),
    ('FINANCE', 'Pending Finance Approval', 'بانتظار الموافقة المالية', 20, 'finance_manager'),
    ('MANAGEMENT', 'Pending Management Approval', 'بانتظار موافقة الإدارة', 30, 'admin'),
    ('FULLY_APPROVED', 'Fully Approved', 'معتمد بالكامل', 40, 'admin')
  ) AS v(code, name, name_ar, stage_order, required_role)
)
INSERT INTO contract_approval_stages (company_id, code, name, name_ar, stage_order, required_role, is_active)
SELECT c.id, x.code, x.name, x.name_ar, x.stage_order, x.required_role, true
FROM companies c
CROSS JOIN stages x
ON CONFLICT (company_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  stage_order = EXCLUDED.stage_order,
  required_role = EXCLUDED.required_role,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;
