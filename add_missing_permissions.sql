-- =====================================================
-- إضافة الصلاحيات الناقصة للقوائم
-- Missing Menu Permissions - SLMS
-- =====================================================

-- Dashboard Statistics
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES ('dashboard:statistics:view', 'dashboard', 'statistics:view', 'View dashboard statistics', 'عرض إحصائيات لوحة التحكم')
ON CONFLICT (permission_code) DO NOTHING;

-- Reports - Reference Data
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('reports:reference_data:view', 'reports', 'reference_data:view', 'View reference data reports', 'عرض تقارير البيانات المرجعية'),
  ('reports:reference_data:export', 'reports', 'reference_data:export', 'Export reference data reports', 'تصدير تقارير البيانات المرجعية')
ON CONFLICT (permission_code) DO NOTHING;

-- Reports - Warehouses
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('reports:warehouses:view', 'reports', 'warehouses:view', 'View warehouse reports', 'عرض تقارير المستودعات'),
  ('reports:warehouses:export', 'reports', 'warehouses:export', 'Export warehouse reports', 'تصدير تقارير المستودعات')
ON CONFLICT (permission_code) DO NOTHING;

-- Reports - Quality
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('reports:quality:view', 'reports', 'quality:view', 'View quality reports', 'عرض تقارير الجودة'),
  ('reports:quality:export', 'reports', 'quality:export', 'Export quality reports', 'تصدير تقارير الجودة')
ON CONFLICT (permission_code) DO NOTHING;

-- Reports - Risks
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('reports:risks:view', 'reports', 'risks:view', 'View risk reports', 'عرض تقارير المخاطر'),
  ('reports:risks:export', 'reports', 'risks:export', 'Export risk reports', 'تصدير تقارير المخاطر')
ON CONFLICT (permission_code) DO NOTHING;

-- Reports - Security
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('reports:security:view', 'reports', 'security:view', 'View security reports', 'عرض تقارير الأمان'),
  ('reports:security:export', 'reports', 'security:export', 'Export security reports', 'تصدير تقارير الأمان')
ON CONFLICT (permission_code) DO NOTHING;

-- Reports - Shipment Costs
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('reports:shipment_costs:view', 'reports', 'shipment_costs:view', 'View shipment cost reports', 'عرض تقارير تكاليف الشحن'),
  ('reports:shipment_costs:export', 'reports', 'shipment_costs:export', 'Export shipment cost reports', 'تصدير تقارير تكاليف الشحن')
ON CONFLICT (permission_code) DO NOTHING;

-- Reports - Item Landed Cost
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('reports:item_landed_cost:view', 'reports', 'item_landed_cost:view', 'View item landed cost reports', 'عرض تقارير التكلفة الهابطة للصنف'),
  ('reports:item_landed_cost:export', 'reports', 'item_landed_cost:export', 'Export item landed cost reports', 'تصدير تقارير التكلفة الهابطة للصنف')
ON CONFLICT (permission_code) DO NOTHING;

-- Reports - Shipment Delays
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('reports:shipment_delays:view', 'reports', 'shipment_delays:view', 'View shipment delay reports', 'عرض تقارير تأخير الشحنات'),
  ('reports:shipment_delays:export', 'reports', 'shipment_delays:export', 'Export shipment delay reports', 'تصدير تقارير تأخير الشحنات')
ON CONFLICT (permission_code) DO NOTHING;

-- Shipments (Core)
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('shipments:view', 'shipments', 'view', 'View shipments', 'عرض الشحنات'),
  ('shipments:create', 'shipments', 'create', 'Create shipments', 'إنشاء الشحنات'),
  ('shipments:edit', 'shipments', 'edit', 'Edit shipments', 'تعديل الشحنات'),
  ('shipments:delete', 'shipments', 'delete', 'Delete shipments', 'حذف الشحنات')
ON CONFLICT (permission_code) DO NOTHING;

