-- =====================================================
-- Migration 129: Shipment-Centric Architecture Enhancement
-- تطبيق الفلسفة الأساسية: الشحنة كيان محوري + رقم المشروع إجباري
-- =====================================================

BEGIN;

-- ---------------------------------------------
-- 1) إضافة project_id و po_id للشحنات
-- ---------------------------------------------

-- إضافة project_id إجباري
ALTER TABLE logistics_shipments 
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE RESTRICT;

-- إضافة po_id اختياري (قد تأتي الشحنة من PO أو بدون)
ALTER TABLE logistics_shipments 
ADD COLUMN IF NOT EXISTS purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL;

-- إضافة vendor_id (المورد من PO أو مباشر)
ALTER TABLE logistics_shipments 
ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id) ON DELETE RESTRICT;

-- تحديث البيانات الحالية (تعيين project_id افتراضي للشحنات الموجودة)
UPDATE logistics_shipments 
SET project_id = (SELECT id FROM projects WHERE is_active = true ORDER BY id LIMIT 1)
WHERE project_id IS NULL;

-- جعل project_id إجباري
ALTER TABLE logistics_shipments 
ALTER COLUMN project_id SET NOT NULL;

-- إنشاء indices
CREATE INDEX IF NOT EXISTS idx_logistics_shipments_project_id 
  ON logistics_shipments(project_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_logistics_shipments_po_id 
  ON logistics_shipments(purchase_order_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_logistics_shipments_vendor_id 
  ON logistics_shipments(vendor_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------
-- 2) جدول أنواع مصاريف الشحنات (مرتبط بشجرة الحسابات)
-- ---------------------------------------------

CREATE TABLE IF NOT EXISTS shipment_expense_types (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  
  code VARCHAR(30) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  
  -- ربط بشجرة الحسابات
  default_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  account_number VARCHAR(50), -- رقم الحساب من شجرة الحسابات
  
  -- تصنيف المصروف
  category VARCHAR(50), -- customs, port, clearance, transport, storage, delay, other
  
  -- طريقة التوزيع الافتراضية
  default_distribution_method VARCHAR(20) DEFAULT 'WEIGHT', -- WEIGHT, QTY, VALUE, EQUAL
  
  is_active BOOLEAN DEFAULT TRUE,
  requires_approval BOOLEAN DEFAULT FALSE,
  
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_shipment_expense_types_company 
  ON shipment_expense_types(company_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shipment_expense_types_account 
  ON shipment_expense_types(default_account_id);

-- إدخال أنواع المصاريف من الصورة المرفقة
INSERT INTO shipment_expense_types (
  company_id, code, name_en, name_ar, account_number, category, default_distribution_method
) VALUES
  (NULL, 'EXP_001', 'General Shipping Expenses / Agency Dependent / Insurance & Others', 'مصاريف اعتماد ومستندي / ضمان بنكي / تحصيل / مدينة أخرى', '11510100003-8001', 'customs', 'VALUE'),
  (NULL, 'EXP_002', 'Port Insurance / Carrier Insurance', 'تأمين حمولة / تأمين بحري', '11510100003-8002', 'port', 'VALUE'),
  (NULL, 'EXP_003', 'Unloading Charges', 'رسوم شحن بحري', '11510100003-8003', 'port', 'WEIGHT'),
  (NULL, 'EXP_004', 'Immediate Delivery Fees', 'رسوم آذن تسليم', '11510100003-8004', 'clearance', 'EQUAL'),
  (NULL, 'EXP_005', 'Customs Clearance Statement', 'رسوم بيان جمركي', '11510100003-8005', 'customs', 'VALUE'),
  (NULL, 'EXP_006', 'Receipts Fees', 'رسوم إيصالات', '11510100003-8006', 'clearance', 'EQUAL'),
  (NULL, 'EXP_007', 'Outgoing Processing Fees', 'رسوم مواجة', '11510100003-8007', 'clearance', 'EQUAL'),
  (NULL, 'EXP_008', 'Tax & Stamping Fees', 'رسوم ضريبة', '11510100003-8008', 'customs', 'VALUE'),
  (NULL, 'EXP_009', 'Customs Accounting Fees', 'رسوم محاسبة جمركية', '11510100003-8009', 'customs', 'VALUE'),
  (NULL, 'EXP_010', 'Late Receipt of Containers Penalty', 'رسوم تأخير استلام الحاويات', '11510100003-8010', 'delay', 'EQUAL'),
  (NULL, 'EXP_011', 'Customs Clearance Fees', 'رسوم تخليص جمركي', '11510100003-8011', 'clearance', 'EQUAL'),
  (NULL, 'EXP_012', 'Transport Fees', 'رسوم نقل', '11510100003-8012', 'transport', 'WEIGHT'),
  (NULL, 'EXP_013', 'Loading & Unloading Fees', 'رسوم تحميل وتنزيل', '11510100003-8013', 'transport', 'WEIGHT'),
  (NULL, 'EXP_014', 'Inspection & Examination Fees', 'رسوم فحص عينات', '11510100003-8014', 'customs', 'EQUAL'),
  (NULL, 'EXP_015', 'Import Certificate / Required Certificate', 'رسوم شهادة صابر / شهادة مطلوبة', '11510100003-8015', 'customs', 'VALUE'),
  (NULL, 'EXP_016', 'Late Shipment Unloading Penalty', 'رسوم تأخير إرجاع الحاويات', '11510100003-8016', 'delay', 'EQUAL'),
  (NULL, 'EXP_017', 'Rent / Storage / Cleaning Fees', 'كراية بليانيت / بطاقة صابر', '11510100003-8017', 'storage', 'EQUAL')
ON CONFLICT (company_id, code) DO NOTHING;

-- ---------------------------------------------
-- 3) جدول مصاريف الشحنات (shipment_expenses)
-- ---------------------------------------------

CREATE TABLE IF NOT EXISTS shipment_expenses (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- ربط إجباري بالشحنة
  shipment_id INTEGER NOT NULL REFERENCES logistics_shipments(id) ON DELETE RESTRICT,
  
  -- ربط تلقائي بالمشروع (من الشحنة)
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  
  -- نوع المصروف
  expense_type_id INTEGER NOT NULL REFERENCES shipment_expense_types(id) ON DELETE RESTRICT,
  
  -- البيانات المالية
  amount DECIMAL(18, 4) NOT NULL,
  currency_id INTEGER NOT NULL REFERENCES currencies(id),
  exchange_rate DECIMAL(18, 6) NOT NULL DEFAULT 1,
  amount_local DECIMAL(18, 4) NOT NULL, -- بالعملة المحلية
  
  -- طريقة التوزيع
  distribution_method VARCHAR(20) NOT NULL DEFAULT 'WEIGHT', -- WEIGHT, QTY, VALUE, EQUAL
  
  -- الحساب المحاسبي
  debit_account_id INTEGER REFERENCES accounts(id),
  
  -- بيانات إضافية
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number VARCHAR(100),
  description TEXT,
  notes TEXT,
  
  -- حالة الاعتماد
  approval_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  
  -- حالة الترحيل
  posted BOOLEAN DEFAULT FALSE,
  posted_at TIMESTAMP,
  journal_entry_id INTEGER,
  
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  CONSTRAINT chk_shipment_expenses_amount CHECK (amount > 0),
  CONSTRAINT chk_shipment_expenses_rate CHECK (exchange_rate > 0),
  CONSTRAINT chk_shipment_expenses_no_edit_after_post CHECK (
    posted = false OR (updated_at = created_at)
  )
);

CREATE INDEX IF NOT EXISTS idx_shipment_expenses_company 
  ON shipment_expenses(company_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shipment_expenses_shipment 
  ON shipment_expenses(shipment_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shipment_expenses_project 
  ON shipment_expenses(project_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shipment_expenses_type 
  ON shipment_expenses(expense_type_id);

CREATE INDEX IF NOT EXISTS idx_shipment_expenses_posted 
  ON shipment_expenses(posted, shipment_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------
-- 4) توزيع المصاريف على الأصناف
-- ---------------------------------------------

CREATE TABLE IF NOT EXISTS shipment_expense_distributions (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  shipment_expense_id INTEGER NOT NULL REFERENCES shipment_expenses(id) ON DELETE CASCADE,
  shipment_item_id INTEGER NOT NULL REFERENCES logistics_shipment_items(id) ON DELETE CASCADE,
  
  -- المبلغ الموزع على هذا الصنف
  allocated_amount DECIMAL(18, 4) NOT NULL,
  
  -- أساس التوزيع
  distribution_base DECIMAL(18, 4), -- الوزن أو الكمية أو القيمة
  distribution_percentage DECIMAL(5, 2), -- النسبة المئوية
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT chk_shipment_expense_dist_amount CHECK (allocated_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_shipment_expense_dist_expense 
  ON shipment_expense_distributions(shipment_expense_id);

CREATE INDEX IF NOT EXISTS idx_shipment_expense_dist_item 
  ON shipment_expense_distributions(shipment_item_id);

-- ---------------------------------------------
-- 5) دالة توزيع المصاريف تلقائياً
-- ---------------------------------------------

CREATE OR REPLACE FUNCTION distribute_shipment_expense(
  p_expense_id INTEGER
) RETURNS void AS $$
DECLARE
  v_expense RECORD;
  v_item RECORD;
  v_total_base DECIMAL(18, 4);
  v_allocated DECIMAL(18, 4);
BEGIN
  -- جلب بيانات المصروف
  SELECT * INTO v_expense 
  FROM shipment_expenses 
  WHERE id = p_expense_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;
  
  -- حذف التوزيع القديم
  DELETE FROM shipment_expense_distributions 
  WHERE shipment_expense_id = p_expense_id;
  
  -- حساب المجموع الكلي حسب طريقة التوزيع
  IF v_expense.distribution_method = 'WEIGHT' THEN
    SELECT COALESCE(SUM(si.quantity * COALESCE(i.weight, 1)), 0) INTO v_total_base
    FROM logistics_shipment_items si
    LEFT JOIN items i ON i.id = si.item_id
    WHERE si.shipment_id = v_expense.shipment_id AND si.deleted_at IS NULL;
    
  ELSIF v_expense.distribution_method = 'QTY' THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_total_base
    FROM logistics_shipment_items
    WHERE shipment_id = v_expense.shipment_id AND deleted_at IS NULL;
    
  ELSIF v_expense.distribution_method = 'VALUE' THEN
    SELECT COALESCE(SUM(quantity * unit_cost), 0) INTO v_total_base
    FROM logistics_shipment_items
    WHERE shipment_id = v_expense.shipment_id AND deleted_at IS NULL;
    
  ELSE -- EQUAL
    SELECT COUNT(*) INTO v_total_base
    FROM logistics_shipment_items
    WHERE shipment_id = v_expense.shipment_id AND deleted_at IS NULL;
  END IF;
  
  IF v_total_base = 0 THEN
    RETURN; -- لا يوجد أصناف للتوزيع عليها
  END IF;
  
  -- توزيع المصروف على الأصناف
  FOR v_item IN 
    SELECT si.id, si.quantity, si.unit_cost, COALESCE(i.weight, 1) as weight
    FROM logistics_shipment_items si
    LEFT JOIN items i ON i.id = si.item_id
    WHERE si.shipment_id = v_expense.shipment_id AND si.deleted_at IS NULL
  LOOP
    -- حساب أساس التوزيع لهذا الصنف
    IF v_expense.distribution_method = 'WEIGHT' THEN
      v_allocated := (v_item.quantity * v_item.weight / v_total_base) * v_expense.amount_local;
    ELSIF v_expense.distribution_method = 'QTY' THEN
      v_allocated := (v_item.quantity / v_total_base) * v_expense.amount_local;
    ELSIF v_expense.distribution_method = 'VALUE' THEN
      v_allocated := ((v_item.quantity * v_item.unit_cost) / v_total_base) * v_expense.amount_local;
    ELSE -- EQUAL
      v_allocated := v_expense.amount_local / v_total_base;
    END IF;
    
    -- إدراج التوزيع
    INSERT INTO shipment_expense_distributions (
      company_id, shipment_expense_id, shipment_item_id, 
      allocated_amount, distribution_percentage
    ) VALUES (
      v_expense.company_id, p_expense_id, v_item.id,
      v_allocated, (v_allocated / v_expense.amount_local * 100)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------
-- 6) Trigger لتوزيع المصروف تلقائياً عند الإنشاء/التعديل
-- ---------------------------------------------

CREATE OR REPLACE FUNCTION trigger_distribute_shipment_expense()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.posted = false THEN
    PERFORM distribute_shipment_expense(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_shipment_expense_insert
AFTER INSERT ON shipment_expenses
FOR EACH ROW
EXECUTE FUNCTION trigger_distribute_shipment_expense();

CREATE TRIGGER trg_after_shipment_expense_update
AFTER UPDATE ON shipment_expenses
FOR EACH ROW
WHEN (OLD.amount_local IS DISTINCT FROM NEW.amount_local 
      OR OLD.distribution_method IS DISTINCT FROM NEW.distribution_method)
EXECUTE FUNCTION trigger_distribute_shipment_expense();

-- ---------------------------------------------
-- 7) View: تقرير الشحنات الواردة الشامل
-- ---------------------------------------------

CREATE OR REPLACE VIEW vw_inbound_shipment_report AS
SELECT 
  -- معلومات الشحنة
  ls.id as shipment_id,
  ls.shipment_number,
  ls.company_id,
  
  -- المشروع (إجباري)
  ls.project_id,
  p.code as project_code,
  p.name as project_name,
  
  -- أمر الشراء (اختياري)
  ls.purchase_order_id,
  po.order_number as po_number,
  
  -- المورد
  ls.vendor_id,
  v.name as vendor_name,
  v.code as vendor_code,
  
  -- بيانات الشحن
  ls.bl_no,
  ls.awb_no,
  ls.incoterm,
  ls.expected_arrival_date,
  ls.stage_code,
  ls.status_code,
  
  -- الموانئ
  origin.name as origin_port,
  dest.name as destination_port,
  
  -- الحالة
  ls.locked_at,
  ls.cancelled_at,
  
  -- إجماليات الأصناف
  (SELECT COUNT(*) FROM logistics_shipment_items lsi 
   WHERE lsi.shipment_id = ls.id AND lsi.deleted_at IS NULL) as items_count,
  (SELECT COALESCE(SUM(quantity), 0) FROM logistics_shipment_items lsi 
   WHERE lsi.shipment_id = ls.id AND lsi.deleted_at IS NULL) as total_quantity,
  (SELECT COALESCE(SUM(quantity * unit_cost), 0) FROM logistics_shipment_items lsi 
   WHERE lsi.shipment_id = ls.id AND lsi.deleted_at IS NULL) as items_total_value,
  
  -- إجماليات المصاريف
  (SELECT COALESCE(SUM(amount_local), 0) FROM shipment_expenses se 
   WHERE se.shipment_id = ls.id AND se.deleted_at IS NULL) as total_expenses,
  (SELECT COALESCE(SUM(amount_local), 0) FROM shipment_expenses se 
   WHERE se.shipment_id = ls.id AND se.posted = true AND se.deleted_at IS NULL) as posted_expenses,
  (SELECT COALESCE(SUM(amount_local), 0) FROM shipment_expenses se 
   WHERE se.shipment_id = ls.id AND se.posted = false AND se.deleted_at IS NULL) as pending_expenses,
  
  -- المدفوعات (سيتم إضافة shipment_id لجدول vendor_payments لاحقاً)
  -- (SELECT COALESCE(SUM(payment_amount), 0) FROM vendor_payments vp 
  --  WHERE vp.shipment_id = ls.id AND vp.deleted_at IS NULL) as total_payments,
  0 as total_payments,
  
  -- التكلفة النهائية
  (SELECT COALESCE(SUM(quantity * unit_cost), 0) FROM logistics_shipment_items lsi 
   WHERE lsi.shipment_id = ls.id AND lsi.deleted_at IS NULL) +
  (SELECT COALESCE(SUM(amount_local), 0) FROM shipment_expenses se 
   WHERE se.shipment_id = ls.id AND se.deleted_at IS NULL) as final_cost,
  
  ls.created_at,
  ls.updated_at
  
FROM logistics_shipments ls
LEFT JOIN projects p ON p.id = ls.project_id
LEFT JOIN purchase_orders po ON po.id = ls.purchase_order_id
LEFT JOIN vendors v ON v.id = ls.vendor_id
LEFT JOIN cities origin ON origin.id = ls.origin_location_id
LEFT JOIN cities dest ON dest.id = ls.destination_location_id
WHERE ls.deleted_at IS NULL;

-- ---------------------------------------------
-- 8) قيود منع التعديل/الحذف
-- ---------------------------------------------

-- منع حذف مشروع مرتبط بشحنة
CREATE OR REPLACE FUNCTION prevent_project_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM logistics_shipments 
    WHERE project_id = OLD.id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot delete project: linked to active shipments';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_before_project_delete
BEFORE DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION prevent_project_deletion();

-- منع تعديل شحنة مقفلة
CREATE OR REPLACE FUNCTION prevent_locked_shipment_edit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot modify locked shipment';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_before_shipment_update
BEFORE UPDATE ON logistics_shipments
FOR EACH ROW
WHEN (OLD.locked_at IS NOT NULL)
EXECUTE FUNCTION prevent_locked_shipment_edit();

-- منع تعديل مصروف مرحّل
CREATE OR REPLACE FUNCTION prevent_posted_expense_edit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.posted = true THEN
    RAISE EXCEPTION 'Cannot modify posted expense';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_before_expense_update
BEFORE UPDATE ON shipment_expenses
FOR EACH ROW
WHEN (OLD.posted = true)
EXECUTE FUNCTION prevent_posted_expense_edit();

-- ---------------------------------------------
-- 9) Permissions
-- ---------------------------------------------

INSERT INTO permissions (permission_code, resource, action, description, module, name_en, name_ar) VALUES
  ('shipments:expenses:view', 'shipments:expenses', 'view', 'View shipment expenses', 'Logistics', 'View Shipment Expenses', 'عرض مصاريف الشحنات'),
  ('shipments:expenses:create', 'shipments:expenses', 'create', 'Create shipment expenses', 'Logistics', 'Create Shipment Expenses', 'إنشاء مصاريف الشحنات'),
  ('shipments:expenses:update', 'shipments:expenses', 'update', 'Update shipment expenses', 'Logistics', 'Update Shipment Expenses', 'تعديل مصاريف الشحنات'),
  ('shipments:expenses:delete', 'shipments:expenses', 'delete', 'Delete shipment expenses', 'Logistics', 'Delete Shipment Expenses', 'حذف مصاريف الشحنات'),
  ('shipments:expenses:approve', 'shipments:expenses', 'approve', 'Approve shipment expenses', 'Logistics', 'Approve Shipment Expenses', 'اعتماد مصاريف الشحنات'),
  ('shipments:expenses:post', 'shipments:expenses', 'post', 'Post shipment expenses to journal', 'Logistics', 'Post Shipment Expenses', 'ترحيل مصاريف الشحنات'),
  ('shipments:lock', 'shipments', 'lock', 'Lock/unlock shipments', 'Logistics', 'Lock Shipments', 'إقفال الشحنات')
ON CONFLICT (permission_code) DO NOTHING;

COMMIT;
