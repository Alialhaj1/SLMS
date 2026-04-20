-- Migration 430: Create missing tables and seed global/reference data
-- Creates: shipping_companies, shipment_classifications, group_categories
-- Seeds: border_points, reference_data (group_types, item_grades)

------------------------------------------------------------
-- 1. CREATE MISSING TABLES
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shipping_companies (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  contact_person VARCHAR(100),
  phone VARCHAR(30),
  email VARCHAR(100),
  address TEXT,
  services TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shipping_companies_uniq ON shipping_companies(company_id, code) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS shipment_classifications (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shipment_classifications_uniq ON shipment_classifications(company_id, code) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS group_categories (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_categories_uniq ON group_categories(company_id, code) WHERE deleted_at IS NULL;

------------------------------------------------------------
-- 2. SEED BORDER POINTS (global, Saudi Arabia)
------------------------------------------------------------

INSERT INTO border_points (country_id, name_en, name_ar, code, border_type, connecting_country_id, latitude, longitude, is_active, sort_order)
VALUES
  -- Land borders
  (1, 'King Fahd Causeway', 'جسر الملك فهد', 'KFCW', 'land', 7, 26.1069, 50.3250, TRUE, 1),
  (1, 'Al Batha Border Crossing', 'منفذ البطحاء', 'BTHA', 'land', 2, 24.2700, 51.5900, TRUE, 2),
  (1, 'Al Khafji Border Crossing', 'منفذ الخفجي', 'KHFJ', 'land', 6, 28.4300, 48.4900, TRUE, 3),
  (1, 'Halat Ammar Border Crossing', 'منفذ حالة عمار', 'HLAM', 'land', 5, 29.0900, 36.8600, TRUE, 4),
  (1, 'Al Tuwal Border Crossing', 'منفذ الطوال', 'TWLB', 'land', 3, 16.7400, 43.2200, TRUE, 5),
  (1, 'Al Wadia Border Crossing', 'منفذ الوديعة', 'WDIA', 'land', 3, 16.9400, 46.4100, TRUE, 6),
  (1, 'Al Haditha Border Crossing', 'منفذ الحديثة', 'HDTH', 'land', 5, 30.1600, 38.7800, TRUE, 7),
  (1, 'Salwa Border Crossing', 'منفذ سلوى', 'SLWA', 'land', 9, 24.5400, 50.7800, TRUE, 8),
  (1, 'Ras Al Mishaab', 'رأس المشعاب', 'RMSH', 'land', 6, 28.0900, 48.5500, TRUE, 9),
  (1, 'Al Raqae Border Crossing', 'منفذ الرقعي', 'RQAE', 'land', 6, 29.1100, 47.9200, TRUE, 10),
  -- Sea borders
  (1, 'Jeddah Islamic Seaport', 'ميناء جدة الإسلامي', 'JDSP', 'sea', NULL, 21.4500, 39.1800, TRUE, 11),
  (1, 'King Abdulaziz Seaport Dammam', 'ميناء الملك عبدالعزيز بالدمام', 'DMSP', 'sea', NULL, 26.4700, 50.1100, TRUE, 12),
  (1, 'Yanbu Commercial Seaport', 'ميناء ينبع التجاري', 'YNSP', 'sea', NULL, 24.0900, 38.0500, TRUE, 13),
  (1, 'Ras Al Khair Port', 'ميناء رأس الخير', 'RKSP', 'sea', NULL, 27.4700, 49.2700, TRUE, 14),
  (1, 'Jubail Commercial Seaport', 'ميناء الجبيل التجاري', 'JBSP', 'sea', NULL, 27.0000, 49.6700, TRUE, 15),
  -- Air borders
  (1, 'King Khalid Int. Airport - Riyadh', 'مطار الملك خالد الدولي - الرياض', 'KKIA', 'air', NULL, 24.9577, 46.6989, TRUE, 16),
  (1, 'King Abdulaziz Int. Airport - Jeddah', 'مطار الملك عبدالعزيز الدولي - جدة', 'KAIA', 'air', NULL, 21.6706, 39.1564, TRUE, 17),
  (1, 'King Fahd Int. Airport - Dammam', 'مطار الملك فهد الدولي - الدمام', 'KFIA', 'air', NULL, 26.4712, 49.7979, TRUE, 18),
  (1, 'Prince Mohammed Bin Abdulaziz Int. Airport - Madinah', 'مطار الأمير محمد بن عبدالعزيز الدولي - المدينة', 'PMIA', 'air', NULL, 24.5535, 39.7050, TRUE, 19),
  (1, 'Abha Regional Airport', 'مطار أبها الإقليمي', 'ABHA', 'air', NULL, 18.2404, 42.6567, TRUE, 20)
ON CONFLICT DO NOTHING;

------------------------------------------------------------
-- 3. SEED REFERENCE DATA: group_types
------------------------------------------------------------

INSERT INTO reference_data (type, code, name_en, name_ar, description_en, description_ar, is_active)
VALUES
  ('group_types', 'IMPORT', 'Import Group', 'مجموعة الاستيراد', 'Group for import operations', 'مجموعة لعمليات الاستيراد', TRUE),
  ('group_types', 'EXPORT', 'Export Group', 'مجموعة التصدير', 'Group for export operations', 'مجموعة لعمليات التصدير', TRUE),
  ('group_types', 'TRANSIT', 'Transit Group', 'مجموعة العبور', 'Group for transit and transshipment', 'مجموعة لعمليات العبور والنقل', TRUE),
  ('group_types', 'WAREHOUSE', 'Warehouse Group', 'مجموعة المستودعات', 'Group for warehouse operations', 'مجموعة لعمليات المستودعات', TRUE),
  ('group_types', 'PROJECT', 'Project Group', 'مجموعة المشاريع', 'Group for project-based operations', 'مجموعة للعمليات القائمة على المشاريع', TRUE),
  ('group_types', 'CUSTOMS', 'Customs Group', 'مجموعة الجمارك', 'Group for customs processing', 'مجموعة لعمليات التخليص الجمركي', TRUE),
  ('group_types', 'LOGISTICS', 'Logistics Group', 'مجموعة اللوجستيات', 'Group for logistics operations', 'مجموعة للعمليات اللوجستية', TRUE),
  ('group_types', 'MIXED', 'Mixed Group', 'مجموعة مختلطة', 'Group for mixed operations', 'مجموعة للعمليات المختلطة', TRUE)
ON CONFLICT DO NOTHING;

------------------------------------------------------------
-- 4. SEED REFERENCE DATA: item_grades
------------------------------------------------------------

INSERT INTO reference_data (type, code, name_en, name_ar, description_en, description_ar, is_active)
VALUES
  ('item_grades', 'GRADE_A', 'Grade A - Premium', 'الدرجة أ - ممتاز', 'Top tier quality', 'أعلى مستوى جودة', TRUE),
  ('item_grades', 'GRADE_B', 'Grade B - Standard', 'الدرجة ب - قياسي', 'Standard quality level', 'مستوى جودة قياسي', TRUE),
  ('item_grades', 'GRADE_C', 'Grade C - Economy', 'الدرجة ج - اقتصادي', 'Economy quality level', 'مستوى جودة اقتصادي', TRUE),
  ('item_grades', 'INDUSTRIAL', 'Industrial Grade', 'درجة صناعية', 'Industrial use specifications', 'مواصفات الاستخدام الصناعي', TRUE),
  ('item_grades', 'FOOD_GRADE', 'Food Grade', 'درجة غذائية', 'FDA/SFDA compliant for food', 'متوافقة مع معايير الغذاء والدواء', TRUE),
  ('item_grades', 'PHARMA', 'Pharmaceutical Grade', 'درجة دوائية', 'Pharmaceutical purity grade', 'درجة نقاوة دوائية', TRUE),
  ('item_grades', 'MILITARY', 'Military Grade', 'درجة عسكرية', 'MIL-SPEC compliant', 'متوافقة مع المواصفات العسكرية', TRUE),
  ('item_grades', 'COSMETIC', 'Cosmetic Grade', 'درجة تجميلية', 'Safe for cosmetic use', 'آمنة للاستخدام التجميلي', TRUE),
  ('item_grades', 'REAGENT', 'Reagent Grade', 'درجة كاشف', 'High purity for laboratory', 'نقاوة عالية للمختبرات', TRUE),
  ('item_grades', 'COMMERCIAL', 'Commercial Grade', 'درجة تجارية', 'General commercial quality', 'جودة تجارية عامة', TRUE)
ON CONFLICT DO NOTHING;