-- Expenses (Core)
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('expenses:view', 'expenses', 'view', 'View expenses', 'عرض المصروفات'),
  ('expenses:create', 'expenses', 'create', 'Create expenses', 'إنشاء المصروفات'),
  ('expenses:edit', 'expenses', 'edit', 'Edit expenses', 'تعديل المصروفات'),
  ('expenses:delete', 'expenses', 'delete', 'Delete expenses', 'حذف المصروفات')
ON CONFLICT (permission_code) DO NOTHING;

-- Warehouses (Core)
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('warehouses:view', 'warehouses', 'view', 'View warehouses', 'عرض المستودعات'),
  ('warehouses:create', 'warehouses', 'create', 'Create warehouses', 'إنشاء المستودعات'),
  ('warehouses:edit', 'warehouses', 'edit', 'Edit warehouses', 'تعديل المستودعات'),
  ('warehouses:delete', 'warehouses', 'delete', 'Delete warehouses', 'حذف المستودعات')
ON CONFLICT (permission_code) DO NOTHING;

-- Suppliers (Core)
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('suppliers:view', 'suppliers', 'view', 'View suppliers', 'عرض الموردين'),
  ('suppliers:create', 'suppliers', 'create', 'Create suppliers', 'إنشاء الموردين'),
  ('suppliers:edit', 'suppliers', 'edit', 'Edit suppliers', 'تعديل الموردين'),
  ('suppliers:delete', 'suppliers', 'delete', 'Delete suppliers', 'حذف الموردين')
ON CONFLICT (permission_code) DO NOTHING;

-- Users (Core)
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('users:view', 'users', 'view', 'View users', 'عرض المستخدمين'),
  ('users:create', 'users', 'create', 'Create users', 'إنشاء المستخدمين'),
  ('users:edit', 'users', 'edit', 'Edit users', 'تعديل المستخدمين'),
  ('users:delete', 'users', 'delete', 'Delete users', 'حذف المستخدمين'),
  ('users:manage_status', 'users', 'manage_status', 'Manage user status', 'إدارة حالة المستخدمين'),
  ('users:assign_roles', 'users', 'assign_roles', 'Assign roles to users', 'تعيين الأدوار للمستخدمين')
ON CONFLICT (permission_code) DO NOTHING;

-- Roles (Core)
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('roles:view', 'roles', 'view', 'View roles', 'عرض الأدوار'),
  ('roles:create', 'roles', 'create', 'Create roles', 'إنشاء الأدوار'),
  ('roles:edit', 'roles', 'edit', 'Edit roles', 'تعديل الأدوار'),
  ('roles:delete', 'roles', 'delete', 'Delete roles', 'حذف الأدوار')
ON CONFLICT (permission_code) DO NOTHING;

-- Accounting Reports
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('accounting:reports:trial-balance:view', 'accounting', 'reports:trial-balance:view', 'View trial balance report', 'عرض تقرير ميزان المراجعة'),
  ('accounting:reports:general-ledger:view', 'accounting', 'reports:general-ledger:view', 'View general ledger report', 'عرض تقرير دفتر الأستاذ'),
  ('accounting:reports:general-ledger:export', 'accounting', 'reports:general-ledger:export', 'Export general ledger report', 'تصدير تقرير دفتر الأستاذ'),
  ('accounting:reports:income-statement:view', 'accounting', 'reports:income-statement:view', 'View income statement', 'عرض قائمة الدخل'),
  ('accounting:reports:income-statement:export', 'accounting', 'reports:income-statement:export', 'Export income statement', 'تصدير قائمة الدخل'),
  ('accounting:reports:balance-sheet:view', 'accounting', 'reports:balance-sheet:view', 'View balance sheet', 'عرض الميزانية العمومية'),
  ('accounting:reports:balance-sheet:export', 'accounting', 'reports:balance-sheet:export', 'Export balance sheet', 'تصدير الميزانية العمومية'),
  ('accounting:reports:cash-flow:view', 'accounting', 'reports:cash-flow:view', 'View cash flow statement', 'عرض قائمة التدفقات النقدية'),
  ('accounting:reports:cash-flow:export', 'accounting', 'reports:cash-flow:export', 'Export cash flow statement', 'تصدير قائمة التدفقات النقدية')
