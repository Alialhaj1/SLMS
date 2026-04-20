-- ============================================================================
-- 427: بيانات مرجعية شاملة - بيانات الأعمال المرجعية (نطاق الشركة)
-- Comprehensive Reference Data - Business Reference Data (Company-Scoped)
-- ============================================================================

BEGIN;

-- Add sort_order column to tables that need it for display ordering
ALTER TABLE units ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE shipping_methods ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE warehouse_types ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- All company-scoped tables need data inserted per company
-- Using DO $$ block to loop over all active companies

DO $$
DECLARE
  comp RECORD;
BEGIN
  FOR comp IN SELECT id FROM companies WHERE deleted_at IS NULL
  LOOP

    -- ╔════════════════════════════════════════════════════════════════════╗
    -- ║ 1. VENDOR TYPES - أنواع الموردين                                  ║
    -- ╚════════════════════════════════════════════════════════════════════╝

    INSERT INTO vendor_types (company_id, code, name, name_ar, description, affects_inventory, creates_asset, sort_order)
    VALUES
      (comp.id, 'MAN',        'Manufacturer',          'مصنّع',               'Direct manufacturer of goods',         true,  false, 1),
      (comp.id, 'DIST',       'Distributor',           'موزع',               'Wholesale distributor',                true,  false, 2),
      (comp.id, 'WH',         'Wholesaler',            'تاجر جملة',          'Bulk goods supplier',                  true,  false, 3),
      (comp.id, 'RET',        'Retailer',              'تاجر تجزئة',         'Retail supplier',                      true,  false, 4),
      (comp.id, 'FWD',        'Freight Forwarder',     'وكيل شحن',           'Logistics freight forwarder',          false, false, 5),
      (comp.id, 'CUS',        'Customs Broker',        'مخلص جمركي',         'Customs clearance agent',              false, false, 6),
      (comp.id, 'SVC',        'Service Provider',      'مزود خدمات',         'Professional services vendor',         false, false, 7),
      (comp.id, 'CONS',       'Consultant',            'استشاري',            'Consultancy firm',                     false, false, 8),
      (comp.id, 'CONT',       'Contractor',            'مقاول',              'Contract-based service provider',      false, false, 9),
      (comp.id, 'INS',        'Insurance Company',     'شركة تأمين',         'Insurance provider',                   false, false, 10),
      (comp.id, 'BANK',       'Bank/Financial',        'بنك/مالي',           'Financial institution',                false, false, 11),
      (comp.id, 'GOV',        'Government Entity',     'جهة حكومية',         'Government agency or entity',          false, false, 12),
      (comp.id, 'UTIL',       'Utility Provider',      'مزود خدمات عامة',    'Electricity, water, telecom',          false, false, 13),
      (comp.id, 'IMP',        'Importer',              'مستورد',             'Import agent',                         true,  false, 14),
      (comp.id, 'EXP',        'Exporter',              'مُصدّر',             'Export agent',                         true,  false, 15),
      (comp.id, 'TRANS',      'Transport Company',     'شركة نقل',           'Land/sea/air transport provider',      false, false, 16),
      (comp.id, 'TECH',       'Technology Vendor',     'مورد تقنية',         'IT/software/hardware vendor',          false, false, 17),
      (comp.id, 'MAINT',      'Maintenance Vendor',    'مورد صيانة',         'Equipment maintenance services',       false, false, 18)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, description = EXCLUDED.description,
      sort_order = EXCLUDED.sort_order;


    -- ╔════════════════════════════════════════════════════════════════════╗
    -- ║ 2. VENDOR CATEGORIES - تصنيفات الموردين                           ║
    -- ╚════════════════════════════════════════════════════════════════════╝

    INSERT INTO vendor_categories (company_id, code, name, name_ar, description, sort_order)
    VALUES
      (comp.id, 'CAT-LOC',    'Local Vendor',         'مورد محلي',          'Domestic / local vendor',              1),
      (comp.id, 'CAT-INT',    'International Vendor',  'مورد دولي',          'Foreign / international vendor',       2),
      (comp.id, 'CAT-GCC',    'GCC Vendor',            'مورد خليجي',         'Vendor from GCC countries',            3),
      (comp.id, 'CAT-ARAB',   'Arab Region Vendor',    'مورد عربي',          'Vendor from Arab countries',           4),
      (comp.id, 'CAT-PREM',   'Premium Vendor',        'مورد مميز',          'Premium / strategic vendor',           5),
      (comp.id, 'CAT-REG',    'Regular Vendor',        'مورد عادي',          'Standard vendor',                      6),
      (comp.id, 'CAT-LOG',    'Logistics Vendor',      'مورد لوجستي',        'Shipping & logistics vendor',          7),
      (comp.id, 'CAT-SRV',    'Service Vendor',        'مورد خدمات',         'Service-based vendor',                 8),
      (comp.id, 'CAT-RAW',    'Raw Material',          'مواد خام',           'Raw material supplier',                9),
      (comp.id, 'CAT-SPAR',   'Spare Parts',           'قطع غيار',           'Spare parts supplier',                10),
      (comp.id, 'CAT-EQUIP',  'Equipment',             'معدات',              'Equipment and machinery supplier',     11),
      (comp.id, 'CAT-FOOD',   'Food & Beverage',       'أغذية ومشروبات',     'Food and beverage supplier',          12),
      (comp.id, 'CAT-CHEM',   'Chemicals',             'مواد كيميائية',      'Chemical materials supplier',          13),
      (comp.id, 'CAT-CONST',  'Construction',          'مواد بناء',          'Construction materials supplier',      14)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, description = EXCLUDED.description,
      sort_order = EXCLUDED.sort_order;


    -- ╔════════════════════════════════════════════════════════════════════╗
    -- ║ 3. VENDOR STATUSES - حالات الموردين                                ║
    -- ╚════════════════════════════════════════════════════════════════════╝

    INSERT INTO vendor_statuses (company_id, code, name, name_ar, color, allows_purchase_orders, allows_invoices, allows_payments, is_default, sort_order)
    VALUES
      (comp.id, 'ACTIVE',     'Active',                'نشط',               'green',    true,  true,  true,  true,  1),
      (comp.id, 'DRAFT',      'Draft',                 'مسودة',             'gray',     false, false, false, false, 2),
      (comp.id, 'PENDING',    'Pending Approval',      'بانتظار الموافقة',   'yellow',   false, false, false, false, 3),
      (comp.id, 'APPROVED',   'Approved',              'معتمد',             'blue',     true,  true,  true,  false, 4),
      (comp.id, 'ON_HOLD',    'On Hold',               'معلّق',             'orange',   false, false, false, false, 5),
      (comp.id, 'SUSPENDED',  'Suspended',             'موقوف',             'red',      false, false, false, false, 6),
      (comp.id, 'BLOCKED',    'Blocked',               'محظور',             'red',      false, false, false, false, 7),
      (comp.id, 'BLACKLISTED','Blacklisted',           'مدرج بالقائمة السوداء','red',   false, false, false, false, 8),
      (comp.id, 'INACTIVE',   'Inactive',              'غير نشط',           'gray',     false, false, false, false, 9)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, color = EXCLUDED.color,
      sort_order = EXCLUDED.sort_order;


    -- ╔════════════════════════════════════════════════════════════════════╗
    -- ║ 4. CUSTOMER TYPES - أنواع العملاء                                  ║
    -- ╚════════════════════════════════════════════════════════════════════╝

    INSERT INTO customer_types (company_id, code, name, name_ar, description, sort_order)
    VALUES
      (comp.id, 'CORP',       'Corporate',             'شركة',               'Corporate / business customer',        1),
      (comp.id, 'SME',        'Small & Medium Enterprise','منشأة صغيرة ومتوسطة','SME customer',                      2),
      (comp.id, 'INDIV',      'Individual',            'فرد',                'Individual / personal customer',       3),
      (comp.id, 'GOV',        'Government',            'جهة حكومية',         'Government entity customer',           4),
      (comp.id, 'SEMI_GOV',   'Semi-Government',       'شبه حكومي',          'Semi-government organization',         5),
      (comp.id, 'NGO',        'Non-Profit',            'جهة غير ربحية',      'NGO / non-profit organization',        6),
      (comp.id, 'RETAIL',     'Retail',                'تجزئة',              'Retail customer',                      7),
      (comp.id, 'WHOLESALE',  'Wholesale',             'جملة',               'Wholesale customer',                   8),
      (comp.id, 'EXPORT',     'Export Customer',        'عميل تصدير',         'International export customer',        9),
      (comp.id, 'AGENT',      'Agent/Broker',          'وكيل/وسيط',          'Sales agent or broker',                10),
      (comp.id, 'FRANCHISE',  'Franchise',             'امتياز',             'Franchise holder',                     11),
      (comp.id, 'INTERNAL',   'Internal',              'داخلي',              'Inter-company / internal customer',    12)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, description = EXCLUDED.description,
      sort_order = EXCLUDED.sort_order;


    -- ╔════════════════════════════════════════════════════════════════════╗
    -- ║ 5. CUSTOMER CATEGORIES - تصنيفات العملاء                          ║
    -- ╚════════════════════════════════════════════════════════════════════╝

    INSERT INTO customer_categories (company_id, code, name, name_ar, description, sort_order)
    VALUES
      (comp.id, 'VIP',        'VIP Customer',          'عميل VIP',           'Very important customer',              1),
      (comp.id, 'PLATINUM',   'Platinum',              'بلاتيني',            'Platinum tier customer',               2),
      (comp.id, 'GOLD',       'Gold',                  'ذهبي',               'Gold tier customer',                   3),
      (comp.id, 'SILVER',     'Silver',                'فضي',                'Silver tier customer',                 4),
      (comp.id, 'BRONZE',     'Bronze',                'برونزي',             'Bronze tier customer',                 5),
      (comp.id, 'REGULAR',    'Regular',               'عادي',               'Regular customer',                     6),
      (comp.id, 'NEW',        'New Customer',          'عميل جديد',          'Newly acquired customer',              7),
      (comp.id, 'LOCAL',      'Local',                 'محلي',               'Domestic customer',                    8),
      (comp.id, 'INTL',       'International',         'دولي',               'International customer',               9),
      (comp.id, 'GCC',        'GCC',                   'خليجي',              'GCC region customer',                  10),
      (comp.id, 'STRAT',      'Strategic',             'استراتيجي',          'Strategic partner customer',            11),
      (comp.id, 'DISTRIB',    'Distributor',           'موزع',               'Distribution channel customer',        12)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, description = EXCLUDED.description,
      sort_order = EXCLUDED.sort_order;


    -- ╔════════════════════════════════════════════════════════════════════╗
    -- ║ 6. CUSTOMER STATUSES - حالات العملاء                               ║
    -- ╚════════════════════════════════════════════════════════════════════╝

    INSERT INTO customer_statuses (company_id, code, name, name_ar, color, allows_sales_orders, allows_invoicing, allows_credit, is_blocked, sort_order)
    VALUES
      (comp.id, 'ACTIVE',      'Active',               'نشط',               '#22c55e', true,  true,  true,  false, 1),
      (comp.id, 'PROSPECT',    'Prospect',             'عميل محتمل',        '#3b82f6', false, false, false, false, 2),
      (comp.id, 'PENDING',     'Pending Approval',     'بانتظار الموافقة',   '#eab308', false, false, false, false, 3),
      (comp.id, 'ON_HOLD',     'On Hold',              'معلّق',             '#f97316', false, false, false, false, 4),
      (comp.id, 'CREDIT_HOLD', 'Credit Hold',          'محتجز ائتمانياً',   '#ef4444', true,  true,  false, false, 5),
      (comp.id, 'BLOCKED',     'Blocked',              'محظور',             '#dc2626', false, false, false, true,  6),
      (comp.id, 'INACTIVE',    'Inactive',             'غير نشط',           '#6b7280', false, false, false, false, 7),
      (comp.id, 'CLOSED',      'Closed',               'مغلق',              '#374151', false, false, false, true,  8)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, color = EXCLUDED.color,
      sort_order = EXCLUDED.sort_order;


    -- ╔════════════════════════════════════════════════════════════════════╗
    -- ║ 7. PURCHASE ORDER STATUSES - حالات أوامر الشراء                    ║
    -- ╚════════════════════════════════════════════════════════════════════╝

    INSERT INTO purchase_order_statuses (company_id, code, name, name_ar, color, allows_edit, allows_delete, allows_receive, allows_invoice, is_terminal, sort_order)
    VALUES
      (comp.id, 'DRAFT',      'Draft',                'مسودة',             'gray',    true,  true,  false, false, false, 1),
      (comp.id, 'PENDING',    'Pending Approval',     'بانتظار الموافقة',   'yellow',  false, false, false, false, false, 2),
      (comp.id, 'APPROVED',   'Approved',             'معتمد',             'blue',    false, false, true,  true,  false, 3),
      (comp.id, 'ORDERED',    'Ordered',              'تم الطلب',           'indigo',  false, false, true,  true,  false, 4),
      (comp.id, 'PARTIAL',    'Partially Received',   'مستلم جزئياً',      'orange',  false, false, true,  true,  false, 5),
      (comp.id, 'RECEIVED',   'Fully Received',       'مستلم بالكامل',     'green',   false, false, false, true,  false, 6),
      (comp.id, 'INVOICED',   'Invoiced',             'تمت الفوترة',       'purple',  false, false, false, false, false, 7),
      (comp.id, 'CLOSED',     'Closed',               'مغلق',              'gray',    false, false, false, false, true,  8),
      (comp.id, 'CANCELLED',  'Cancelled',            'ملغي',              'red',     false, false, false, false, true,  9),
      (comp.id, 'RETURNED',   'Returned',             'مرتجع',             'red',     false, false, false, false, true,  10)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, color = EXCLUDED.color,
      sort_order = EXCLUDED.sort_order;


    -- ╔════════════════════════════════════════════════════════════════════╗
    -- ║ 8. CONTRACT TYPES - أنواع العقود                                   ║
    -- ╚════════════════════════════════════════════════════════════════════╝

    INSERT INTO contract_types (company_id, code, name, name_ar, description, duration_type, requires_approval, sort_order)
    VALUES
      (comp.id, 'ANNUAL',     'Annual Contract',       'عقد سنوي',           'Yearly renewable contract',          'annual',    true,  1),
      (comp.id, 'SHIPMENT',   'Per Shipment',          'عقد لكل شحنة',       'Single shipment contract',           'shipment',  false, 2),
      (comp.id, 'PROJECT',    'Project Contract',      'عقد مشروع',          'Project-based contract',             'project',   true,  3),
      (comp.id, 'BLANKET',    'Blanket Order',         'أمر شامل',           'Blanket/standing agreement',         'annual',    true,  4),
      (comp.id, 'SERVICE',    'Service Agreement',     'اتفاقية خدمات',      'Ongoing service contract',           'annual',    true,  5),
      (comp.id, 'FRAMEWORK',  'Framework Agreement',   'اتفاقية إطارية',     'Framework/master agreement',         'annual',    true,  6),
      (comp.id, 'SPOT',       'Spot Purchase',         'شراء فوري',          'One-time spot purchase',             'shipment',  false, 7),
      (comp.id, 'LEASE',      'Lease Agreement',       'عقد إيجار',          'Equipment or property lease',         'annual',    true,  8),
      (comp.id, 'SLA',        'Service Level Agreement','اتفاقية مستوى خدمة', 'Service level agreement',           'annual',    true,  9),
      (comp.id, 'MAINT',      'Maintenance Contract',  'عقد صيانة',          'Equipment maintenance contract',     'annual',    true,  10),
      (comp.id, 'CONSIGN',    'Consignment',           'عقد أمانة',          'Consignment arrangement',            'annual',    false, 11)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, description = EXCLUDED.description,
      duration_type = EXCLUDED.duration_type, sort_order = EXCLUDED.sort_order;


    -- ╔════════════════════════════════════════════════════════════════════╗
    -- ║ 9. CONTRACT STATUSES - حالات العقود                                ║
    -- ╚════════════════════════════════════════════════════════════════════╝

    INSERT INTO contract_statuses (company_id, code, name, name_ar, color, allows_purchase_orders, is_terminal, sort_order)
    VALUES
      (comp.id, 'DRAFT',       'Draft',                'مسودة',             'gray',    false, false, 1),
      (comp.id, 'REVIEW',      'Under Review',         'قيد المراجعة',       'yellow',  false, false, 2),
      (comp.id, 'NEGOTIATION', 'In Negotiation',       'قيد التفاوض',        'orange',  false, false, 3),
      (comp.id, 'PENDING',     'Pending Approval',     'بانتظار الموافقة',   'blue',    false, false, 4),
      (comp.id, 'APPROVED',    'Approved',             'معتمد',             'green',   true,  false, 5),
      (comp.id, 'ACTIVE',      'Active',               'نشط',               'green',   true,  false, 6),
      (comp.id, 'ON_HOLD',     'On Hold',              'معلّق',             'orange',  false, false, 7),
      (comp.id, 'EXPIRED',     'Expired',              'منتهي الصلاحية',    'gray',    false, true,  8),
      (comp.id, 'SUSPENDED',   'Suspended',            'موقوف',             'red',     false, false, 9),
      (comp.id, 'TERMINATED',  'Terminated',           'منتهي',              'red',     false, true,  10),
      (comp.id, 'RENEWED',     'Renewed',              'مجدد',              'blue',    true,  false, 11),
      (comp.id, 'CLOSED',      'Closed',               'مغلق',              'gray',    false, true,  12)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, color = EXCLUDED.color,
      sort_order = EXCLUDED.sort_order;


    -- ╔════════════════════════════════════════════════════════════════════╗
    -- ║ 10. SUPPLY TERMS - شروط التوريد                                   ║
    -- ╚════════════════════════════════════════════════════════════════════╝

    INSERT INTO supply_terms (company_id, code, name, name_ar, description, supply_type, allows_partial_delivery, min_delivery_percent, sort_order)
    VALUES
      (comp.id, 'FULL',       'Full Delivery',         'تسليم كامل',         'Complete order delivery at once',      'full',     false, 100.00, 1),
      (comp.id, 'PARTIAL',    'Partial Delivery',      'تسليم جزئي',         'Allow partial delivery of order',     'partial',  true,  10.00,  2),
      (comp.id, 'SHIPMENT',   'Per Shipment',          'لكل شحنة',           'Delivery per individual shipment',    'shipment', true,  NULL,   3),
      (comp.id, 'SCHED',      'Scheduled Delivery',    'تسليم مجدول',        'Fixed schedule deliveries',           'full',     true,  25.00,  4),
      (comp.id, 'JIT',        'Just In Time',          'في الوقت المحدد',    'JIT delivery as needed',              'partial',  true,  5.00,   5),
      (comp.id, 'CONSIGN',    'Consignment',           'أمانة',              'Consignment stock delivery',          'partial',  true,  NULL,   6),
      (comp.id, 'DROP',       'Drop Ship',             'شحن مباشر',          'Direct from vendor to customer',      'full',     false, 100.00, 7),
      (comp.id, 'BLANKET',    'Blanket Release',       'إفراج شامل',         'Release against blanket order',       'partial',  true,  NULL,   8)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, description = EXCLUDED.description,
      supply_type = EXCLUDED.supply_type, sort_order = EXCLUDED.sort_order;


    -- ╔════════════════════════════════════════════════════════════════════╗
    -- ║ 11. DELIVERY TERMS (INCOTERMS 2020) - شروط التسليم               ║
    -- ╚════════════════════════════════════════════════════════════════════╝

    INSERT INTO delivery_terms (company_id, code, name, name_ar, description, incoterm_code, delivery_location, freight_responsibility, insurance_responsibility, sort_order)
    VALUES
      (comp.id, 'EXW',   'Ex Works',                          'تسليم المصنع',                   'Buyer bears all costs from seller''s premises',    'EXW', 'seller_premises', 'buyer',  'buyer',  1),
      (comp.id, 'FCA',   'Free Carrier',                      'التسليم للناقل',                  'Seller delivers to carrier at named place',        'FCA', 'named_place',     'buyer',  'buyer',  2),
      (comp.id, 'CPT',   'Carriage Paid To',                  'النقل مدفوع إلى',                'Seller pays freight to destination',                'CPT', 'destination',     'seller', 'buyer',  3),
      (comp.id, 'CIP',   'Carriage & Insurance Paid To',      'النقل والتأمين مدفوع إلى',       'Seller pays freight and insurance',                 'CIP', 'destination',     'seller', 'seller', 4),
      (comp.id, 'DAP',   'Delivered at Place',                 'التسليم في المكان',               'Seller delivers to named place (unloading buyer)',  'DAP', 'destination',     'seller', 'seller', 5),
      (comp.id, 'DPU',   'Delivered at Place Unloaded',        'التسليم في المكان مفرغاً',        'Seller delivers and unloads at destination',        'DPU', 'destination',     'seller', 'seller', 6),
      (comp.id, 'DDP',   'Delivered Duty Paid',                'التسليم مع دفع الرسوم',          'Seller bears all costs including import duties',    'DDP', 'destination',     'seller', 'seller', 7),
      (comp.id, 'FAS',   'Free Alongside Ship',               'التسليم بجانب السفينة',           'Seller delivers alongside vessel (sea only)',       'FAS', 'port_of_shipment','buyer',  'buyer',  8),
      (comp.id, 'FOB',   'Free On Board',                      'التسليم على ظهر السفينة',         'Seller delivers on board vessel (sea only)',        'FOB', 'port_of_shipment','buyer',  'buyer',  9),
      (comp.id, 'CFR',   'Cost and Freight',                   'التكلفة والشحن',                 'Seller pays freight to port of destination',        'CFR', 'port_of_destination','seller','buyer', 10),
      (comp.id, 'CIF',   'Cost, Insurance and Freight',        'التكلفة والتأمين والشحن',        'Seller pays freight and insurance (sea only)',      'CIF', 'port_of_destination','seller','seller',11),
      (comp.id, 'LOCAL', 'Local Delivery',                     'تسليم محلي',                     'Local delivery within same city/country',           NULL,  'buyer_warehouse', 'seller', 'seller', 12)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, description = EXCLUDED.description,
      incoterm_code = EXCLUDED.incoterm_code, sort_order = EXCLUDED.sort_order;


    -- ╔════════════════════════════════════════════════════════════════════╗
    -- ║ 12. WAREHOUSE TYPES - أنواع المستودعات                            ║
    -- ╚════════════════════════════════════════════════════════════════════╝

    INSERT INTO warehouse_types (company_id, code, name, name_ar, warehouse_category, allows_sales, allows_purchases, allows_transfers, is_default, sort_order)
    VALUES
      (comp.id, 'WT-MAIN',    'Main Warehouse',        'المستودع الرئيسي',    'main',       true,  true,  true,  true,  1),
      (comp.id, 'WT-BRANCH',  'Branch Warehouse',      'مستودع فرعي',         'branch',     true,  true,  true,  false, 2),
      (comp.id, 'WT-COLD',    'Cold Storage',           'تخزين بارد',          'cold',       true,  true,  true,  false, 3),
      (comp.id, 'WT-3PL',     'Third Party Logistics',  'مستودع طرف ثالث',     'external',   true,  true,  true,  false, 4),
      (comp.id, 'WT-TRANSIT', 'Transit Warehouse',      'مستودع ترانزيت',      'transit',    false, false, true,  false, 5),
      (comp.id, 'WT-QUAR',   'Quarantine',              'مستودع حجر',          'quarantine', false, false, true,  false, 6),
      (comp.id, 'WT-FZ',     'Free Zone',               'منطقة حرة',           'free_zone',  true,  true,  true,  false, 7),
      (comp.id, 'WT-BOND',   'Bonded Warehouse',        'مستودع جمركي',        'bonded',     false, true,  true,  false, 8),
      (comp.id, 'WT-RET',    'Returns Warehouse',       'مستودع مرتجعات',      'returns',    false, false, true,  false, 9),
      (comp.id, 'WT-DIST',   'Distribution Center',     'مركز توزيع',          'distribution',true, false, true,  false, 10),
      (comp.id, 'WT-PROD',   'Production Warehouse',    'مستودع إنتاج',        'production', false, true,  true,  false, 11),
      (comp.id, 'WT-HZRD',   'Hazardous Materials',     'مواد خطرة',           'hazardous',  false, true,  true,  false, 12),
      (comp.id, 'WT-TEMP',   'Temporary Storage',       'تخزين مؤقت',          'temporary',  false, false, true,  false, 13),
      (comp.id, 'WT-SHOW',   'Showroom',                'صالة عرض',            'showroom',   true,  false, true,  false, 14)
    ON CONFLICT (company_id, code) WHERE deleted_at IS NULL DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar,
      warehouse_category = EXCLUDED.warehouse_category, sort_order = EXCLUDED.sort_order;


    -- ╔════════════════════════════════════════════════════════════════════╗
    -- ║ 13. SHIPPING METHODS - طرق الشحن                                  ║
    -- ╚════════════════════════════════════════════════════════════════════╝

    INSERT INTO shipping_methods (company_id, code, name, name_ar, transport_mode, transit_days, tracking_available, sort_order)
    VALUES
      (comp.id, 'SEA-FCL',    'Sea Freight - FCL',     'شحن بحري - حاوية كاملة',     'sea',   25, true,  1),
      (comp.id, 'SEA-LCL',    'Sea Freight - LCL',     'شحن بحري - حاوية مشتركة',    'sea',   30, true,  2),
      (comp.id, 'SEA-BULK',   'Sea Freight - Bulk',    'شحن بحري - سائب',            'sea',   25, true,  3),
      (comp.id, 'SEA-RORO',   'Sea Freight - Ro-Ro',   'شحن بحري - رورو',            'sea',   20, true,  4),
      (comp.id, 'AIR-STD',    'Air Freight - Standard', 'شحن جوي - عادي',            'air',   5,  true,  5),
      (comp.id, 'AIR-EXP',    'Air Freight - Express',  'شحن جوي - سريع',            'air',   2,  true,  6),
      (comp.id, 'AIR-CHART',  'Air Charter',            'طائرة مستأجرة',              'air',   1,  true,  7),
      (comp.id, 'LAND-FTL',   'Land - Full Truck',      'بري - شاحنة كاملة',          'land',  5,  true,  8),
      (comp.id, 'LAND-LTL',   'Land - Less Than Truck', 'بري - حمولة جزئية',          'land',  7,  true,  9),
      (comp.id, 'LAND-FLAT',  'Land - Flatbed',         'بري - مسطحة',                'land',  5,  true,  10),
      (comp.id, 'LAND-REF',   'Land - Refrigerated',    'بري - مبرد',                 'land',  5,  true,  11),
      (comp.id, 'RAIL-STD',   'Rail Freight',            'شحن بالسكك الحديدية',        'rail',  15, true,  12),
      (comp.id, 'MULTI',      'Multimodal',              'شحن متعدد الوسائط',          'multi', 20, true,  13),
      (comp.id, 'COURIER',    'Courier/Express',         'بريد سريع',                  'air',   3,  true,  14),
      (comp.id, 'LOCAL-DEL',  'Local Delivery',          'توصيل محلي',                 'land',  1,  true,  15),
      (comp.id, 'PICKUP',     'Customer Pickup',         'استلام شخصي',                'land',  0,  true,  16)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar,
      transport_mode = EXCLUDED.transport_mode, transit_days = EXCLUDED.transit_days, sort_order = EXCLUDED.sort_order;


    -- ╔════════════════════════════════════════════════════════════════════╗
    -- ║ 14. UNITS OF MEASURE - وحدات القياس                               ║
    -- ╚════════════════════════════════════════════════════════════════════╝

    -- Step 1: Insert base units first (satisfy CHECK: is_base_unit = true)
    INSERT INTO units (company_id, code, name, name_ar, unit_type, is_base_unit, sort_order)
    VALUES
      (comp.id, 'KG',   'Kilogram',       'كيلوغرام',     'weight', true,  1),
      (comp.id, 'M',    'Meter',          'متر',           'length', true,  7),
      (comp.id, 'L',    'Liter',          'لتر',           'volume', true,  14),
      (comp.id, 'PCS',  'Piece',          'قطعة',           'piece', true,  19),
      (comp.id, 'SQM',  'Square Meter',   'متر مربع',       'other', true,  32),
      (comp.id, 'HR',   'Hour',           'ساعة',           'other', true,  34),
      (comp.id, 'TRIP', 'Trip',           'رحلة',           'other', true,  37),
      (comp.id, 'LOT',  'Lot',            'دفعة',           'other', true,  38)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar,
      unit_type = EXCLUDED.unit_type, sort_order = EXCLUDED.sort_order;

    -- Step 2: Insert non-base units with base_unit_id and conversion_factor
    -- (satisfy CHECK: is_base_unit = false requires base_unit_id IS NOT NULL AND conversion_factor IS NOT NULL)

    -- Weight units (base: KG)
    INSERT INTO units (company_id, code, name, name_ar, unit_type, is_base_unit, base_unit_id, conversion_factor, sort_order)
    SELECT comp.id, v.code, v.name, v.name_ar, 'weight', false,
      (SELECT id FROM units u2 WHERE u2.company_id = comp.id AND u2.code = 'KG' AND u2.deleted_at IS NULL LIMIT 1),
      v.factor, v.srt
    FROM (VALUES
      ('G',    'Gram',       'غرام',      0.001::numeric,    2),
      ('MG',   'Milligram',  'ملليغرام',  0.000001::numeric, 3),
      ('TON',  'Metric Ton', 'طن متري',   1000::numeric,     4),
      ('LB',   'Pound',      'رطل',       0.453592::numeric, 5),
      ('OZ',   'Ounce',      'أونصة',     0.0283495::numeric,6)
    ) AS v(code, name, name_ar, factor, srt)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar,
      base_unit_id = EXCLUDED.base_unit_id, conversion_factor = EXCLUDED.conversion_factor, sort_order = EXCLUDED.sort_order;

    -- Length units (base: M)
    INSERT INTO units (company_id, code, name, name_ar, unit_type, is_base_unit, base_unit_id, conversion_factor, sort_order)
    SELECT comp.id, v.code, v.name, v.name_ar, 'length', false,
      (SELECT id FROM units u2 WHERE u2.company_id = comp.id AND u2.code = 'M' AND u2.deleted_at IS NULL LIMIT 1),
      v.factor, v.srt
    FROM (VALUES
      ('CM',   'Centimeter',  'سنتيمتر',  0.01::numeric,    8),
      ('MM',   'Millimeter',  'ملليمتر',  0.001::numeric,   9),
      ('KM',   'Kilometer',   'كيلومتر',  1000::numeric,    10),
      ('IN',   'Inch',        'بوصة',     0.0254::numeric,  11),
      ('FT',   'Foot',        'قدم',      0.3048::numeric,  12),
      ('YD',   'Yard',        'ياردة',    0.9144::numeric,  13)
    ) AS v(code, name, name_ar, factor, srt)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar,
      base_unit_id = EXCLUDED.base_unit_id, conversion_factor = EXCLUDED.conversion_factor, sort_order = EXCLUDED.sort_order;

    -- Volume units (base: L)
    INSERT INTO units (company_id, code, name, name_ar, unit_type, is_base_unit, base_unit_id, conversion_factor, sort_order)
    SELECT comp.id, v.code, v.name, v.name_ar, 'volume', false,
      (SELECT id FROM units u2 WHERE u2.company_id = comp.id AND u2.code = 'L' AND u2.deleted_at IS NULL LIMIT 1),
      v.factor, v.srt
    FROM (VALUES
      ('ML',   'Milliliter',  'ملليلتر',      0.001::numeric,    15),
      ('M3',   'Cubic Meter', 'متر مكعب',     1000::numeric,     16),
      ('GAL',  'Gallon (US)', 'غالون أمريكي', 3.78541::numeric,  17),
      ('BBL',  'Barrel',      'برميل',         158.987::numeric,  18)
    ) AS v(code, name, name_ar, factor, srt)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar,
      base_unit_id = EXCLUDED.base_unit_id, conversion_factor = EXCLUDED.conversion_factor, sort_order = EXCLUDED.sort_order;

    -- Piece/Count units (base: PCS)
    INSERT INTO units (company_id, code, name, name_ar, unit_type, is_base_unit, base_unit_id, conversion_factor, sort_order)
    SELECT comp.id, v.code, v.name, v.name_ar, 'piece', false,
      (SELECT id FROM units u2 WHERE u2.company_id = comp.id AND u2.code = 'PCS' AND u2.deleted_at IS NULL LIMIT 1),
      v.factor, v.srt
    FROM (VALUES
      ('PKG',  'Package',    'طرد',            1::numeric,   20),
      ('BOX',  'Box',        'صندوق',          1::numeric,   21),
      ('CTN',  'Carton',     'كرتون',          1::numeric,   22),
      ('PAL',  'Pallet',     'طبلية',          1::numeric,   23),
      ('SET',  'Set',        'طقم',            1::numeric,   24),
      ('DZ',   'Dozen',      'دستة',           12::numeric,  25),
      ('PAIR', 'Pair',       'زوج',            2::numeric,   26),
      ('ROLL', 'Roll',       'لفة',            1::numeric,   27),
      ('BAG',  'Bag',        'كيس',            1::numeric,   28),
      ('DRUM', 'Drum',       'برميل/أسطوانة',  1::numeric,   29),
      ('BNDL', 'Bundle',     'حزمة',           1::numeric,   30),
      ('CONT', 'Container',  'حاوية',          1::numeric,   31)
    ) AS v(code, name, name_ar, factor, srt)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar,
      base_unit_id = EXCLUDED.base_unit_id, conversion_factor = EXCLUDED.conversion_factor, sort_order = EXCLUDED.sort_order;

    -- Other units (base: SQM for area, HR for time)
    INSERT INTO units (company_id, code, name, name_ar, unit_type, is_base_unit, base_unit_id, conversion_factor, sort_order)
    SELECT comp.id, v.code, v.name, v.name_ar, 'other', false, v.base_id, v.factor, v.srt
    FROM (VALUES
      ('SQFT', 'Square Foot', 'قدم مربع',
        (SELECT id FROM units u2 WHERE u2.company_id = comp.id AND u2.code = 'SQM' AND u2.deleted_at IS NULL LIMIT 1),
        0.092903::numeric, 33),
      ('DAY',  'Day',         'يوم',
        (SELECT id FROM units u2 WHERE u2.company_id = comp.id AND u2.code = 'HR' AND u2.deleted_at IS NULL LIMIT 1),
        24::numeric, 35),
      ('MON',  'Month',       'شهر',
        (SELECT id FROM units u2 WHERE u2.company_id = comp.id AND u2.code = 'HR' AND u2.deleted_at IS NULL LIMIT 1),
        720::numeric, 36)
    ) AS v(code, name, name_ar, base_id, factor, srt)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name, name_ar = EXCLUDED.name_ar,
      base_unit_id = EXCLUDED.base_unit_id, conversion_factor = EXCLUDED.conversion_factor, sort_order = EXCLUDED.sort_order;


  END LOOP;
END $$;


COMMIT;
