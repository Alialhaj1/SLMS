-- Seed Cost Centers (Company 1) from provided image list
-- Idempotent: safe to run multiple times

DO $$
DECLARE
  v_company_id INT := 1;
  v_user_id INT;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE email = 'ali@alhajco.com' ORDER BY id LIMIT 1;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM users ORDER BY id LIMIT 1;
  END IF;
  IF v_user_id IS NULL THEN
    v_user_id := 1;
  END IF;

  -- 1) Roots
  WITH roots(code, name_ar, is_group) AS (
    VALUES
      ('1', 'دار خولان 1', TRUE),
      ('2', 'مراكز التكلفة مباني', TRUE)
  )
  INSERT INTO cost_centers (
    company_id, code, name, name_ar, parent_id, is_active, is_group,
    created_by, created_at, updated_at
  )
  SELECT
    v_company_id,
    r.code,
    r.name_ar,
    r.name_ar,
    NULL,
    TRUE,
    r.is_group,
    v_user_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM roots r
  ON CONFLICT (company_id, code)
  DO UPDATE SET
    name = COALESCE(cost_centers.name, EXCLUDED.name),
    name_ar = COALESCE(cost_centers.name_ar, EXCLUDED.name_ar),
    is_group = (cost_centers.is_group OR EXCLUDED.is_group),
    is_active = COALESCE(cost_centers.is_active, EXCLUDED.is_active),
    updated_at = CURRENT_TIMESTAMP;

  -- 2) Level-1 under roots
  WITH lvl1(code, name_ar, parent_code, is_group) AS (
    VALUES
      ('1-1-1', 'فرع التعمير', '1', FALSE),
      ('1-1-2', 'فرع الأرض الجديدة 3 التعمير', '1', FALSE),
      ('1-1-3', 'المستودعات', '1', FALSE),
      ('1-1-4', 'الإدارة', '1', FALSE),
      ('1-1-5', 'وقود', '1', FALSE),
      ('1-2-6', 'فرع التعمير 2', '1', FALSE),
      ('1-2-7', 'فرع عتيقة', '1', FALSE),
      ('1-2-8', 'فرع الروضة', '1', TRUE),
      ('1-2-9', 'فرع الحمام', '1', TRUE),
      ('1-2-10', 'فرع شقراء', '1', FALSE),
      ('114', 'الفندق', '1', FALSE),
      ('115', 'مصنع دار التعمير', '1', FALSE),
      ('116', 'فرع الغبرة الشعبية', '1', FALSE),
      ('117', 'فرع عتيقة 2 الجديد', '1', FALSE),
      ('118', 'فرع التعمير 2 الجديد', '1', FALSE),
      ('119', 'فرع المرسى', '1', FALSE),
      ('121', 'فرع السلام', '1', FALSE),
      ('122', 'فرع العويم', '1', FALSE),
      ('123', 'فرع أسواق حجاب - النسيم', '1', FALSE),

      ('2-1-6', 'مباني الأرض الجديدة', '2', FALSE)
  )
  INSERT INTO cost_centers (
    company_id, code, name, name_ar, parent_id, is_active, is_group,
    created_by, created_at, updated_at
  )
  SELECT
    v_company_id,
    c.code,
    c.name_ar,
    c.name_ar,
    (SELECT id FROM cost_centers p WHERE p.company_id = v_company_id AND p.code = c.parent_code AND p.deleted_at IS NULL),
    TRUE,
    c.is_group,
    v_user_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM lvl1 c
  ON CONFLICT (company_id, code)
  DO UPDATE SET
    name = COALESCE(cost_centers.name, EXCLUDED.name),
    name_ar = COALESCE(cost_centers.name_ar, EXCLUDED.name_ar),
    parent_id = COALESCE(cost_centers.parent_id, EXCLUDED.parent_id),
    is_group = (cost_centers.is_group OR EXCLUDED.is_group),
    is_active = COALESCE(cost_centers.is_active, EXCLUDED.is_active),
    updated_at = CURRENT_TIMESTAMP;

  -- 3) Level-2 (sub-branches)
  WITH lvl2(code, name_ar, parent_code) AS (
    VALUES
      ('111', 'فرع الروضة - سلمان الفارسي', '1-2-8'),
      ('112', 'فرع الروضة - البريد العارض', '1-2-8'),
      ('113', 'أم الحمام - شارع الأربعين', '1-2-9')
  )
  INSERT INTO cost_centers (
    company_id, code, name, name_ar, parent_id, is_active, is_group,
    created_by, created_at, updated_at
  )
  SELECT
    v_company_id,
    c.code,
    c.name_ar,
    c.name_ar,
    (SELECT id FROM cost_centers p WHERE p.company_id = v_company_id AND p.code = c.parent_code AND p.deleted_at IS NULL),
    TRUE,
    FALSE,
    v_user_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM lvl2 c
  ON CONFLICT (company_id, code)
  DO UPDATE SET
    name = COALESCE(cost_centers.name, EXCLUDED.name),
    name_ar = COALESCE(cost_centers.name_ar, EXCLUDED.name_ar),
    parent_id = COALESCE(cost_centers.parent_id, EXCLUDED.parent_id),
    is_active = COALESCE(cost_centers.is_active, EXCLUDED.is_active),
    updated_at = CURRENT_TIMESTAMP;

END $$;