ON CONFLICT (permission_code) DO NOTHING;

-- Accounting Sub-Ledgers
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('accounting:prepaid_expenses:view', 'accounting', 'prepaid_expenses:view', 'View prepaid expenses', 'عرض المصروفات المدفوعة مقدماً'),
  ('accounting:prepaid_expenses:create', 'accounting', 'prepaid_expenses:create', 'Create prepaid expenses', 'إنشاء المصروفات المدفوعة مقدماً'),
  ('accounting:prepaid_expenses:edit', 'accounting', 'prepaid_expenses:edit', 'Edit prepaid expenses', 'تعديل المصروفات المدفوعة مقدماً'),
  ('accounting:prepaid_expenses:delete', 'accounting', 'prepaid_expenses:delete', 'Delete prepaid expenses', 'حذف المصروفات المدفوعة مقدماً'),
  ('accounting:deferred_revenue:view', 'accounting', 'deferred_revenue:view', 'View deferred revenue', 'عرض الإيرادات المؤجلة'),
  ('accounting:deferred_revenue:create', 'accounting', 'deferred_revenue:create', 'Create deferred revenue', 'إنشاء الإيرادات المؤجلة'),
  ('accounting:deferred_revenue:edit', 'accounting', 'deferred_revenue:edit', 'Edit deferred revenue', 'تعديل الإيرادات المؤجلة'),
  ('accounting:deferred_revenue:delete', 'accounting', 'deferred_revenue:delete', 'Delete deferred revenue', 'حذف الإيرادات المؤجلة'),
  ('accounting:cheques_due:view', 'accounting', 'cheques_due:view', 'View due cheques', 'عرض الشيكات المستحقة'),
  ('accounting:cheques_due:create', 'accounting', 'cheques_due:create', 'Create due cheques', 'إنشاء الشيكات المستحقة'),
  ('accounting:cheques_due:edit', 'accounting', 'cheques_due:edit', 'Edit due cheques', 'تعديل الشيكات المستحقة'),
  ('accounting:cheques_due:delete', 'accounting', 'cheques_due:delete', 'Delete due cheques', 'حذف الشيكات المستحقة'),
  ('accounting:customers_ledger:view', 'accounting', 'customers_ledger:view', 'View customers ledger', 'عرض دفتر أستاذ العملاء'),
  ('accounting:customers_ledger:export', 'accounting', 'customers_ledger:export', 'Export customers ledger', 'تصدير دفتر أستاذ العملاء'),
  ('accounting:inventory_ledger:view', 'accounting', 'inventory_ledger:view', 'View inventory ledger', 'عرض دفتر أستاذ المخزون'),
  ('accounting:inventory_ledger:export', 'accounting', 'inventory_ledger:export', 'Export inventory ledger', 'تصدير دفتر أستاذ المخزون'),
  ('accounting:default_accounts:view', 'accounting', 'default_accounts:view', 'View default accounts', 'عرض الحسابات الافتراضية'),
  ('accounting:default_accounts:manage', 'accounting', 'default_accounts:manage', 'Manage default accounts', 'إدارة الحسابات الافتراضية')
ON CONFLICT (permission_code) DO NOTHING;

