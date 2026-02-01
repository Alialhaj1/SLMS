-- =============================================
-- PROCUREMENT MODULE - SEED DATA
-- Migration 100: Reference data and initial values
-- =============================================

-- =============================================
-- 1. VENDOR CATEGORIES (تصنيفات الموردين)
-- =============================================
WITH u AS (
    SELECT id AS user_id FROM users ORDER BY id LIMIT 1
)
INSERT INTO vendor_categories (company_id, code, name, name_ar, description, description_ar, sort_order, created_by)
SELECT v.company_id, v.code, v.name, v.name_ar, v.description, v.description_ar, v.sort_order, u.user_id
FROM (
    VALUES
        (1, 'LOCAL', 'Local Vendor', 'مورد محلي', 'Vendors based in Saudi Arabia', 'موردين داخل المملكة العربية السعودية', 1),
        (1, 'INTL', 'International Vendor', 'مورد دولي', 'Vendors outside Saudi Arabia', 'موردين من خارج المملكة', 2),
        (1, 'SERVICE', 'Service Vendor', 'مورد خدمات', 'Service providers', 'مقدمي الخدمات', 3),
        (1, 'FREIGHT', 'Freight & Shipping', 'مورد شحن', 'Shipping and logistics vendors', 'موردي الشحن والخدمات اللوجستية', 4),
        (1, 'RAW', 'Raw Materials', 'مورد مواد خام', 'Raw materials suppliers', 'موردي المواد الخام', 5)
) AS v(company_id, code, name, name_ar, description, description_ar, sort_order)
CROSS JOIN u
ON CONFLICT (company_id, code) DO NOTHING;

-- =============================================
-- 2. VENDOR TYPES (أنواع الموردين)
-- =============================================
WITH u AS (
    SELECT id AS user_id FROM users ORDER BY id LIMIT 1
)
INSERT INTO vendor_types (company_id, code, name, name_ar, description, description_ar, affects_inventory, creates_asset, sort_order, created_by)
SELECT v.company_id, v.code, v.name, v.name_ar, v.description, v.description_ar,
             v.affects_inventory, v.creates_asset, v.sort_order, u.user_id
FROM (
    VALUES
        (1, 'MATERIALS', 'Materials', 'مواد', 'Material suppliers - affects inventory', 'موردي مواد - يؤثر على المخزون', true, false, 1),
        (1, 'SERVICES', 'Services', 'خدمات', 'Service providers - no inventory impact', 'مقدمي خدمات - لا يؤثر على المخزون', false, false, 2),
        (1, 'ASSETS', 'Assets', 'أصول', 'Fixed assets suppliers', 'موردي الأصول الثابتة', false, true, 3),
        (1, 'FREIGHT', 'Freight/Clearance', 'شحن/تخليص', 'Freight and customs clearance', 'خدمات الشحن والتخليص الجمركي', false, false, 4)
) AS v(company_id, code, name, name_ar, description, description_ar, affects_inventory, creates_asset, sort_order)
CROSS JOIN u
ON CONFLICT (company_id, code) DO NOTHING;

-- =============================================
-- 3. VENDOR STATUSES (حالات الموردين)
-- =============================================
INSERT INTO vendor_statuses (company_id, code, name, name_ar, description, description_ar, color, allows_purchase_orders, allows_invoices, allows_payments, is_default, sort_order)
VALUES
    (1, 'DRAFT', 'Draft', 'مسودة', 'New vendor under setup', 'مورد جديد قيد الإعداد', 'gray', false, false, false, true, 1),
    (1, 'APPROVED', 'Approved', 'معتمد', 'Active and approved vendor', 'مورد نشط ومعتمد', 'green', true, true, true, false, 2),
    (1, 'SUSPENDED', 'Suspended', 'موقوف', 'Temporarily suspended', 'موقوف مؤقتاً', 'yellow', false, false, true, false, 3),
    (1, 'BLOCKED', 'Blocked', 'محظور', 'Permanently blocked', 'محظور بشكل دائم', 'red', false, false, false, false, 4)
ON CONFLICT (company_id, code) DO NOTHING;

-- =============================================
-- 4. VENDOR PAYMENT TERMS (شروط الدفع)
-- =============================================
WITH u AS (
    SELECT id AS user_id FROM users ORDER BY id LIMIT 1
)
INSERT INTO vendor_payment_terms (company_id, code, name, name_ar, description, description_ar, payment_type, due_days, discount_days, discount_percent, is_default, sort_order, created_by)
SELECT v.company_id, v.code, v.name, v.name_ar, v.description, v.description_ar,
             v.payment_type, v.due_days, v.discount_days, v.discount_percent, v.is_default, v.sort_order,
             u.user_id
