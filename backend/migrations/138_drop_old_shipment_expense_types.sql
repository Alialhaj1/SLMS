-- =====================================================
-- HOTFIX: Drop old shipment_expense_types table
-- =====================================================
-- This migration was created to fix a schema conflict.
-- The old table has columns name_en/name_ar but migration 139
-- expects name/name_ar. We need to drop the old table so 139
-- can create the correct schema.

-- Drop the old table (it will be recreated properly by migration 139)
DROP TABLE IF EXISTS shipment_expense_types CASCADE;

-- Note: This will cascade to shipment_expenses table which is fine
-- because migration 139 will recreate everything properly.