-- Customs & Ports
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('customs_offices:view', 'customs_offices', 'view', 'View customs offices', 'عرض مكاتب الجمارك'),
  ('customs_offices:create', 'customs_offices', 'create', 'Create customs offices', 'إنشاء مكاتب الجمارك'),
  ('customs_offices:edit', 'customs_offices', 'edit', 'Edit customs offices', 'تعديل مكاتب الجمارك'),
  ('customs_offices:delete', 'customs_offices', 'delete', 'Delete customs offices', 'حذف مكاتب الجمارك'),
  ('customs_fee_categories:view', 'customs_fee_categories', 'view', 'View customs fee categories', 'عرض فئات الرسوم الجمركية'),
  ('customs_fee_categories:create', 'customs_fee_categories', 'create', 'Create customs fee categories', 'إنشاء فئات الرسوم الجمركية'),
  ('customs_fee_categories:edit', 'customs_fee_categories', 'edit', 'Edit customs fee categories', 'تعديل فئات الرسوم الجمركية'),
  ('customs_fee_categories:delete', 'customs_fee_categories', 'delete', 'Delete customs fee categories', 'حذف فئات الرسوم الجمركية'),
  ('customs_duties:view', 'customs_duties', 'view', 'View customs duties', 'عرض الرسوم الجمركية'),
  ('customs_duties:create', 'customs_duties', 'create', 'Create customs duties', 'إنشاء الرسوم الجمركية'),
  ('customs_duties:edit', 'customs_duties', 'edit', 'Edit customs duties', 'تعديل الرسوم الجمركية'),
  ('customs_duties:delete', 'customs_duties', 'delete', 'Delete customs duties', 'حذف الرسوم الجمركية'),
  ('ports:view', 'ports', 'view', 'View ports', 'عرض الموانئ'),
  ('ports:create', 'ports', 'create', 'Create ports', 'إنشاء الموانئ'),
  ('ports:edit', 'ports', 'edit', 'Edit ports', 'تعديل الموانئ'),
  ('ports:delete', 'ports', 'delete', 'Delete ports', 'حذف الموانئ')
ON CONFLICT (permission_code) DO NOTHING;

-- Status Types
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('clearance_status:view', 'clearance_status', 'view', 'View clearance status', 'عرض حالات التخليص'),
  ('clearance_status:create', 'clearance_status', 'create', 'Create clearance status', 'إنشاء حالات التخليص'),
  ('clearance_status:edit', 'clearance_status', 'edit', 'Edit clearance status', 'تعديل حالات التخليص'),
  ('clearance_status:delete', 'clearance_status', 'delete', 'Delete clearance status', 'حذف حالات التخليص'),
  ('claim_status:view', 'claim_status', 'view', 'View claim status', 'عرض حالات المطالبات'),
  ('claim_status:create', 'claim_status', 'create', 'Create claim status', 'إنشاء حالات المطالبات'),
  ('claim_status:edit', 'claim_status', 'edit', 'Edit claim status', 'تعديل حالات المطالبات'),
  ('claim_status:delete', 'claim_status', 'delete', 'Delete claim status', 'حذف حالات المطالبات')
ON CONFLICT (permission_code) DO NOTHING;

-- Payment Terms
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('payment_terms:view', 'payment_terms', 'view', 'View payment terms', 'عرض شروط الدفع'),
  ('payment_terms:create', 'payment_terms', 'create', 'Create payment terms', 'إنشاء شروط الدفع'),
  ('payment_terms:edit', 'payment_terms', 'edit', 'Edit payment terms', 'تعديل شروط الدفع'),
  ('payment_terms:delete', 'payment_terms', 'delete', 'Delete payment terms', 'حذف شروط الدفع')
ON CONFLICT (permission_code) DO NOTHING;

-- Customer Groups
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('customer_groups:view', 'customer_groups', 'view', 'View customer groups', 'عرض مجموعات العملاء'),
  ('customer_groups:create', 'customer_groups', 'create', 'Create customer groups', 'إنشاء مجموعات العملاء'),
  ('customer_groups:edit', 'customer_groups', 'edit', 'Edit customer groups', 'تعديل مجموعات العملاء'),
  ('customer_groups:delete', 'customer_groups', 'delete', 'Delete customer groups', 'حذف مجموعات العملاء')
ON CONFLICT (permission_code) DO NOTHING;

