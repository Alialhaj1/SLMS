-- Migration 068: Apply real numbering sequences to all company-scoped tables
-- Date: 2026-01-01
--
-- Goals:
-- 1) Add real linkage columns to all tables that have company_id:
--    - numbering_series_id (FK -> numbering_series)
--    - sequence_no (integer)
-- 2) Auto-assign sequence_no on INSERT via trigger.
-- 3) Backfill existing data with sequence_no (per company) and set numbering_series.current_number accordingly.
--
-- Notes:
-- - We intentionally do NOT store a formatted string in each table.
--   This allows prefix/suffix/padding changes in numbering_series to affect formatting everywhere that computes display
--   numbers from (numbering_series + sequence_no).
-- - Some tables might already have their own document/reference number. This migration adds generic sequence fields
--   without removing or modifying existing identifiers.

BEGIN;

-- Helper: create a short prefix from table name (e.g. shipment_events -> SE-)
CREATE OR REPLACE FUNCTION slms_make_prefix(p_table_name TEXT)
RETURNS VARCHAR(10)
LANGUAGE plpgsql
AS $$
DECLARE
  parts TEXT[];
  initials TEXT := '';
  i INT;
  raw TEXT;
  out_prefix TEXT;
BEGIN
  parts := regexp_split_to_array(lower(coalesce(p_table_name, '')), '_+');
  IF parts IS NULL OR array_length(parts, 1) IS NULL THEN
    raw := upper(left(coalesce(p_table_name, 'DOC'), 3));
  ELSE
    FOR i IN 1..array_length(parts, 1) LOOP
      IF parts[i] IS NOT NULL AND length(parts[i]) > 0 THEN
        initials := initials || upper(left(parts[i], 1));
      END IF;
    END LOOP;
    raw := upper(left(coalesce(nullif(initials, ''), coalesce(p_table_name, 'DOC')), 6));
  END IF;

  out_prefix := raw || '-';
  RETURN left(out_prefix, 10);
END $$;

-- Ensure a numbering series exists for company + module(table)
CREATE OR REPLACE FUNCTION slms_ensure_numbering_series(
  p_company_id INT,
  p_module TEXT,
  p_user_id INT
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_id INT;
  v_prefix VARCHAR(10);
BEGIN
  SELECT id INTO v_id
  FROM numbering_series
  WHERE company_id = p_company_id
    AND module = p_module
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  v_prefix := slms_make_prefix(p_module);

  INSERT INTO numbering_series (
    company_id, module, prefix, suffix, current_number, padding_length,
    format, notes_en, notes_ar, is_active, created_by, updated_by
  )
  VALUES (
    p_company_id,
    p_module,
    v_prefix,
    NULL,
    1,
    6,
    NULL,
    'Auto-created default numbering series for table: ' || p_module,
    'تم إنشاء تسلسل ترقيم افتراضي تلقائياً للجدول: ' || p_module,
    TRUE,
    p_user_id,
    p_user_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

-- Trigger function: set numbering_series_id + sequence_no on insert (if missing)
CREATE OR REPLACE FUNCTION slms_set_sequence_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_series_id INT;
  v_assigned INT;
  v_user_id INT;
  v_module TEXT;
BEGIN
  -- Only apply when company_id exists
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_user_id := COALESCE(NEW.created_by, NEW.updated_by);
  v_module := TG_TABLE_NAME;

  -- Ensure series exists
  v_series_id := slms_ensure_numbering_series(NEW.company_id, v_module, COALESCE(v_user_id, 1));

  -- Set FK if missing
  IF NEW.numbering_series_id IS NULL THEN
    NEW.numbering_series_id := v_series_id;
  END IF;

  -- Assign next sequence if missing
  IF NEW.sequence_no IS NULL THEN
    WITH upd AS (
      UPDATE numbering_series
      SET current_number = current_number + 1,
          updated_at = NOW(),
          updated_by = COALESCE(v_user_id, updated_by)
      WHERE id = v_series_id
      RETURNING current_number
    )
    SELECT current_number - 1 INTO v_assigned FROM upd;

    NEW.sequence_no := v_assigned;
  END IF;

  RETURN NEW;
END $$;

-- Apply columns + triggers to all company-scoped tables
DO $$
DECLARE
  r RECORD;
  trigger_name TEXT;
  excluded TEXT[] := ARRAY[
    'migrations',
    'numbering_series',
    'audit_logs'
  ];
BEGIN
  FOR r IN
    SELECT DISTINCT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c
      ON c.table_schema = t.table_schema
     AND c.table_name = t.table_name
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name = 'company_id'
    ORDER BY t.table_name
  LOOP
    IF r.table_name = ANY(excluded) THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS numbering_series_id INTEGER REFERENCES numbering_series(id)', r.table_name);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS sequence_no INTEGER', r.table_name);

    trigger_name := left('trg_seq_' || r.table_name, 63);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = trigger_name
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION slms_set_sequence_fields()',
        trigger_name,
        r.table_name
      );
    END IF;
  END LOOP;
