-- Migration 143: Allow super_admin and admin to delete any purchase order
-- ============================================================================
-- This migration removes the strict constraint that prevents deletion of
-- approved/closed purchase orders, allowing super_admin and admin to delete
-- any order regardless of status (application-level check remains).

-- Drop the existing constraint
ALTER TABLE purchase_orders
DROP CONSTRAINT IF EXISTS prevent_delete_received_po;

-- Add a softer constraint comment for documentation
COMMENT ON COLUMN purchase_orders.deleted_at IS 'Soft delete timestamp. Super_admin and admin can delete any order (checked in application layer).';
