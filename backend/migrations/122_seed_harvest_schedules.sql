-- Migration: 122_seed_harvest_schedules.sql
-- Purpose: Seed realistic harvest schedule data for different crops and seasons
-- Author: System
-- Date: 2026-01-12

-- =============================================================================
-- Insert realistic harvest schedules for various crops
-- =============================================================================

INSERT INTO harvest_schedules (
  company_id,
  code,
  name,
  name_ar,
  description,
  season,
  start_month,
  end_month,
  harvest_duration_days,
  region,
  country_id,
  notes,
  is_active,
  created_at,
  updated_at
) VALUES
-- =============================================================================
-- FRUITS (الفواكه)
-- =============================================================================

-- Oranges (البرتقال) - Winter crop
(1, 'HS-001', 'Orange Harvest - Winter', 'حصاد البرتقال - الشتاء',
 'Main orange harvest season for citrus fruits',
 'winter', 12, 3, 90, 'Mediterranean', 4,
 'Peak season for Valencia and Navel oranges. Best quality during December-March.',
 true, NOW(), NOW()),

-- Strawberries (الفراولة) - Spring crop
(1, 'HS-002', 'Strawberry Harvest - Spring', 'حصاد الفراولة - الربيع',
 'Primary strawberry harvest in spring months',
 'spring', 3, 5, 75, 'Coastal Regions', 4,
 'Optimal harvest time for fresh strawberries. Handle with care due to short shelf life.',
 true, NOW(), NOW()),

-- Mangoes (المانجو) - Summer crop
(1, 'HS-003', 'Mango Harvest - Summer', 'حصاد المانجو - الصيف',
 'Peak mango season for tropical varieties',
 'summer', 6, 8, 90, 'Tropical', 15,
 'Alphonso, Kesar, and Dasheri varieties. Monitor ripeness carefully.',
 true, NOW(), NOW()),

-- Grapes (العنب) - Summer/Fall
(1, 'HS-004', 'Grape Harvest - Summer', 'حصاد العنب - الصيف',
 'Wine and table grape harvest season',
 'summer', 7, 9, 60, 'Mediterranean', 13,
 'Critical timing for sugar content. Used for wine production and fresh consumption.',
 true, NOW(), NOW()),

-- Apples (التفاح) - Fall crop
(1, 'HS-005', 'Apple Harvest - Fall', 'حصاد التفاح - الخريف',
 'Main apple harvest season',
 'fall', 9, 11, 75, 'Temperate', 12,
 'Multiple varieties including Red Delicious, Gala, and Granny Smith. Store in cold conditions.',
 true, NOW(), NOW()),

-- Dates (التمور) - Summer/Fall
(1, 'HS-006', 'Date Palm Harvest', 'حصاد التمور',
 'Traditional date harvest season',
 'summer', 8, 10, 60, 'Desert/Oasis', 1,
 'Includes Medjool, Deglet Noor, and Ajwa varieties. Critical for Middle Eastern markets.',
 true, NOW(), NOW()),

-- Watermelon (البطيخ) - Summer
(1, 'HS-007', 'Watermelon Harvest - Summer', 'حصاد البطيخ - الصيف',
 'Peak watermelon harvest season',
 'summer', 6, 8, 60, 'Hot Regions', 4,
 'High demand in summer months. Transport carefully to avoid damage.',
 true, NOW(), NOW()),

-- =============================================================================
-- VEGETABLES (الخضروات)
-- =============================================================================

-- Tomatoes (الطماطم) - Year-round with peaks
(1, 'HS-008', 'Tomato Harvest - Spring', 'حصاد الطماطم - الربيع',
 'Spring tomato harvest for fresh market',
 'spring', 4, 6, 75, 'Greenhouse & Field', 4,
 'Includes cherry, Roma, and beefsteak varieties. Monitor for pests.',
 true, NOW(), NOW()),

-- Cucumbers (الخيار) - Summer
(1, 'HS-009', 'Cucumber Harvest - Summer', 'حصاد الخيار - الصيف',
 'Peak cucumber harvest season',
 'summer', 6, 8, 50, 'Field/Greenhouse', 5,
 'Quick harvest cycle. Ideal for pickling and fresh consumption.',
 true, NOW(), NOW()),

-- Lettuce (الخس) - Spring/Fall
(1, 'HS-010', 'Lettuce Harvest - Spring', 'حصاد الخس - الربيع',
 'Cool-season lettuce harvest',
 'spring', 3, 5, 45, 'Coastal/Temperate', 12,
 'Multiple varieties: Romaine, Iceberg, Butterhead. Short shelf life.',
 true, NOW(), NOW()),