FROM (
    VALUES
        (1, 'CASH', 'Cash', 'نقدي', 'Payment on delivery', 'الدفع عند التسليم', 'cash', 0, 0, 0::numeric, false, 1),
        (1, 'NET15', 'Net 15 Days', 'صافي 15 يوم', 'Payment within 15 days', 'السداد خلال 15 يوم', 'credit', 15, 0, 0::numeric, false, 2),
        (1, 'NET30', 'Net 30 Days', 'صافي 30 يوم', 'Payment within 30 days', 'السداد خلال 30 يوم', 'credit', 30, 0, 0::numeric, true, 3),
        (1, 'NET60', 'Net 60 Days', 'صافي 60 يوم', 'Payment within 60 days', 'السداد خلال 60 يوم', 'credit', 60, 0, 0::numeric, false, 4),
        (1, 'NET90', 'Net 90 Days', 'صافي 90 يوم', 'Payment within 90 days', 'السداد خلال 90 يوم', 'credit', 90, 0, 0::numeric, false, 5),
        (1, '2NET10', '2% 10 Net 30', '2% خصم 10 أيام صافي 30', '2% discount if paid in 10 days, net 30', '2% خصم إذا تم السداد خلال 10 أيام، صافي 30 يوم', 'credit', 30, 10, 2.00::numeric, false, 6),
        (1, 'INST3', '3 Installments', '3 دفعات', 'Payment in 3 equal installments', 'السداد على 3 أقساط متساوية', 'installments', 90, 0, 0::numeric, false, 7),
        (1, 'INST4', '4 Installments', '4 دفعات', 'Payment in 4 equal installments', 'السداد على 4 أقساط متساوية', 'installments', 120, 0, 0::numeric, false, 8),
        (1, 'ADVANCE', 'Advance Payment', 'دفع مقدم', 'Full payment in advance', 'الدفع المسبق الكامل', 'cash', 0, 0, 0::numeric, false, 9),
        (1, 'COD', 'Cash on Delivery', 'الدفع عند الاستلام', 'Payment upon goods receipt', 'الدفع عند استلام البضاعة', 'cash', 0, 0, 0::numeric, false, 10)
) AS v(company_id, code, name, name_ar, description, description_ar, payment_type, due_days, discount_days, discount_percent, is_default, sort_order)
CROSS JOIN u
ON CONFLICT (company_id, code) DO NOTHING;

-- =============================================
-- 5. DELIVERY TERMS (شروط التسليم - Incoterms)
-- =============================================
INSERT INTO delivery_terms (company_id, code, name, name_ar, description, description_ar, incoterm_code, delivery_location, freight_responsibility, insurance_responsibility, sort_order)
VALUES
    (1, 'EXW', 'Ex Works', 'تسليم المصنع', 'Buyer bears all costs from seller location', 'المشتري يتحمل جميع التكاليف من موقع البائع', 'EXW', 'vendor_door', 'buyer', 'buyer', 1),
    (1, 'FOB', 'Free On Board', 'تسليم ظهر السفينة', 'Seller delivers to port of shipment', 'البائع يسلم في ميناء الشحن', 'FOB', 'port', 'buyer', 'buyer', 2),
    (1, 'CIF', 'Cost Insurance Freight', 'التكلفة والتأمين والشحن', 'Seller pays freight and insurance to destination', 'البائع يدفع الشحن والتأمين حتى الوجهة', 'CIF', 'port', 'vendor', 'vendor', 3),
    (1, 'CFR', 'Cost and Freight', 'التكلفة والشحن', 'Seller pays freight, buyer pays insurance', 'البائع يدفع الشحن، المشتري يدفع التأمين', 'CFR', 'port', 'vendor', 'buyer', 4),
    (1, 'DDP', 'Delivered Duty Paid', 'تسليم مع دفع الرسوم', 'Seller delivers to buyer location duty paid', 'البائع يسلم في موقع المشتري مع دفع الرسوم', 'DDP', 'company_warehouse', 'vendor', 'vendor', 5),
    (1, 'DAP', 'Delivered At Place', 'تسليم في المكان', 'Seller delivers to named place', 'البائع يسلم في المكان المحدد', 'DAP', 'company_warehouse', 'vendor', 'vendor', 6),
    (1, 'FCA', 'Free Carrier', 'تسليم للناقل', 'Seller delivers to carrier at named place', 'البائع يسلم للناقل في المكان المحدد', 'FCA', 'vendor_door', 'buyer', 'buyer', 7),
    (1, 'LOCAL', 'Local Delivery', 'تسليم محلي', 'Vendor delivers to company warehouse', 'المورد يسلم في مستودع الشركة', NULL, 'company_warehouse', 'vendor', 'vendor', 8)
