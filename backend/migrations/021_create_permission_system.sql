-- Migration: 021_create_permission_system.sql
-- Description: Granular permission system with module-based organization
-- Date: 2025-12-22

-- =====================================================
-- PART 1: PERMISSION CATEGORIES
-- =====================================================

CREATE TABLE IF NOT EXISTS permission_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert permission categories
INSERT INTO permission_categories (code, name_en, name_ar, icon, sort_order) VALUES
    ('system', 'System Administration', 'إدارة النظام', 'cog', 1),
    ('master_data', 'Master Data', 'البيانات الرئيسية', 'database', 2),
    ('accounting', 'Accounting', 'المحاسبة', 'calculator', 3),
    ('inventory', 'Inventory', 'المخزون', 'cube', 4),
    ('sales', 'Sales', 'المبيعات', 'shopping-cart', 5),
    ('purchases', 'Purchases', 'المشتريات', 'truck', 6),
    ('logistics', 'Logistics', 'اللوجستيات', 'globe', 7),
    ('hr', 'Human Resources', 'الموارد البشرية', 'users', 8),
    ('reports', 'Reports', 'التقارير', 'chart-bar', 9)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- PART 2: ENHANCED PERMISSIONS TABLE
-- =====================================================

-- Add category reference to existing permissions if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'permissions' AND column_name = 'category_id') THEN
        ALTER TABLE permissions ADD COLUMN category_id UUID REFERENCES permission_categories(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'permissions' AND column_name = 'name_en') THEN
        ALTER TABLE permissions ADD COLUMN name_en VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'permissions' AND column_name = 'name_ar') THEN
        ALTER TABLE permissions ADD COLUMN name_ar VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'permissions' AND column_name = 'module') THEN
        ALTER TABLE permissions ADD COLUMN module VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'permissions' AND column_name = 'requires_approval') THEN
        ALTER TABLE permissions ADD COLUMN requires_approval BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'permissions' AND column_name = 'is_dangerous') THEN
        ALTER TABLE permissions ADD COLUMN is_dangerous BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- =====================================================
-- PART 3: COMPREHENSIVE PERMISSIONS
-- =====================================================

