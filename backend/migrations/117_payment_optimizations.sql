-- Migration 117: Performance and Data Integrity Enhancements for Payments
-- ============================================================================
-- Purpose: Add additional constraints and indexes to ensure data integrity
--          and improve query performance for the payments module
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD CONSTRAINT: Allocated amount cannot exceed payment amount
-- ============================================================================
ALTER TABLE vendor_payments
ADD CONSTRAINT check_allocated_not_exceed_payment
CHECK (allocated_amount <= payment_amount);

-- ============================================================================
-- 2. ADD INDEXES: Improve query performance for common payment queries
-- ============================================================================

-- Index on vendor_id for fast vendor payment lookups
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_id
ON vendor_payments(vendor_id)
WHERE deleted_at IS NULL;

-- Index on purchase_invoices.balance for finding outstanding invoices
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_balance
ON purchase_invoices(balance)
WHERE deleted_at IS NULL AND is_posted = true AND balance > 0;

-- Composite index for vendor outstanding invoices query (used in allocation modal)
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_vendor_balance
ON purchase_invoices(vendor_id, balance, due_date)
WHERE deleted_at IS NULL AND is_posted = true AND balance > 0;

-- Index on payment_date for date range filtering
CREATE INDEX IF NOT EXISTS idx_vendor_payments_payment_date
ON vendor_payments(payment_date DESC)
WHERE deleted_at IS NULL;

-- Composite index for payment status queries
CREATE INDEX IF NOT EXISTS idx_vendor_payments_company_posted_status
ON vendor_payments(company_id, is_posted, status)
WHERE deleted_at IS NULL;

-- ============================================================================
-- 3. ADD PARTIAL INDEX: Fast lookup for unapplied payments report
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_vendor_payments_unapplied
ON vendor_payments(company_id, unallocated_amount DESC)
WHERE deleted_at IS NULL AND is_posted = true AND unallocated_amount > 0;

-- ============================================================================
-- 4. RECORD MIGRATION
-- ============================================================================
-- Note: Migration tracking is handled automatically by migrate.ts
-- No manual INSERT needed

COMMIT;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. The check_allocated_not_exceed_payment constraint ensures that the
--    allocated_amount (updated by triggers) never exceeds the payment_amount.
--    This is a safety net against trigger logic errors.
--
-- 2. Partial indexes (with WHERE clauses) are highly efficient:
--    - idx_vendor_payments_vendor_id: Only indexes non-deleted payments
--    - idx_purchase_invoices_balance: Only indexes posted invoices with balance > 0
--    - idx_vendor_payments_unapplied: Only indexes posted payments with unallocated > 0
--
-- 3. These indexes target specific API queries:
--    - GET /api/procurement/payments/vendor/:vendorId/outstanding-invoices
--    - GET /api/procurement/reports/unapplied-payments
--    - GET /api/procurement/reports/vendor-balance
--    - GET /api/procurement/payments (with date range filters)
--
-- 4. Query performance improvements:
--    - Vendor outstanding invoices: O(n) → O(log n)
--    - Unapplied payments report: Full scan → Index scan
--    - Payment history by date: Full scan → Index scan
--
-- 5. Storage impact: Minimal (~5-10% overhead for indexes)
-- ============================================================================