ON CONFLICT (company_id, code) DO NOTHING;

-- =============================================
-- 6. SUPPLY TERMS (شروط التوريد)
-- =============================================
INSERT INTO supply_terms (company_id, code, name, name_ar, description, description_ar, supply_type, allows_partial_delivery, min_delivery_percent, sort_order)
VALUES
    (1, 'FULL', 'Full Delivery', 'توريد كامل', 'Complete order in single delivery', 'الطلب كاملاً في توريد واحد', 'full', false, 100, 1),
    (1, 'PARTIAL', 'Partial Delivery', 'توريد جزئي', 'Allow partial deliveries', 'السماح بالتوريد الجزئي', 'partial', true, 10, 2),
    (1, 'SHIPMENT', 'Per Shipment', 'حسب الشحنة', 'Delivery per shipment basis', 'التوريد حسب الشحنة', 'shipment', true, 25, 3),
    (1, 'SCHED', 'Scheduled', 'مجدول', 'Scheduled periodic deliveries', 'توريدات دورية مجدولة', 'partial', true, 20, 4)
ON CONFLICT (company_id, code) DO NOTHING;

-- =============================================
-- 7. CONTRACT TYPES (أنواع العقود)
-- =============================================
INSERT INTO contract_types (company_id, code, name, name_ar, description, description_ar, duration_type, requires_approval, sort_order)
VALUES
    (1, 'ANNUAL', 'Annual Contract', 'عقد سنوي', 'One year supply contract', 'عقد توريد لمدة سنة', 'annual', true, 1),
    (1, 'SHIPMENT', 'Shipment Contract', 'عقد شحنة', 'Single shipment contract', 'عقد لشحنة واحدة', 'shipment', true, 2),
    (1, 'PROJECT', 'Project Contract', 'عقد مشروع', 'Project-based contract', 'عقد مرتبط بمشروع', 'project', true, 3),
    (1, 'BLANKET', 'Blanket Order', 'أمر شراء مفتوح', 'Open purchase agreement', 'اتفاقية شراء مفتوحة', 'annual', true, 4),
    (1, 'SERVICE', 'Service Contract', 'عقد خدمات', 'Service level agreement', 'اتفاقية مستوى الخدمة', 'annual', true, 5)
ON CONFLICT (company_id, code) DO NOTHING;

-- =============================================
-- 8. CONTRACT STATUSES (حالات العقود)
-- =============================================
INSERT INTO contract_statuses (company_id, code, name, name_ar, description, color, allows_purchase_orders, is_terminal, sort_order)
VALUES
    (1, 'DRAFT', 'Draft', 'مسودة', 'Contract under preparation', 'gray', false, false, 1),
    (1, 'REVIEW', 'Under Review', 'قيد المراجعة', 'Contract under review', 'blue', false, false, 2),
    (1, 'APPROVED', 'Approved', 'معتمد', 'Contract approved and active', 'green', true, false, 3),
    (1, 'EXPIRED', 'Expired', 'منتهي', 'Contract has expired', 'yellow', false, true, 4),
    (1, 'SUSPENDED', 'Suspended', 'موقوف', 'Contract temporarily suspended', 'orange', false, false, 5),
    (1, 'TERMINATED', 'Terminated', 'ملغى', 'Contract terminated', 'red', false, true, 6)
ON CONFLICT (company_id, code) DO NOTHING;

-- =============================================
-- 9. PURCHASE ORDER TYPES (أنواع أوامر الشراء)
-- =============================================
INSERT INTO purchase_order_types (company_id, code, name, name_ar, description, description_ar, affects_inventory, requires_grn, creates_asset, sort_order)
VALUES
    (1, 'LOCAL', 'Local Purchase', 'شراء محلي', 'Domestic purchase order', 'أمر شراء محلي', true, true, false, 1),
    (1, 'IMPORT', 'Import', 'استيراد', 'International import order', 'أمر استيراد دولي', true, true, false, 2),
    (1, 'SERVICE', 'Service', 'خدمات', 'Service purchase order', 'أمر شراء خدمات', false, false, false, 3),
    (1, 'ASSET', 'Asset', 'أصول', 'Fixed asset purchase', 'شراء أصول ثابتة', false, true, true, 4),
    (1, 'CONSIGN', 'Consignment', 'أمانة', 'Consignment purchase', 'شراء بالأمانة', true, true, false, 5)