-- Function to insert permission with category
-- Uses permission_code (existing column) instead of code
CREATE OR REPLACE FUNCTION insert_permission(
    p_code VARCHAR,
    p_name_en VARCHAR,
    p_name_ar VARCHAR,
    p_category_code VARCHAR,
    p_module VARCHAR,
    p_action VARCHAR,
    p_requires_approval BOOLEAN DEFAULT FALSE,
    p_is_dangerous BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
DECLARE
    v_category_id UUID;
BEGIN
    SELECT id INTO v_category_id FROM permission_categories WHERE code = p_category_code;
    
    INSERT INTO permissions (permission_code, resource, action, description, category_id, name_en, name_ar, module, requires_approval, is_dangerous)
    VALUES (p_code, p_module, p_action, p_name_en, v_category_id, p_name_en, p_name_ar, p_module, p_requires_approval, p_is_dangerous)
    ON CONFLICT (permission_code) DO UPDATE SET
        name_en = EXCLUDED.name_en,
        name_ar = EXCLUDED.name_ar,
        category_id = EXCLUDED.category_id,
        module = EXCLUDED.module,
        requires_approval = EXCLUDED.requires_approval,
        is_dangerous = EXCLUDED.is_dangerous;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SYSTEM PERMISSIONS
-- =====================================================
SELECT insert_permission('system:settings:view', 'View System Settings', 'عرض إعدادات النظام', 'system', 'settings', 'view');
SELECT insert_permission('system:settings:edit', 'Edit System Settings', 'تعديل إعدادات النظام', 'system', 'settings', 'edit', TRUE);
SELECT insert_permission('system:users:view', 'View Users', 'عرض المستخدمين', 'system', 'users', 'view');
SELECT insert_permission('system:users:create', 'Create Users', 'إنشاء مستخدمين', 'system', 'users', 'create');
SELECT insert_permission('system:users:edit', 'Edit Users', 'تعديل المستخدمين', 'system', 'users', 'edit');
SELECT insert_permission('system:users:delete', 'Delete Users', 'حذف المستخدمين', 'system', 'users', 'delete', TRUE, TRUE);
SELECT insert_permission('system:users:activate', 'Activate/Deactivate Users', 'تفعيل/تعطيل المستخدمين', 'system', 'users', 'activate');
SELECT insert_permission('system:roles:view', 'View Roles', 'عرض الأدوار', 'system', 'roles', 'view');
SELECT insert_permission('system:roles:create', 'Create Roles', 'إنشاء أدوار', 'system', 'roles', 'create');
SELECT insert_permission('system:roles:edit', 'Edit Roles', 'تعديل الأدوار', 'system', 'roles', 'edit');
SELECT insert_permission('system:roles:delete', 'Delete Roles', 'حذف الأدوار', 'system', 'roles', 'delete', TRUE);
SELECT insert_permission('system:audit:view', 'View Audit Logs', 'عرض سجل المراجعة', 'system', 'audit', 'view');
SELECT insert_permission('system:companies:manage', 'Manage Companies', 'إدارة الشركات', 'system', 'companies', 'manage');
SELECT insert_permission('system:branches:manage', 'Manage Branches', 'إدارة الفروع', 'system', 'branches', 'manage');

-- =====================================================
-- MASTER DATA PERMISSIONS
-- =====================================================

-- Chart of Accounts
SELECT insert_permission('master:accounts:view', 'View Chart of Accounts', 'عرض دليل الحسابات', 'master_data', 'accounts', 'view');
SELECT insert_permission('master:accounts:create', 'Create Account', 'إنشاء حساب', 'master_data', 'accounts', 'create');
SELECT insert_permission('master:accounts:edit', 'Edit Account', 'تعديل حساب', 'master_data', 'accounts', 'edit');
SELECT insert_permission('master:accounts:delete', 'Delete Account', 'حذف حساب', 'master_data', 'accounts', 'delete', TRUE);

-- Cost Centers
SELECT insert_permission('master:cost_centers:view', 'View Cost Centers', 'عرض مراكز التكلفة', 'master_data', 'cost_centers', 'view');
SELECT insert_permission('master:cost_centers:create', 'Create Cost Center', 'إنشاء مركز تكلفة', 'master_data', 'cost_centers', 'create');
SELECT insert_permission('master:cost_centers:edit', 'Edit Cost Center', 'تعديل مركز تكلفة', 'master_data', 'cost_centers', 'edit');
SELECT insert_permission('master:cost_centers:delete', 'Delete Cost Center', 'حذف مركز تكلفة', 'master_data', 'cost_centers', 'delete');

-- Items
SELECT insert_permission('master:items:view', 'View Items', 'عرض الأصناف', 'master_data', 'items', 'view');
SELECT insert_permission('master:items:create', 'Create Item', 'إنشاء صنف', 'master_data', 'items', 'create');
SELECT insert_permission('master:items:edit', 'Edit Item', 'تعديل صنف', 'master_data', 'items', 'edit');
SELECT insert_permission('master:items:delete', 'Delete Item', 'حذف صنف', 'master_data', 'items', 'delete');
SELECT insert_permission('master:items:adjust_price', 'Adjust Item Prices', 'تعديل أسعار الأصناف', 'master_data', 'items', 'adjust_price');

-- Warehouses
SELECT insert_permission('master:warehouses:view', 'View Warehouses', 'عرض المستودعات', 'master_data', 'warehouses', 'view');
SELECT insert_permission('master:warehouses:create', 'Create Warehouse', 'إنشاء مستودع', 'master_data', 'warehouses', 'create');
SELECT insert_permission('master:warehouses:edit', 'Edit Warehouse', 'تعديل مستودع', 'master_data', 'warehouses', 'edit');
SELECT insert_permission('master:warehouses:delete', 'Delete Warehouse', 'حذف مستودع', 'master_data', 'warehouses', 'delete');

-- Customers
SELECT insert_permission('master:customers:view', 'View Customers', 'عرض العملاء', 'master_data', 'customers', 'view');
SELECT insert_permission('master:customers:create', 'Create Customer', 'إنشاء عميل', 'master_data', 'customers', 'create');
SELECT insert_permission('master:customers:edit', 'Edit Customer', 'تعديل عميل', 'master_data', 'customers', 'edit');
SELECT insert_permission('master:customers:delete', 'Delete Customer', 'حذف عميل', 'master_data', 'customers', 'delete');
SELECT insert_permission('master:customers:view_balance', 'View Customer Balance', 'عرض رصيد العميل', 'master_data', 'customers', 'view_balance');
SELECT insert_permission('master:customers:adjust_credit', 'Adjust Credit Limit', 'تعديل حد الائتمان', 'master_data', 'customers', 'adjust_credit');

-- Vendors
SELECT insert_permission('master:vendors:view', 'View Vendors', 'عرض الموردين', 'master_data', 'vendors', 'view');
SELECT insert_permission('master:vendors:create', 'Create Vendor', 'إنشاء مورد', 'master_data', 'vendors', 'create');
SELECT insert_permission('master:vendors:edit', 'Edit Vendor', 'تعديل مورد', 'master_data', 'vendors', 'edit');
SELECT insert_permission('master:vendors:delete', 'Delete Vendor', 'حذف مورد', 'master_data', 'vendors', 'delete');
SELECT insert_permission('master:vendors:view_balance', 'View Vendor Balance', 'عرض رصيد المورد', 'master_data', 'vendors', 'view_balance');

-- Reference Data
SELECT insert_permission('master:currencies:manage', 'Manage Currencies', 'إدارة العملات', 'master_data', 'currencies', 'manage');
SELECT insert_permission('master:exchange_rates:manage', 'Manage Exchange Rates', 'إدارة أسعار الصرف', 'master_data', 'exchange_rates', 'manage');
SELECT insert_permission('master:payment_terms:manage', 'Manage Payment Terms', 'إدارة شروط الدفع', 'master_data', 'payment_terms', 'manage');
SELECT insert_permission('master:ports:manage', 'Manage Ports', 'إدارة الموانئ', 'master_data', 'ports', 'manage');

-- =====================================================
-- ACCOUNTING PERMISSIONS
-- =====================================================

-- Journal Entries
SELECT insert_permission('accounting:journal:view', 'View Journal Entries', 'عرض القيود اليومية', 'accounting', 'journal', 'view');
SELECT insert_permission('accounting:journal:create', 'Create Journal Entry', 'إنشاء قيد يومية', 'accounting', 'journal', 'create');
SELECT insert_permission('accounting:journal:edit', 'Edit Draft Journal', 'تعديل قيد مسودة', 'accounting', 'journal', 'edit');
SELECT insert_permission('accounting:journal:delete', 'Delete Draft Journal', 'حذف قيد مسودة', 'accounting', 'journal', 'delete');
SELECT insert_permission('accounting:journal:approve', 'Approve Journal Entry', 'اعتماد قيد يومية', 'accounting', 'journal', 'approve', TRUE);
SELECT insert_permission('accounting:journal:post', 'Post Journal Entry', 'ترحيل قيد يومية', 'accounting', 'journal', 'post', TRUE);
SELECT insert_permission('accounting:journal:reverse', 'Reverse Posted Journal', 'عكس قيد مرحل', 'accounting', 'journal', 'reverse', TRUE, TRUE);

-- Fiscal Periods
SELECT insert_permission('accounting:periods:view', 'View Fiscal Periods', 'عرض الفترات المالية', 'accounting', 'periods', 'view');
SELECT insert_permission('accounting:periods:manage', 'Manage Fiscal Periods', 'إدارة الفترات المالية', 'accounting', 'periods', 'manage');
SELECT insert_permission('accounting:periods:close', 'Close Fiscal Period', 'إغلاق فترة مالية', 'accounting', 'periods', 'close', TRUE, TRUE);
SELECT insert_permission('accounting:periods:reopen', 'Reopen Fiscal Period', 'إعادة فتح فترة مالية', 'accounting', 'periods', 'reopen', TRUE, TRUE);

-- Bank Transactions
SELECT insert_permission('accounting:bank:view', 'View Bank Transactions', 'عرض حركات البنك', 'accounting', 'bank', 'view');
SELECT insert_permission('accounting:bank:create', 'Create Bank Transaction', 'إنشاء حركة بنكية', 'accounting', 'bank', 'create');
SELECT insert_permission('accounting:bank:reconcile', 'Bank Reconciliation', 'تسوية بنكية', 'accounting', 'bank', 'reconcile');

-- =====================================================
-- INVENTORY PERMISSIONS
-- =====================================================

SELECT insert_permission('inventory:stock:view', 'View Stock Levels', 'عرض مستويات المخزون', 'inventory', 'stock', 'view');
SELECT insert_permission('inventory:transfer:create', 'Create Stock Transfer', 'إنشاء تحويل مخزني', 'inventory', 'transfer', 'create');
SELECT insert_permission('inventory:transfer:approve', 'Approve Stock Transfer', 'اعتماد تحويل مخزني', 'inventory', 'transfer', 'approve');
SELECT insert_permission('inventory:adjustment:create', 'Create Stock Adjustment', 'إنشاء تسوية مخزنية', 'inventory', 'adjustment', 'create');
SELECT insert_permission('inventory:adjustment:approve', 'Approve Stock Adjustment', 'اعتماد تسوية مخزنية', 'inventory', 'adjustment', 'approve', TRUE);
SELECT insert_permission('inventory:count:create', 'Create Stock Count', 'إنشاء جرد مخزني', 'inventory', 'count', 'create');
SELECT insert_permission('inventory:count:approve', 'Approve Stock Count', 'اعتماد جرد مخزني', 'inventory', 'count', 'approve', TRUE);

-- =====================================================
-- SALES PERMISSIONS
-- =====================================================

SELECT insert_permission('sales:quotation:view', 'View Quotations', 'عرض عروض الأسعار', 'sales', 'quotation', 'view');
SELECT insert_permission('sales:quotation:create', 'Create Quotation', 'إنشاء عرض سعر', 'sales', 'quotation', 'create');
SELECT insert_permission('sales:quotation:edit', 'Edit Quotation', 'تعديل عرض سعر', 'sales', 'quotation', 'edit');
SELECT insert_permission('sales:quotation:approve', 'Approve Quotation', 'اعتماد عرض سعر', 'sales', 'quotation', 'approve');

SELECT insert_permission('sales:order:view', 'View Sales Orders', 'عرض أوامر البيع', 'sales', 'order', 'view');
SELECT insert_permission('sales:order:create', 'Create Sales Order', 'إنشاء أمر بيع', 'sales', 'order', 'create');
SELECT insert_permission('sales:order:edit', 'Edit Sales Order', 'تعديل أمر بيع', 'sales', 'order', 'edit');
SELECT insert_permission('sales:order:approve', 'Approve Sales Order', 'اعتماد أمر بيع', 'sales', 'order', 'approve');
SELECT insert_permission('sales:order:cancel', 'Cancel Sales Order', 'إلغاء أمر بيع', 'sales', 'order', 'cancel');

SELECT insert_permission('sales:invoice:view', 'View Sales Invoices', 'عرض فواتير البيع', 'sales', 'invoice', 'view');
SELECT insert_permission('sales:invoice:create', 'Create Sales Invoice', 'إنشاء فاتورة بيع', 'sales', 'invoice', 'create');
SELECT insert_permission('sales:invoice:edit', 'Edit Draft Invoice', 'تعديل فاتورة مسودة', 'sales', 'invoice', 'edit');
SELECT insert_permission('sales:invoice:approve', 'Approve Sales Invoice', 'اعتماد فاتورة بيع', 'sales', 'invoice', 'approve', TRUE);
SELECT insert_permission('sales:invoice:post', 'Post Sales Invoice', 'ترحيل فاتورة بيع', 'sales', 'invoice', 'post', TRUE);
SELECT insert_permission('sales:invoice:cancel', 'Cancel Sales Invoice', 'إلغاء فاتورة بيع', 'sales', 'invoice', 'cancel', TRUE, TRUE);

SELECT insert_permission('sales:return:create', 'Create Sales Return', 'إنشاء مرتجع بيع', 'sales', 'return', 'create');
SELECT insert_permission('sales:return:approve', 'Approve Sales Return', 'اعتماد مرتجع بيع', 'sales', 'return', 'approve', TRUE);

SELECT insert_permission('sales:receipt:create', 'Create Receipt Voucher', 'إنشاء سند قبض', 'sales', 'receipt', 'create');
SELECT insert_permission('sales:receipt:approve', 'Approve Receipt Voucher', 'اعتماد سند قبض', 'sales', 'receipt', 'approve');

SELECT insert_permission('sales:discount:apply', 'Apply Discounts', 'تطبيق خصومات', 'sales', 'discount', 'apply');
SELECT insert_permission('sales:discount:override', 'Override Max Discount', 'تجاوز الحد الأقصى للخصم', 'sales', 'discount', 'override', TRUE);

-- =====================================================
-- PURCHASES PERMISSIONS
-- =====================================================

SELECT insert_permission('purchases:request:view', 'View Purchase Requests', 'عرض طلبات الشراء', 'purchases', 'request', 'view');
SELECT insert_permission('purchases:request:create', 'Create Purchase Request', 'إنشاء طلب شراء', 'purchases', 'request', 'create');
SELECT insert_permission('purchases:request:approve', 'Approve Purchase Request', 'اعتماد طلب شراء', 'purchases', 'request', 'approve');

SELECT insert_permission('purchases:order:view', 'View Purchase Orders', 'عرض أوامر الشراء', 'purchases', 'order', 'view');
SELECT insert_permission('purchases:order:create', 'Create Purchase Order', 'إنشاء أمر شراء', 'purchases', 'order', 'create');
SELECT insert_permission('purchases:order:edit', 'Edit Purchase Order', 'تعديل أمر شراء', 'purchases', 'order', 'edit');
SELECT insert_permission('purchases:order:approve', 'Approve Purchase Order', 'اعتماد أمر شراء', 'purchases', 'order', 'approve', TRUE);
SELECT insert_permission('purchases:order:cancel', 'Cancel Purchase Order', 'إلغاء أمر شراء', 'purchases', 'order', 'cancel');

SELECT insert_permission('purchases:invoice:view', 'View Purchase Invoices', 'عرض فواتير الشراء', 'purchases', 'invoice', 'view');
SELECT insert_permission('purchases:invoice:create', 'Create Purchase Invoice', 'إنشاء فاتورة شراء', 'purchases', 'invoice', 'create');
SELECT insert_permission('purchases:invoice:approve', 'Approve Purchase Invoice', 'اعتماد فاتورة شراء', 'purchases', 'invoice', 'approve', TRUE);
SELECT insert_permission('purchases:invoice:post', 'Post Purchase Invoice', 'ترحيل فاتورة شراء', 'purchases', 'invoice', 'post', TRUE);

SELECT insert_permission('purchases:return:create', 'Create Purchase Return', 'إنشاء مرتجع شراء', 'purchases', 'return', 'create');
SELECT insert_permission('purchases:return:approve', 'Approve Purchase Return', 'اعتماد مرتجع شراء', 'purchases', 'return', 'approve', TRUE);

SELECT insert_permission('purchases:payment:create', 'Create Payment Voucher', 'إنشاء سند صرف', 'purchases', 'payment', 'create');
SELECT insert_permission('purchases:payment:approve', 'Approve Payment Voucher', 'اعتماد سند صرف', 'purchases', 'payment', 'approve', TRUE);

-- =====================================================
-- LOGISTICS PERMISSIONS
-- =====================================================

SELECT insert_permission('logistics:shipment:view', 'View Shipments', 'عرض الشحنات', 'logistics', 'shipment', 'view');
SELECT insert_permission('logistics:shipment:create', 'Create Shipment', 'إنشاء شحنة', 'logistics', 'shipment', 'create');
SELECT insert_permission('logistics:shipment:edit', 'Edit Shipment', 'تعديل شحنة', 'logistics', 'shipment', 'edit');
SELECT insert_permission('logistics:shipment:track', 'Track Shipment', 'تتبع شحنة', 'logistics', 'shipment', 'track');
SELECT insert_permission('logistics:shipment:update_status', 'Update Shipment Status', 'تحديث حالة الشحنة', 'logistics', 'shipment', 'update_status');

SELECT insert_permission('logistics:customs:view', 'View Customs Declarations', 'عرض البيانات الجمركية', 'logistics', 'customs', 'view');
SELECT insert_permission('logistics:customs:create', 'Create Customs Declaration', 'إنشاء بيان جمركي', 'logistics', 'customs', 'create');
SELECT insert_permission('logistics:customs:approve', 'Approve Customs Declaration', 'اعتماد بيان جمركي', 'logistics', 'customs', 'approve');

SELECT insert_permission('logistics:container:manage', 'Manage Containers', 'إدارة الحاويات', 'logistics', 'container', 'manage');
SELECT insert_permission('logistics:tracking:manage', 'Manage Tracking', 'إدارة التتبع', 'logistics', 'tracking', 'manage');

-- =====================================================
-- HR PERMISSIONS
-- =====================================================

SELECT insert_permission('hr:employees:view', 'View Employees', 'عرض الموظفين', 'hr', 'employees', 'view');
SELECT insert_permission('hr:employees:create', 'Create Employee', 'إنشاء موظف', 'hr', 'employees', 'create');
SELECT insert_permission('hr:employees:edit', 'Edit Employee', 'تعديل موظف', 'hr', 'employees', 'edit');
SELECT insert_permission('hr:employees:delete', 'Delete Employee', 'حذف موظف', 'hr', 'employees', 'delete');
SELECT insert_permission('hr:salaries:view', 'View Salaries', 'عرض الرواتب', 'hr', 'salaries', 'view');
SELECT insert_permission('hr:salaries:manage', 'Manage Salaries', 'إدارة الرواتب', 'hr', 'salaries', 'manage', TRUE);

-- =====================================================
-- REPORTS PERMISSIONS
-- =====================================================

SELECT insert_permission('reports:financial:view', 'View Financial Reports', 'عرض التقارير المالية', 'reports', 'financial', 'view');
SELECT insert_permission('reports:financial:export', 'Export Financial Reports', 'تصدير التقارير المالية', 'reports', 'financial', 'export');
SELECT insert_permission('reports:trial_balance:view', 'View Trial Balance', 'عرض ميزان المراجعة', 'reports', 'trial_balance', 'view');
SELECT insert_permission('reports:balance_sheet:view', 'View Balance Sheet', 'عرض الميزانية العمومية', 'reports', 'balance_sheet', 'view');
SELECT insert_permission('reports:income_statement:view', 'View Income Statement', 'عرض قائمة الدخل', 'reports', 'income_statement', 'view');
SELECT insert_permission('reports:cash_flow:view', 'View Cash Flow', 'عرض التدفقات النقدية', 'reports', 'cash_flow', 'view');
SELECT insert_permission('reports:aging:view', 'View Aging Reports', 'عرض تقارير أعمار الديون', 'reports', 'aging', 'view');
SELECT insert_permission('reports:inventory:view', 'View Inventory Reports', 'عرض تقارير المخزون', 'reports', 'inventory', 'view');
SELECT insert_permission('reports:sales:view', 'View Sales Reports', 'عرض تقارير المبيعات', 'reports', 'sales', 'view');
SELECT insert_permission('reports:purchases:view', 'View Purchase Reports', 'عرض تقارير المشتريات', 'reports', 'purchases', 'view');

-- =====================================================
-- PART 4: PERMISSION SETS (Role Templates)
-- =====================================================

CREATE TABLE IF NOT EXISTS permission_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permission_set_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_set_id UUID NOT NULL REFERENCES permission_sets(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE (permission_set_id, permission_id)
);

-- Insert default permission sets
INSERT INTO permission_sets (code, name_en, name_ar, description, is_system) VALUES
    ('accountant', 'Accountant', 'محاسب', 'Full accounting access', TRUE),
    ('sales_user', 'Sales User', 'مستخدم مبيعات', 'Sales operations access', TRUE),
    ('purchase_user', 'Purchase User', 'مستخدم مشتريات', 'Purchase operations access', TRUE),
    ('warehouse_user', 'Warehouse User', 'أمين مستودع', 'Warehouse operations access', TRUE),
    ('logistics_user', 'Logistics User', 'مستخدم لوجستي', 'Logistics operations access', TRUE),
    ('manager', 'Manager', 'مدير', 'Approval and reporting access', TRUE),
    ('auditor', 'Auditor', 'مراجع', 'Read-only access for audit', TRUE)
ON CONFLICT (code) DO NOTHING;

-- Cleanup
DROP FUNCTION IF EXISTS insert_permission(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, BOOLEAN, BOOLEAN);

-- =====================================================
-- PART 5: HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id INTEGER,
    p_permission_code VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = p_user_id
        AND p.permission_code = p_permission_code
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

-- Function to get all user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id INTEGER)
RETURNS TABLE (
    permission_code VARCHAR,
    module VARCHAR,
    action VARCHAR,
    requires_approval BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        p.permission_code::VARCHAR,
        p.module,
        p.action,
        p.requires_approval
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE permission_categories IS 'Categories for organizing permissions by module';
COMMENT ON TABLE permission_sets IS 'Pre-defined permission bundles for easy role assignment';
COMMENT ON FUNCTION user_has_permission(INTEGER, VARCHAR) IS 'Check if a user has a specific permission';