-- Carrots (الجزر) - Fall/Winter
(1, 'HS-011', 'Carrot Harvest - Fall', 'حصاد الجزر - الخريف',
 'Main carrot harvest season',
 'fall', 9, 11, 60, 'Temperate', 13,
 'Root vegetable with good storage potential. Monitor for soil pests.',
 true, NOW(), NOW()),

-- Peppers (الفلفل) - Summer/Fall
(1, 'HS-012', 'Pepper Harvest - Summer', 'حصاد الفلفل - الصيف',
 'Bell and chili pepper harvest',
 'summer', 7, 9, 60, 'Warm Regions', 8,
 'Includes bell peppers, jalapeños, and specialty varieties. Handle carefully.',
 true, NOW(), NOW()),

-- =============================================================================
-- GRAINS & CEREALS (الحبوب)
-- =============================================================================

-- Wheat (القمح) - Summer harvest
(1, 'HS-013', 'Wheat Harvest - Summer', 'حصاد القمح - الصيف',
 'Primary wheat harvest season',
 'summer', 6, 7, 30, 'Plains/Agricultural', 10,
 'Spring wheat varieties. Critical for bread production. Monitor moisture levels.',
 true, NOW(), NOW()),

-- Rice (الأرز) - Fall harvest
(1, 'HS-014', 'Rice Harvest - Fall', 'حصاد الأرز - الخريف',
 'Main rice harvest season',
 'fall', 9, 10, 45, 'Wetlands/Paddy', 14,
 'Paddy rice harvest. Requires immediate processing. Major staple crop.',
 true, NOW(), NOW()),

-- Corn (الذرة) - Summer/Fall
(1, 'HS-015', 'Corn Harvest - Summer', 'حصاد الذرة - الصيف',
 'Sweet corn and feed corn harvest',
 'summer', 7, 9, 60, 'Agricultural Plains', 11,
 'Multiple uses: fresh, silage, and grain. Monitor maturity carefully.',
 true, NOW(), NOW()),

-- =============================================================================
-- HERBS & SPECIALTY CROPS (الأعشاب والمحاصيل الخاصة)
-- =============================================================================

-- Mint (النعناع) - Spring/Summer
(1, 'HS-016', 'Mint Harvest - Spring', 'حصاد النعناع - الربيع',
 'Fresh mint herb harvest',
 'spring', 4, 6, 45, 'Temperate/Mediterranean', 5,
 'Multiple harvests possible per season. High demand for fresh and dried use.',
 true, NOW(), NOW()),

-- Basil (الريحان) - Summer
(1, 'HS-017', 'Basil Harvest - Summer', 'حصاد الريحان - الصيف',
 'Fresh basil herb harvest',
 'summer', 6, 8, 50, 'Warm Mediterranean', 17,
 'Italian and Thai varieties. Harvest before flowering for best flavor.',
 true, NOW(), NOW()),

-- Olives (الزيتون) - Fall/Winter
(1, 'HS-018', 'Olive Harvest - Fall', 'حصاد الزيتون - الخريف',
 'Traditional olive harvest for oil and table',
 'fall', 10, 12, 75, 'Mediterranean', 13,
 'Critical for olive oil production. Timing affects oil quality and flavor profile.',
 true, NOW(), NOW()),

-- Coffee (القهوة) - Winter
(1, 'HS-019', 'Coffee Harvest - Winter', 'حصاد القهوة - الشتاء',
 'Arabica coffee bean harvest',
 'winter', 12, 2, 60, 'Highland Tropical', 15,
 'Hand-picked for premium quality. Altitude affects flavor profile.',
 true, NOW(), NOW()),

-- Tea (الشاي) - Year-round with peaks
(1, 'HS-020', 'Tea Harvest - Spring', 'حصاد الشاي - الربيع',
 'Premium tea leaf harvest (first flush)',
 'spring', 3, 5, 60, 'Highland Tropical', 14,
 'First flush produces highest quality tea. Multiple harvests per year possible.',
 true, NOW(), NOW());

-- =============================================================================
-- Add audit log entry
-- =============================================================================
INSERT INTO audit_logs (
  user_id,
  action,
  resource,
  resource_id,
  before_data,
  after_data,
  ip_address,
  user_agent,
  created_at
) VALUES (
  1,
  'seed_data',
  'harvest_schedules',
  NULL,
  NULL,
  jsonb_build_object(
    'migration', '122_seed_harvest_schedules',
    'records_added', 20,
    'description', 'Seeded realistic harvest schedule data for fruits, vegetables, grains, and herbs'
  ),
  '127.0.0.1',
  'Migration Script',
  NOW()
);

-- =============================================================================
-- Verification
-- =============================================================================
DO $$
DECLARE
  schedule_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO schedule_count FROM harvest_schedules WHERE deleted_at IS NULL AND company_id = 1;
  RAISE NOTICE 'Migration 122 completed successfully. Total harvest schedules: %', schedule_count;
END $$;