ON CONFLICT (company_id, code) DO NOTHING;

-- =============================================
-- 10. PURCHASE ORDER STATUSES
-- =============================================
INSERT INTO purchase_order_statuses (company_id, code, name, name_ar, color, allows_edit, allows_delete, allows_receive, allows_invoice, is_terminal, sort_order)
VALUES
    (1, 'DRAFT', 'Draft', 'مسودة', 'gray', true, true, false, false, false, 1),
    (1, 'PENDING', 'Pending Approval', 'بانتظار الموافقة', 'yellow', false, false, false, false, false, 2),
    (1, 'APPROVED', 'Approved', 'معتمد', 'blue', false, false, true, true, false, 3),
    (1, 'PARTIAL', 'Partially Received', 'استلام جزئي', 'purple', false, false, true, true, false, 4),
    (1, 'RECEIVED', 'Fully Received', 'تم الاستلام', 'green', false, false, false, true, false, 5),
    (1, 'CLOSED', 'Closed', 'مغلق', 'gray', false, false, false, false, true, 6),
    (1, 'CANCELLED', 'Cancelled', 'ملغى', 'red', false, false, false, false, true, 7)
ON CONFLICT (company_id, code) DO NOTHING;

-- =============================================
-- 11. CONTRACT APPROVAL STAGES (مراحل الموافقة)
-- =============================================
INSERT INTO contract_approval_stages (company_id, code, name, name_ar, stage_order, required_role)
VALUES
    (1, 'INITIAL', 'Initial Review', 'مراجعة أولية', 1, 'manager'),
    (1, 'FINANCE', 'Finance Approval', 'موافقة مالية', 2, 'finance_manager'),
    (1, 'EXEC', 'Executive Approval', 'موافقة إدارية', 3, 'admin')
ON CONFLICT (company_id, code) DO NOTHING;

-- =============================================
-- 12. SAMPLE VENDORS (موردين فعليين)
-- =============================================
-- Get status and category IDs
DO $$
DECLARE
    v_approved_status_id INTEGER;
    v_draft_status_id INTEGER;
    v_local_category_id INTEGER;
    v_intl_category_id INTEGER;
    v_freight_category_id INTEGER;
    v_materials_type_id INTEGER;
    v_services_type_id INTEGER;
    v_freight_type_id INTEGER;
    v_sar_id INTEGER;
    v_usd_id INTEGER;
    v_eur_id INTEGER;
    v_user_id INTEGER;
