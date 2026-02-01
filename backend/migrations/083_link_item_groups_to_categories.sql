-- Link item_groups to item_categories (official relationship)
-- Adds nullable category_id to preserve existing data.

BEGIN;

ALTER TABLE item_groups
  ADD COLUMN IF NOT EXISTS category_id INTEGER;

-- Foreign key (hard delete safety). Soft deletes won't break FK.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'item_groups_category_id_fkey'
  ) THEN
    ALTER TABLE item_groups
      ADD CONSTRAINT item_groups_category_id_fkey
      FOREIGN KEY (category_id)
      REFERENCES item_categories(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_item_groups_company_category
  ON item_groups(company_id, category_id)
  WHERE deleted_at IS NULL;

COMMIT;
