-- Add description field to cost_centers (UI already expects it)

BEGIN;

ALTER TABLE cost_centers
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMIT;