BEGIN
    SELECT id INTO v_user_id FROM users ORDER BY id LIMIT 1;

    SELECT id INTO v_approved_status_id FROM vendor_statuses WHERE company_id = 1 AND code = 'APPROVED';
    SELECT id INTO v_draft_status_id FROM vendor_statuses WHERE company_id = 1 AND code = 'DRAFT';
    SELECT id INTO v_local_category_id FROM vendor_categories WHERE company_id = 1 AND code = 'LOCAL';
    SELECT id INTO v_intl_category_id FROM vendor_categories WHERE company_id = 1 AND code = 'INTL';
    SELECT id INTO v_freight_category_id FROM vendor_categories WHERE company_id = 1 AND code = 'FREIGHT';
    SELECT id INTO v_materials_type_id FROM vendor_types WHERE company_id = 1 AND code = 'MATERIALS';
    SELECT id INTO v_services_type_id FROM vendor_types WHERE company_id = 1 AND code = 'SERVICES';
    SELECT id INTO v_freight_type_id FROM vendor_types WHERE company_id = 1 AND code = 'FREIGHT';
    SELECT id INTO v_sar_id FROM currencies WHERE code = 'SAR' LIMIT 1;
    SELECT id INTO v_usd_id FROM currencies WHERE code = 'USD' LIMIT 1;
    SELECT id INTO v_eur_id FROM currencies WHERE code = 'EUR' LIMIT 1;

    -- Insert vendors only if they don't exist
    INSERT INTO vendors (company_id, code, name, name_ar, vendor_type, status_id, category_id, type_id, 
                         phone, email, address, credit_limit, currency_id, status, created_by)
    SELECT * FROM (VALUES
        (1, 'VND-001', 'Al-Rajhi Trading Co.', 'شركة الراجحي للتجارة', 'supplier', v_approved_status_id, v_local_category_id, v_materials_type_id,
         '+966-11-4567890', 'info@alrajhi-trading.sa', 'Riyadh Industrial Area', 500000.00, v_sar_id, 'active', v_user_id),
        (1, 'VND-002', 'Gulf Petrochemicals', 'الخليج للبتروكيماويات', 'supplier', v_approved_status_id, v_local_category_id, v_materials_type_id,
         '+966-13-8901234', 'sales@gulfpetro.com', 'Jubail Industrial City', 1000000.00, v_sar_id, 'active', v_user_id),
        (1, 'VND-003', 'Emirates Steel Industries', 'الإمارات للصناعات الحديدية', 'supplier', v_approved_status_id, v_intl_category_id, v_materials_type_id,
         '+971-4-3456789', 'orders@emiratessteel.ae', 'Dubai Industrial City, UAE', 2000000.00, v_usd_id, 'active', v_user_id),
        (1, 'VND-004', 'MAERSK Shipping', 'ميرسك للشحن', 'freight', v_approved_status_id, v_freight_category_id, v_freight_type_id,
         '+45-3363-3363', 'booking@maersk.com', 'Copenhagen, Denmark', 500000.00, v_usd_id, 'active', v_user_id),
        (1, 'VND-005', 'SAL Saudi Logistics', 'سال السعودية للخدمات اللوجستية', 'freight', v_approved_status_id, v_local_category_id, v_freight_type_id,
         '+966-12-6789012', 'logistics@sal.com.sa', 'Jeddah Islamic Port', 300000.00, v_sar_id, 'active', v_user_id),
        (1, 'VND-006', 'German Machinery GmbH', 'الآلات الألمانية', 'supplier', v_approved_status_id, v_intl_category_id, v_materials_type_id,
         '+49-89-12345678', 'sales@german-machinery.de', 'Munich, Germany', 1500000.00, v_eur_id, 'active', v_user_id),
        (1, 'VND-007', 'China Import Export Corp', 'شركة الصين للاستيراد والتصدير', 'supplier', v_approved_status_id, v_intl_category_id, v_materials_type_id,
         '+86-21-87654321', 'trade@chinaie.cn', 'Shanghai, China', 800000.00, v_usd_id, 'active', v_user_id),
        (1, 'VND-008', 'Technical Solutions Ltd', 'حلول تقنية المحدودة', 'service', v_approved_status_id, v_local_category_id, v_services_type_id,
         '+966-11-2345678', 'support@techsolutions.sa', 'Riyadh', 200000.00, v_sar_id, 'active', v_user_id),
        (1, 'VND-009', 'Al-Khaleej Customs Clearance', 'الخليج للتخليص الجمركي', 'freight', v_approved_status_id, v_freight_category_id, v_freight_type_id,
         '+966-13-5678901', 'clearance@alkhaleej.sa', 'Dammam Port', 150000.00, v_sar_id, 'active', v_user_id),
        (1, 'VND-010', 'Saudi Industrial Supplies', 'السعودية للتوريدات الصناعية', 'supplier', v_draft_status_id, v_local_category_id, v_materials_type_id,
         '+966-11-9876543', 'info@saudisupplies.sa', 'Riyadh', 250000.00, v_sar_id, 'active', v_user_id)
    ) AS v(company_id, code, name, name_ar, vendor_type, status_id, category_id, type_id, phone, email, address, credit_limit, currency_id, status, created_by)
    WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE company_id = 1 AND code = v.code);
END $$;

