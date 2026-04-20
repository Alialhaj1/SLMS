-- Migration 435: Add unique partial index on item_groups (company_id, name_en)
-- Prevents duplicate item group names within the same company

-- First, soft-delete duplicates (keep the lowest id per company_id + name_en)
UPDATE item_groups AS ig
SET deleted_at = NOW()
WHERE ig.deleted_at IS NULL
  AND ig.id NOT IN (
    SELECT MIN(id)
    FROM item_groups
    WHERE deleted_at IS NULL
    GROUP BY company_id, LOWER(COALESCE(name_en, name))
  );

-- Create unique partial index (only for non-deleted records)
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_groups_company_name_en_unique
  ON item_groups (company_id, LOWER(COALESCE(name_en, name)))
  WHERE deleted_at IS NULL;
