-- Migration: Add payment_method_id and project_id to purchase_orders
-- Author: System
-- Date: 2024-01-15
-- Purpose: Add payment method and project linkage to purchase orders for project-centric architecture

-- ═══════════════════════════════════════════════════════════════════════════════
-- Add payment_method_id column to purchase_orders
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Add project_id column to purchase_orders (mandatory for approval)
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE RESTRICT;

-- Add comment explaining project_id requirement
COMMENT ON COLUMN purchase_orders.project_id IS 'Project linkage - required for PO approval workflow';
COMMENT ON COLUMN purchase_orders.payment_method_id IS 'Payment method from master data (replaces payment_terms for method tracking)';

-- ═══════════════════════════════════════════════════════════════════════════════
-- Create indexes for performance
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_purchase_orders_payment_method ON purchase_orders(payment_method_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project ON purchase_orders(project_id) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Note: Business rule enforced in backend
-- ═══════════════════════════════════════════════════════════════════════════════
-- Purchase orders cannot be approved without project_id
-- This is enforced in application code (backend/src/routes/procurement/purchaseOrders.ts)
