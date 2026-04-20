-- Migration 440: Fix project code unique constraint for soft deletes
-- The existing UNIQUE INDEX on (company_id, code) blocks reusing codes from
-- soft-deleted projects. Replace with a partial unique index that only enforces
-- uniqueness for non-deleted records.

DO $$
DECLARE
  schema_rec RECORD;
BEGIN
  FOR schema_rec IN
    SELECT DISTINCT schemaname
    FROM pg_indexes
    WHERE tablename = 'projects'
      AND indexdef LIKE '%code%'
      AND indexdef LIKE '%UNIQUE%'
  LOOP
    -- Drop old unconditional unique constraints
    BEGIN
      EXECUTE format('ALTER TABLE %I.projects DROP CONSTRAINT IF EXISTS projects_company_id_code_key', schema_rec.schemaname);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      EXECUTE format('ALTER TABLE %I.projects DROP CONSTRAINT IF EXISTS projects_company_id_code_key1', schema_rec.schemaname);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      EXECUTE format('ALTER TABLE %I.projects DROP CONSTRAINT IF EXISTS uq_projects_company_code', schema_rec.schemaname);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Create partial unique index that only applies to non-deleted records
    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_company_code_active ON %I.projects (company_id, code) WHERE deleted_at IS NULL',
      schema_rec.schemaname
    );

    RAISE NOTICE 'Fixed unique index in schema: %', schema_rec.schemaname;
  END LOOP;
END;
$$;