-- =============================================
-- 13. PERMISSIONS FOR PROCUREMENT MODULE
-- =============================================
INSERT INTO permissions (permission_code, resource, action, description, module)
VALUES
    -- Vendors
    ('vendors:view', 'vendors', 'view', 'View vendors list', 'procurement'),
    ('vendors:create', 'vendors', 'create', 'Create new vendors', 'procurement'),
    ('vendors:edit', 'vendors', 'edit', 'Edit vendor details', 'procurement'),
    ('vendors:delete', 'vendors', 'delete', 'Delete vendors', 'procurement'),
    ('vendors:approve', 'vendors', 'approve', 'Approve vendors', 'procurement'),
    
    -- Vendor Categories
    ('vendor_categories:view', 'vendor_categories', 'view', 'View vendor categories', 'procurement'),
    ('vendor_categories:manage', 'vendor_categories', 'manage', 'Manage vendor categories', 'procurement'),
    
    -- Vendor Types
    ('vendor_types:view', 'vendor_types', 'view', 'View vendor types', 'procurement'),
    ('vendor_types:manage', 'vendor_types', 'manage', 'Manage vendor types', 'procurement'),
    
    -- Purchase Orders
    ('purchase_orders:view', 'purchase_orders', 'view', 'View purchase orders', 'procurement'),
    ('purchase_orders:create', 'purchase_orders', 'create', 'Create purchase orders', 'procurement'),
    ('purchase_orders:edit', 'purchase_orders', 'edit', 'Edit purchase orders', 'procurement'),
    ('purchase_orders:delete', 'purchase_orders', 'delete', 'Delete purchase orders', 'procurement'),
    ('purchase_orders:approve', 'purchase_orders', 'approve', 'Approve purchase orders', 'procurement'),
    
    -- Goods Receipts
    ('goods_receipts:view', 'goods_receipts', 'view', 'View goods receipts', 'procurement'),
    ('goods_receipts:create', 'goods_receipts', 'create', 'Create goods receipts', 'procurement'),
    ('goods_receipts:post', 'goods_receipts', 'post', 'Post goods receipts', 'procurement'),
    
    -- Purchase Invoices
    ('purchase_invoices:view', 'purchase_invoices', 'view', 'View purchase invoices', 'procurement'),
    ('purchase_invoices:create', 'purchase_invoices', 'create', 'Create purchase invoices', 'procurement'),
    ('purchase_invoices:edit', 'purchase_invoices', 'edit', 'Edit purchase invoices', 'procurement'),
    ('purchase_invoices:delete', 'purchase_invoices', 'delete', 'Delete purchase invoices', 'procurement'),
    ('purchase_invoices:post', 'purchase_invoices', 'post', 'Post purchase invoices', 'procurement'),
    
    -- Purchase Returns
    ('purchase_returns:view', 'purchase_returns', 'view', 'View purchase returns', 'procurement'),
    ('purchase_returns:create', 'purchase_returns', 'create', 'Create purchase returns', 'procurement'),
    ('purchase_returns:post', 'purchase_returns', 'post', 'Post purchase returns', 'procurement'),
    
    -- Vendor Quotations
    ('vendor_quotations:view', 'vendor_quotations', 'view', 'View vendor quotations', 'procurement'),
    ('vendor_quotations:create', 'vendor_quotations', 'create', 'Create vendor quotations', 'procurement'),
    ('vendor_quotations:edit', 'vendor_quotations', 'edit', 'Edit vendor quotations', 'procurement'),
    
    -- Vendor Contracts
    ('vendor_contracts:view', 'vendor_contracts', 'view', 'View vendor contracts', 'procurement'),
    ('vendor_contracts:create', 'vendor_contracts', 'create', 'Create vendor contracts', 'procurement'),
    ('vendor_contracts:edit', 'vendor_contracts', 'edit', 'Edit vendor contracts', 'procurement'),
    ('vendor_contracts:approve', 'vendor_contracts', 'approve', 'Approve vendor contracts', 'procurement'),
    
    -- Vendor Price Lists
    ('vendor_price_lists:view', 'vendor_price_lists', 'view', 'View vendor price lists', 'procurement'),
    ('vendor_price_lists:manage', 'vendor_price_lists', 'manage', 'Manage vendor price lists', 'procurement'),
    
    -- Payment Terms
    ('vendor_payment_terms:view', 'vendor_payment_terms', 'view', 'View payment terms', 'procurement'),
    ('vendor_payment_terms:manage', 'vendor_payment_terms', 'manage', 'Manage payment terms', 'procurement'),
    
    -- Delivery Terms
    ('delivery_terms:view', 'delivery_terms', 'view', 'View delivery terms', 'procurement'),
    ('delivery_terms:manage', 'delivery_terms', 'manage', 'Manage delivery terms', 'procurement'),
    
    -- Supply Terms
    ('supply_terms:view', 'supply_terms', 'view', 'View supply terms', 'procurement'),
    ('supply_terms:manage', 'supply_terms', 'manage', 'Manage supply terms', 'procurement')
ON CONFLICT (permission_code) DO NOTHING;

-- Assign permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
AND p.module = 'procurement'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 100: Procurement seed data inserted successfully';
END $$;
