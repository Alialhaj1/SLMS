-- Migration 432: Create missing tables/views + seed remaining empty tables
-- Tables: po_statuses (view), storage_location_types (new table)
-- Seed: customer_classifications, customer_groups, item_groups, storage_location_types
-- reference_data: group_levels, credit_limits, discount_agreements

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. CREATE VIEW po_statuses → alias for purchase_order_statuses
-- Route poStatuses.ts queries po_statuses with name_en/name_ar
-- purchase_order_statuses has name/name_ar, so we alias name → name_en
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW po_statuses AS
SELECT id, company_id, code, name AS name_en, name_ar, color,
       allows_edit, allows_delete, allows_receive, allows_invoice,
       is_terminal, sort_order, is_active, created_at, updated_at, deleted_at
FROM purchase_order_statuses;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. CREATE TABLE storage_location_types (bin types)
-- Route storageLocationTypes.ts queries name_en, name_ar
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS storage_location_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description_en TEXT,
    description_ar TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Seed storage_location_types (bin types for warehouse management)
INSERT INTO storage_location_types (code, name_en, name_ar, description_en, description_ar, sort_order) VALUES
('RACK', 'Rack Storage', 'تخزين رفوف', 'Standard pallet rack storage', 'تخزين رفوف بالتات قياسي', 1),
('SHELF', 'Shelf Storage', 'تخزين أرفف', 'Shelving for small items', 'أرفف للأصناف الصغيرة', 2),
('BIN', 'Bin Location', 'موقع حاوية', 'Individual bin or container', 'حاوية أو صندوق فردي', 3),
('FLOOR', 'Floor Storage', 'تخزين أرضي', 'Open floor bulk storage', 'تخزين أرضي بالجملة', 4),
('COLD', 'Cold Storage', 'تخزين بارد', 'Temperature-controlled cold room', 'غرفة باردة مبردة', 5),
('FREEZE', 'Freezer Storage', 'تخزين مجمد', 'Deep-freeze storage area', 'منطقة تجميد عميق', 6),
('HAZMAT', 'Hazardous Materials', 'مواد خطرة', 'Designated hazardous storage', 'تخزين مواد خطرة مخصص', 7),
('OUTDOOR', 'Outdoor Yard', 'ساحة خارجية', 'Open-air outdoor storage yard', 'ساحة تخزين خارجية مفتوحة', 8),
('STAGING', 'Staging Area', 'منطقة تجهيز', 'Temporary staging/dispatch zone', 'منطقة تجهيز وإرسال مؤقتة', 9),
('MEZZANINE', 'Mezzanine Level', 'طابق ميزانين', 'Elevated mezzanine floor storage', 'تخزين طابق ميزانين مرتفع', 10),
('DRIVE_IN', 'Drive-In Rack', 'رف دخول مباشر', 'Drive-in racking for high density', 'رفوف دخول مباشر للكثافة العالية', 11),
('CANTILVR', 'Cantilever Rack', 'رف كابولي', 'Long/bulky item cantilever storage', 'تخزين كابولي للأصناف الطويلة', 12);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. SEED customer_classifications (company-scoped)
-- Schema: id, company_id, code, name, name_ar, classification_type, parent_id,
--         credit_limit_default, payment_terms_default, discount_percentage, color, is_active
-- classification_type values: size, industry, region, priority, custom
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO customer_classifications (company_id, code, name, name_ar, classification_type, credit_limit_default, discount_percentage, color, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.ctype, v.credit_lim, v.disc_pct, v.color, true
FROM (VALUES (1),(6),(7),(8),(9),(10)) AS c(id)
CROSS JOIN (VALUES
  ('VIP', 'VIP Customer', 'عميل مميز', 'priority', 500000, 10.0, '#FFD700'),
  ('PLATINUM', 'Platinum', 'بلاتيني', 'priority', 300000, 8.0, '#E5E4E2'),
  ('GOLD', 'Gold', 'ذهبي', 'priority', 200000, 6.0, '#DAA520'),
  ('SILVER', 'Silver', 'فضي', 'priority', 100000, 4.0, '#C0C0C0'),
  ('BRONZE', 'Bronze', 'برونزي', 'priority', 50000, 2.0, '#CD7F32'),
  ('LARGE', 'Large Enterprise', 'مؤسسة كبيرة', 'size', 500000, 8.0, '#1E3A5F'),
  ('MEDIUM', 'Medium Business', 'منشأة متوسطة', 'size', 200000, 5.0, '#2E86C1'),
  ('SMALL', 'Small Business', 'منشأة صغيرة', 'size', 50000, 3.0, '#85C1E9'),
  ('MICRO', 'Micro Business', 'منشأة متناهية الصغر', 'size', 20000, 1.0, '#AED6F1'),
  ('IND_FOOD', 'Food & Beverage', 'أغذية ومشروبات', 'industry', 150000, 5.0, '#27AE60'),
  ('IND_CONSTR', 'Construction', 'مقاولات وبناء', 'industry', 300000, 4.0, '#E67E22'),
  ('IND_PETRO', 'Oil & Gas', 'نفط وغاز', 'industry', 1000000, 3.0, '#2C3E50'),
  ('IND_RETAIL', 'Retail', 'تجزئة', 'industry', 100000, 6.0, '#8E44AD'),
  ('IND_HEALTH', 'Healthcare', 'رعاية صحية', 'industry', 200000, 4.0, '#E74C3C'),
  ('REG_CENT', 'Central Region', 'المنطقة الوسطى', 'region', 0, 0, '#3498DB'),
  ('REG_WEST', 'Western Region', 'المنطقة الغربية', 'region', 0, 0, '#1ABC9C'),
  ('REG_EAST', 'Eastern Province', 'المنطقة الشرقية', 'region', 0, 0, '#F39C12'),
  ('REG_SOUTH', 'Southern Region', 'المنطقة الجنوبية', 'region', 0, 0, '#E74C3C'),
  ('GOV_SECT', 'Government Sector', 'قطاع حكومي', 'custom', 0, 0, '#34495E'),
  ('EXPORT', 'Export Customer', 'عميل تصدير', 'custom', 250000, 5.0, '#16A085')
) AS v(code, name, name_ar, ctype, credit_lim, disc_pct, color)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. SEED customer_groups (company-scoped)
-- Schema: id, company_id, code, name, name_ar, description,
--         default_payment_terms_id, default_price_list_id, credit_limit,
--         discount_percent, receivable_account_id, is_active
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO customer_groups (company_id, code, name, name_ar, description, credit_limit, discount_percent, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.descr, v.credit_lim, v.disc_pct, true
FROM (VALUES (1),(6),(7),(8),(9),(10)) AS c(id)
CROSS JOIN (VALUES
  ('RETAIL', 'Retail Customers', 'عملاء التجزئة', 'Individual and retail shop customers', 50000, 3.0),
  ('WHOLESALE', 'Wholesale Customers', 'عملاء الجملة', 'Bulk buying wholesale customers', 200000, 8.0),
  ('CORPORATE', 'Corporate Accounts', 'حسابات الشركات', 'Large corporate and enterprise clients', 500000, 10.0),
  ('GOVERNMENT', 'Government Entities', 'جهات حكومية', 'Government ministries and agencies', 0, 0),
  ('DISTRIBUTOR', 'Distributors', 'موزعون', 'Authorized distribution partners', 300000, 12.0),
  ('EXPORT_CUS', 'Export Customers', 'عملاء التصدير', 'International export customers', 250000, 5.0),
  ('KEY_ACCT', 'Key Accounts', 'حسابات رئيسية', 'Strategic key accounts with special terms', 1000000, 15.0),
  ('DEALER', 'Dealers & Agents', 'تجار ووكلاء', 'Authorized dealers and sales agents', 150000, 7.0),
  ('PROJECT', 'Project Customers', 'عملاء المشاريع', 'Project-based one-time customers', 100000, 4.0),
  ('WALK_IN', 'Walk-in Customers', 'عملاء مباشرون', 'Cash-and-carry walk-in customers', 0, 0)
) AS v(code, name, name_ar, descr, credit_lim, disc_pct)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. SEED item_groups (company-scoped)
-- Schema: id, company_id, code, name, name_ar, description, is_active
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO item_groups (company_id, code, name, name_ar, description, is_active)
SELECT c.id, v.code, v.name, v.name_ar, v.descr, true
FROM (VALUES (1),(6),(7),(8),(9),(10)) AS c(id)
CROSS JOIN (VALUES
  ('RAW_MAT', 'Raw Materials', 'مواد خام', 'Unprocessed raw materials for production'),
  ('FINISH_GD', 'Finished Goods', 'منتجات تامة', 'Completed ready-to-sell products'),
  ('SEMI_FIN', 'Semi-Finished', 'منتجات نصف مصنعة', 'Work-in-progress semi-finished items'),
  ('SPARE_PRT', 'Spare Parts', 'قطع غيار', 'Maintenance and replacement spare parts'),
  ('CONSUMABL', 'Consumables', 'مستهلكات', 'Office and operational consumable supplies'),
  ('PACKAGING', 'Packaging', 'مواد تعبئة', 'Packaging and wrapping materials'),
  ('CHEMICALS', 'Chemicals', 'مواد كيميائية', 'Industrial and laboratory chemicals'),
  ('FOOD_PROD', 'Food Products', 'منتجات غذائية', 'Edible food and beverage products'),
  ('ELECTRNCS', 'Electronics', 'إلكترونيات', 'Electronic devices and components'),
  ('TEXTILES', 'Textiles & Fabrics', 'أقمشة ومنسوجات', 'Fabric rolls and textile materials'),
  ('METALS', 'Metals & Steel', 'معادن وحديد', 'Metal sheets, bars, and steel products'),
  ('CONSTR_MT', 'Construction Materials', 'مواد بناء', 'Cement, bricks, tiles, and building materials'),
  ('AGRI_PROD', 'Agricultural Products', 'منتجات زراعية', 'Seeds, fertilizers, and farm products'),
  ('FUEL_LUBE', 'Fuels & Lubricants', 'وقود وزيوت', 'Petroleum fuels and industrial lubricants'),
  ('SERVICES', 'Service Items', 'أصناف خدمية', 'Non-stock service and labor items')
) AS v(code, name, name_ar, descr)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. SEED reference_data: group_levels
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO reference_data (type, code, name_en, name_ar, description_en, description_ar, is_active)
VALUES
  ('group_levels', 'LVL1', 'Level 1 - Main Group', 'المستوى 1 - مجموعة رئيسية', 'Top-level main classification group', 'مجموعة تصنيف رئيسية عليا', true),
  ('group_levels', 'LVL2', 'Level 2 - Sub Group', 'المستوى 2 - مجموعة فرعية', 'Second-level sub classification', 'تصنيف فرعي من المستوى الثاني', true),
  ('group_levels', 'LVL3', 'Level 3 - Detail Group', 'المستوى 3 - مجموعة تفصيلية', 'Third-level detail group', 'مجموعة تفصيلية من المستوى الثالث', true),
  ('group_levels', 'LVL4', 'Level 4 - Item Level', 'المستوى 4 - مستوى الصنف', 'Lowest item-level classification', 'تصنيف على مستوى الصنف الأدنى', true),
  ('group_levels', 'LVL5', 'Level 5 - Variant Level', 'المستوى 5 - مستوى المتغير', 'Product variant sub-level', 'مستوى فرعي لمتغيرات المنتج', true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. SEED reference_data: credit_limits (tiers for customer management)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO reference_data (type, code, name_en, name_ar, description_en, description_ar, is_active)
VALUES
  ('credit_limits', 'CL_NONE', 'No Credit', 'بدون ائتمان', 'Cash-only, no credit extended', 'نقدي فقط، بدون ائتمان', true),
  ('credit_limits', 'CL_5K', '5,000 SAR', '5,000 ريال', 'Credit limit up to 5,000 SAR', 'حد ائتمان حتى 5,000 ريال', true),
  ('credit_limits', 'CL_10K', '10,000 SAR', '10,000 ريال', 'Credit limit up to 10,000 SAR', 'حد ائتمان حتى 10,000 ريال', true),
  ('credit_limits', 'CL_25K', '25,000 SAR', '25,000 ريال', 'Credit limit up to 25,000 SAR', 'حد ائتمان حتى 25,000 ريال', true),
  ('credit_limits', 'CL_50K', '50,000 SAR', '50,000 ريال', 'Credit limit up to 50,000 SAR', 'حد ائتمان حتى 50,000 ريال', true),
  ('credit_limits', 'CL_100K', '100,000 SAR', '100,000 ريال', 'Credit limit up to 100,000 SAR', 'حد ائتمان حتى 100,000 ريال', true),
  ('credit_limits', 'CL_250K', '250,000 SAR', '250,000 ريال', 'Credit limit up to 250,000 SAR', 'حد ائتمان حتى 250,000 ريال', true),
  ('credit_limits', 'CL_500K', '500,000 SAR', '500,000 ريال', 'Credit limit up to 500,000 SAR', 'حد ائتمان حتى 500,000 ريال', true),
  ('credit_limits', 'CL_1M', '1,000,000 SAR', '1,000,000 ريال', 'Credit limit up to 1,000,000 SAR', 'حد ائتمان حتى 1,000,000 ريال', true),
  ('credit_limits', 'CL_UNLIM', 'Unlimited', 'غير محدود', 'Unlimited credit - special approval', 'ائتمان غير محدود - موافقة خاصة', true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. SEED reference_data: discount_agreements
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO reference_data (type, code, name_en, name_ar, description_en, description_ar, is_active)
VALUES
  ('discount_agreements', 'DA_VOL', 'Volume Discount', 'خصم الكمية', 'Discount based on order volume/quantity', 'خصم يعتمد على حجم/كمية الطلب', true),
  ('discount_agreements', 'DA_TRADE', 'Trade Discount', 'خصم تجاري', 'Standard trade discount off list price', 'خصم تجاري قياسي من سعر القائمة', true),
  ('discount_agreements', 'DA_CASH', 'Cash Payment Discount', 'خصم الدفع النقدي', 'Discount for immediate cash payment', 'خصم للدفع النقدي الفوري', true),
  ('discount_agreements', 'DA_EARLY', 'Early Payment Discount', 'خصم الدفع المبكر', 'Discount for payment before due date', 'خصم للدفع قبل تاريخ الاستحقاق', true),
  ('discount_agreements', 'DA_LOYAL', 'Loyalty Discount', 'خصم الولاء', 'Loyalty program discount for repeat customers', 'خصم برنامج الولاء للعملاء المتكررين', true),
  ('discount_agreements', 'DA_SEASON', 'Seasonal Discount', 'خصم موسمي', 'Time-limited seasonal promotional discount', 'خصم ترويجي موسمي محدد المدة', true),
  ('discount_agreements', 'DA_BUNDLE', 'Bundle Discount', 'خصم الحزمة', 'Discount for purchasing bundled items', 'خصم عند شراء حزمة أصناف', true),
  ('discount_agreements', 'DA_CONTRACT', 'Contract Discount', 'خصم العقد', 'Pre-negotiated contract-based discount', 'خصم مبني على عقد متفاوض عليه مسبقاً', true),
  ('discount_agreements', 'DA_PROMO', 'Promotional Discount', 'خصم ترويجي', 'Special promotional campaign discount', 'خصم حملة ترويجية خاصة', true),
  ('discount_agreements', 'DA_CLEARANCE', 'Clearance Discount', 'خصم تصفية', 'Clearance sale discount for old stock', 'خصم تصفية للمخزون القديم', true)
ON CONFLICT DO NOTHING;

COMMIT;
