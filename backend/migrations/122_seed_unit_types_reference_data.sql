-- Seed Unit Types as reference_data (type='unit_types')
-- These represent measurement dimensions: weight, length, area, count, time, volume, etc.

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN SELECT id FROM companies LOOP
    INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar, is_active)
    SELECT c.id, 'unit_types', v.code, v.name_en, v.name_ar, v.desc_en, v.desc_ar, TRUE
    FROM (
      VALUES
        ('WEIGHT',  'Weight',  'وزن',    'Weight measurement (kg, g, ton, etc.)',       'قياس الوزن (كيلو، جرام، طن، إلخ)'),
        ('LENGTH',  'Length',  'طول',    'Length measurement (m, cm, km, etc.)',        'قياس الطول (متر، سنتيمتر، كيلومتر، إلخ)'),
        ('AREA',    'Area',    'مساحة',  'Area measurement (m², km², etc.)',            'قياس المساحة (متر مربع، كيلومتر مربع، إلخ)'),
        ('VOLUME',  'Volume',  'حجم',    'Volume measurement (L, mL, m³, etc.)',        'قياس الحجم (لتر، مليلتر، متر مكعب، إلخ)'),
        ('COUNT',   'Count',   'عدد',    'Countable units (piece, pair, dozen, etc.)',  'وحدات عد (قطعة، زوج، درزن، إلخ)'),
        ('TIME',    'Time',    'زمن',    'Time measurement (hour, day, month, etc.)',   'قياس الزمن (ساعة، يوم، شهر، إلخ)'),
        ('PACK',    'Package', 'تعبئة',  'Packaging units (box, carton, pallet, etc.)', 'وحدات تعبئة (صندوق، كرتون، باليت، إلخ)'),
        ('OTHER',   'Other',   'أخرى',   'Other measurement types',                     'أنواع قياس أخرى')
      ) AS v(code, name_en, name_ar, desc_en, desc_ar)
    WHERE NOT EXISTS (
      SELECT 1 FROM reference_data r
      WHERE r.deleted_at IS NULL
        AND r.company_id = c.id
        AND r.type = 'unit_types'
        AND r.code = v.code
    );
  END LOOP;
END $$;

-- Also seed global (company_id IS NULL) unit types for system-wide availability
INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar, is_active)
SELECT NULL, 'unit_types', v.code, v.name_en, v.name_ar, v.desc_en, v.desc_ar, TRUE
FROM (
  VALUES
    ('WEIGHT',  'Weight',  'وزن',    'Weight measurement (kg, g, ton, etc.)',       'قياس الوزن (كيلو، جرام، طن، إلخ)'),
    ('LENGTH',  'Length',  'طول',    'Length measurement (m, cm, km, etc.)',        'قياس الطول (متر، سنتيمتر، كيلومتر، إلخ)'),
    ('AREA',    'Area',    'مساحة',  'Area measurement (m², km², etc.)',            'قياس المساحة (متر مربع، كيلومتر مربع، إلخ)'),
    ('VOLUME',  'Volume',  'حجم',    'Volume measurement (L, mL, m³, etc.)',        'قياس الحجم (لتر، مليلتر، متر مكعب، إلخ)'),
    ('COUNT',   'Count',   'عدد',    'Countable units (piece, pair, dozen, etc.)',  'وحدات عد (قطعة، زوج، درزن، إلخ)'),
    ('TIME',    'Time',    'زمن',    'Time measurement (hour, day, month, etc.)',   'قياس الزمن (ساعة، يوم، شهر، إلخ)'),
    ('PACK',    'Package', 'تعبئة',  'Packaging units (box, carton, pallet, etc.)', 'وحدات تعبئة (صندوق، كرتون، باليت، إلخ)'),
    ('OTHER',   'Other',   'أخرى',   'Other measurement types',                     'أنواع قياس أخرى')
  ) AS v(code, name_en, name_ar, desc_en, desc_ar)
WHERE NOT EXISTS (
  SELECT 1 FROM reference_data r
  WHERE r.deleted_at IS NULL
    AND r.company_id IS NULL
    AND r.type = 'unit_types'
    AND r.code = v.code
)
ON CONFLICT DO NOTHING;