END $$;

-- Backfill existing rows (per table, per company) and update numbering_series.current_number
DO $$
DECLARE
  r RECORD;
  has_id BOOLEAN;
  has_created_at BOOLEAN;
  excluded TEXT[] := ARRAY[
    'migrations',
    'numbering_series',
    'audit_logs'
  ];
  order_sql TEXT;
  update_sql TEXT;
  bump_sql TEXT;
BEGIN
  FOR r IN
    SELECT DISTINCT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c
      ON c.table_schema = t.table_schema
     AND c.table_name = t.table_name
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name = 'company_id'
    ORDER BY t.table_name
  LOOP
    IF r.table_name = ANY(excluded) THEN
      CONTINUE;
    END IF;

    SELECT EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.table_name AND column_name = 'id'
    ) INTO has_id;

    IF NOT has_id THEN
      CONTINUE;
    END IF;

    SELECT EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.table_name AND column_name = 'created_at'
    ) INTO has_created_at;

    order_sql := CASE
      WHEN has_created_at THEN 'ORDER BY t.created_at NULLS LAST, t.id'
      ELSE 'ORDER BY t.id'
    END;

    -- 1) Ensure numbering series exists for each (company_id, table)
    EXECUTE format(
      $sql$
      INSERT INTO numbering_series (
        company_id, module, prefix, suffix, current_number, padding_length,
        format, notes_en, notes_ar, is_active, created_by, updated_by
      )
      SELECT DISTINCT
        t.company_id,
        %L,
        slms_make_prefix(%L),
        NULL,
        1,
        6,
        NULL,
        'Auto-created default numbering series for table: ' || %L,
        'تم إنشاء تسلسل ترقيم افتراضي تلقائياً للجدول: ' || %L,
        TRUE,
        NULL::INTEGER,
        NULL::INTEGER
      FROM %I t
      WHERE t.company_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM numbering_series ns
          WHERE ns.company_id = t.company_id
            AND ns.module = %L
            AND ns.deleted_at IS NULL
        );
      $sql$,
      r.table_name,
      r.table_name,
      r.table_name,
      r.table_name,
      r.table_name,
      r.table_name
    );

    -- 2) Backfill sequence_no where NULL (append after existing max per company)
    update_sql := format(
      $sql$
      WITH existing_max AS (
        SELECT company_id, COALESCE(MAX(sequence_no), 0) AS max_seq
        FROM %I
        GROUP BY company_id
      ),
      ranked AS (
        SELECT t.id, t.company_id,
               ROW_NUMBER() OVER (PARTITION BY t.company_id %s) AS rn
        FROM %I t
        WHERE t.sequence_no IS NULL
          AND t.company_id IS NOT NULL
      )
      UPDATE %I tgt
      SET sequence_no = ranked.rn + em.max_seq,
          numbering_series_id = ns.id
      FROM ranked
      JOIN existing_max em ON em.company_id = ranked.company_id
      JOIN numbering_series ns
        ON ns.company_id = ranked.company_id
       AND ns.module = %L
       AND ns.deleted_at IS NULL
      WHERE tgt.id = ranked.id;
      $sql$,
      r.table_name,
      order_sql,
      r.table_name,
      r.table_name,
      r.table_name
    );

    EXECUTE update_sql;

    -- 3) Bump numbering_series.current_number to (max(sequence_no)+1) per company for this table
    bump_sql := format(
      $sql$
      WITH mx AS (
        SELECT company_id, COALESCE(MAX(sequence_no), 0) + 1 AS next_no
        FROM %I
        WHERE company_id IS NOT NULL
        GROUP BY company_id
      )
      UPDATE numbering_series ns
      SET current_number = GREATEST(ns.current_number, mx.next_no),
          updated_at = NOW()
      FROM mx
      WHERE ns.company_id = mx.company_id
        AND ns.module = %L
        AND ns.deleted_at IS NULL;
      $sql$,
      r.table_name,
      r.table_name
    );

    EXECUTE bump_sql;
  END LOOP;
END $$;

COMMIT;