-- Harvest Schedules
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('harvest_schedules:view', 'harvest_schedules', 'view', 'View harvest schedules', 'عرض جداول الحصاد'),
  ('harvest_schedules:create', 'harvest_schedules', 'create', 'Create harvest schedules', 'إنشاء جداول الحصاد'),
  ('harvest_schedules:edit', 'harvest_schedules', 'edit', 'Edit harvest schedules', 'تعديل جداول الحصاد'),
  ('harvest_schedules:delete', 'harvest_schedules', 'delete', 'Delete harvest schedules', 'حذف جداول الحصاد')
ON CONFLICT (permission_code) DO NOTHING;

-- Quality Management
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('quality:view', 'quality', 'view', 'View quality management', 'عرض إدارة الجودة'),
  ('quality:create', 'quality', 'create', 'Create quality records', 'إنشاء سجلات الجودة'),
  ('quality:edit', 'quality', 'edit', 'Edit quality records', 'تعديل سجلات الجودة'),
  ('quality:delete', 'quality', 'delete', 'Delete quality records', 'حذف سجلات الجودة'),
  ('quality:approved_vendors:view', 'quality', 'approved_vendors:view', 'View approved vendors', 'عرض الموردين المعتمدين'),
  ('quality:approved_vendors:create', 'quality', 'approved_vendors:create', 'Create approved vendors', 'إنشاء الموردين المعتمدين'),
  ('quality:approved_vendors:edit', 'quality', 'approved_vendors:edit', 'Edit approved vendors', 'تعديل الموردين المعتمدين'),
  ('quality:approved_vendors:delete', 'quality', 'approved_vendors:delete', 'Delete approved vendors', 'حذف الموردين المعتمدين')
ON CONFLICT (permission_code) DO NOTHING;

-- Risk Management
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('risks:view', 'risks', 'view', 'View risks', 'عرض المخاطر'),
  ('risks:create', 'risks', 'create', 'Create risks', 'إنشاء المخاطر'),
  ('risks:edit', 'risks', 'edit', 'Edit risks', 'تعديل المخاطر'),
  ('risks:delete', 'risks', 'delete', 'Delete risks', 'حذف المخاطر'),
  ('risks:insurance_documents:view', 'risks', 'insurance_documents:view', 'View insurance documents', 'عرض وثائق التأمين'),
  ('risks:insurance_documents:create', 'risks', 'insurance_documents:create', 'Create insurance documents', 'إنشاء وثائق التأمين'),
  ('risks:insurance_documents:edit', 'risks', 'insurance_documents:edit', 'Edit insurance documents', 'تعديل وثائق التأمين'),
  ('risks:insurance_documents:delete', 'risks', 'insurance_documents:delete', 'Delete insurance documents', 'حذف وثائق التأمين')
ON CONFLICT (permission_code) DO NOTHING;

-- Procurement
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('procurement:view', 'procurement', 'view', 'View procurement', 'عرض المشتريات'),
  ('procurement:purchase_orders:view', 'procurement', 'purchase_orders:view', 'View purchase orders', 'عرض أوامر الشراء'),
  ('procurement:purchase_orders:create', 'procurement', 'purchase_orders:create', 'Create purchase orders', 'إنشاء أوامر الشراء'),
  ('procurement:purchase_orders:edit', 'procurement', 'purchase_orders:edit', 'Edit purchase orders', 'تعديل أوامر الشراء'),
  ('procurement:purchase_orders:delete', 'procurement', 'purchase_orders:delete', 'Delete purchase orders', 'حذف أوامر الشراء'),
  ('procurement:purchase_orders:approve', 'procurement', 'purchase_orders:approve', 'Approve purchase orders', 'اعتماد أوامر الشراء'),
  ('procurement:purchase_invoices:view', 'procurement', 'purchase_invoices:view', 'View purchase invoices', 'عرض فواتير الشراء'),
  ('procurement:purchase_invoices:create', 'procurement', 'purchase_invoices:create', 'Create purchase invoices', 'إنشاء فواتير الشراء'),
  ('procurement:purchase_invoices:edit', 'procurement', 'purchase_invoices:edit', 'Edit purchase invoices', 'تعديل فواتير الشراء'),
  ('procurement:purchase_invoices:delete', 'procurement', 'purchase_invoices:delete', 'Delete purchase invoices', 'حذف فواتير الشراء'),
  ('procurement:purchase_invoices:post', 'procurement', 'purchase_invoices:post', 'Post purchase invoices', 'ترحيل فواتير الشراء'),
  ('procurement:vendor_contracts:view', 'procurement', 'vendor_contracts:view', 'View vendor contracts', 'عرض عقود الموردين'),
  ('procurement:vendor_contracts:create', 'procurement', 'vendor_contracts:create', 'Create vendor contracts', 'إنشاء عقود الموردين'),
  ('procurement:vendor_contracts:edit', 'procurement', 'vendor_contracts:edit', 'Edit vendor contracts', 'تعديل عقود الموردين'),
  ('procurement:vendor_contracts:delete', 'procurement', 'vendor_contracts:delete', 'Delete vendor contracts', 'حذف عقود الموردين'),
  ('procurement:payments:view', 'procurement', 'payments:view', 'View procurement payments', 'عرض مدفوعات المشتريات'),
  ('procurement:payments:create', 'procurement', 'payments:create', 'Create procurement payments', 'إنشاء مدفوعات المشتريات'),
  ('procurement:payments:edit', 'procurement', 'payments:edit', 'Edit procurement payments', 'تعديل مدفوعات المشتريات'),
  ('procurement:payments:delete', 'procurement', 'payments:delete', 'Delete procurement payments', 'حذف مدفوعات المشتريات'),
  ('procurement:payments:post', 'procurement', 'payments:post', 'Post procurement payments', 'ترحيل مدفوعات المشتريات'),
  ('procurement:payments:allocate', 'procurement', 'payments:allocate', 'Allocate procurement payments', 'تخصيص مدفوعات المشتريات'),
  ('procurement:reports:export', 'procurement', 'reports:export', 'Export procurement reports', 'تصدير تقارير المشتريات')
ON CONFLICT (permission_code) DO NOTHING;

-- Logistics - Shipment Alerts
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('logistics:shipment_alerts:view', 'logistics', 'shipment_alerts:view', 'View shipment alerts', 'عرض تنبيهات الشحنات'),
  ('logistics:shipment_alerts:manage', 'logistics', 'shipment_alerts:manage', 'Manage shipment alerts', 'إدارة تنبيهات الشحنات')
ON CONFLICT (permission_code) DO NOTHING;

-- Logistics - Cost Types
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('logistics:shipment_cost_types:view', 'logistics', 'shipment_cost_types:view', 'View shipment cost types', 'عرض أنواع تكاليف الشحن'),
  ('logistics:shipment_cost_types:create', 'logistics', 'shipment_cost_types:create', 'Create shipment cost types', 'إنشاء أنواع تكاليف الشحن'),
  ('logistics:shipment_cost_types:edit', 'logistics', 'shipment_cost_types:edit', 'Edit shipment cost types', 'تعديل أنواع تكاليف الشحن'),
  ('logistics:shipment_cost_types:delete', 'logistics', 'shipment_cost_types:delete', 'Delete shipment cost types', 'حذف أنواع تكاليف الشحن')
ON CONFLICT (permission_code) DO NOTHING;

-- Logistics - Landed Cost
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('logistics:landed_cost_allocation:view', 'logistics', 'landed_cost_allocation:view', 'View landed cost allocation', 'عرض توزيع التكلفة الهابطة'),
  ('logistics:landed_cost_allocation:manage', 'logistics', 'landed_cost_allocation:manage', 'Manage landed cost allocation', 'إدارة توزيع التكلفة الهابطة'),
  ('logistics:landed_cost_settings:view', 'logistics', 'landed_cost_settings:view', 'View landed cost settings', 'عرض إعدادات التكلفة الهابطة'),
  ('logistics:landed_cost_settings:manage', 'logistics', 'landed_cost_settings:manage', 'Manage landed cost settings', 'إدارة إعدادات التكلفة الهابطة'),
  ('logistics:duty_calculation:view', 'logistics', 'duty_calculation:view', 'View duty calculation', 'عرض حساب الرسوم'),
  ('logistics:duty_calculation:manage', 'logistics', 'duty_calculation:manage', 'Manage duty calculation', 'إدارة حساب الرسوم')
ON CONFLICT (permission_code) DO NOTHING;

-- System Setup & Languages
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('system_setup:view', 'system_setup', 'view', 'View system setup', 'عرض إعداد النظام'),
  ('system_setup:edit', 'system_setup', 'edit', 'Edit system setup', 'تعديل إعداد النظام'),
  ('languages:view', 'languages', 'view', 'View languages', 'عرض اللغات'),
  ('languages:create', 'languages', 'create', 'Create languages', 'إنشاء اللغات'),
  ('languages:edit', 'languages', 'edit', 'Edit languages', 'تعديل اللغات'),
  ('languages:delete', 'languages', 'delete', 'Delete languages', 'حذف اللغات')
ON CONFLICT (permission_code) DO NOTHING;

-- Help Requests
INSERT INTO permissions (permission_code, resource, action, description, description_ar)
VALUES 
  ('help_requests:view', 'help_requests', 'view', 'View help requests', 'عرض طلبات المساعدة'),
  ('help_requests:manage', 'help_requests', 'manage', 'Manage help requests', 'إدارة طلبات المساعدة')
ON CONFLICT (permission_code) DO NOTHING;

-- =====================================================
-- تعيين الصلاحيات للأدوار الأساسية
-- Assign basic permissions to Admin role
-- =====================================================

-- Get Admin role id
DO $$
DECLARE
  admin_role_id INTEGER;
  viewer_role_id INTEGER;
  manager_role_id INTEGER;
  perm_id INTEGER;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE name = 'Admin' LIMIT 1;
  SELECT id INTO viewer_role_id FROM roles WHERE name = 'Viewer' LIMIT 1;
  SELECT id INTO manager_role_id FROM roles WHERE name = 'Manager' LIMIT 1;

  -- Assign dashboard:statistics:view to all roles
  SELECT id INTO perm_id FROM permissions WHERE permission_code = 'dashboard:statistics:view';
  IF perm_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id) VALUES (admin_role_id, perm_id) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions (role_id, permission_id) VALUES (viewer_role_id, perm_id) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions (role_id, permission_id) VALUES (manager_role_id, perm_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Assign view permissions to Viewer role
  FOR perm_id IN 
    SELECT id FROM permissions WHERE permission_code LIKE '%:view' AND permission_code NOT LIKE 'users:%' AND permission_code NOT LIKE 'roles:%'
  LOOP
    IF viewer_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (viewer_role_id, perm_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Assign all new permissions to Admin role
  IF admin_role_id IS NOT NULL THEN
    FOR perm_id IN 
      SELECT id FROM permissions WHERE permission_code IN (
        'dashboard:statistics:view',
        'shipments:view', 'shipments:create', 'shipments:edit', 'shipments:delete',
        'expenses:view', 'expenses:create', 'expenses:edit', 'expenses:delete',
        'warehouses:view', 'warehouses:create', 'warehouses:edit', 'warehouses:delete',
        'suppliers:view', 'suppliers:create', 'suppliers:edit', 'suppliers:delete',
        'users:view', 'users:create', 'users:edit', 'users:delete', 'users:manage_status', 'users:assign_roles',
        'roles:view', 'roles:create', 'roles:edit', 'roles:delete',
        'quality:view', 'quality:create', 'quality:edit', 'quality:delete',
        'risks:view', 'risks:create', 'risks:edit', 'risks:delete',
        'procurement:view', 'help_requests:view', 'help_requests:manage'
      )
    LOOP
      INSERT INTO role_permissions (role_id, permission_id) VALUES (admin_role_id, perm_id) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Summary
SELECT 'Permissions added successfully!' AS status;
SELECT COUNT(*) AS total_permissions FROM permissions;
