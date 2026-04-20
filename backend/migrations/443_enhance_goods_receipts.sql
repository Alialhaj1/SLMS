-- Migration 443: Enhance goods_receipts for full GRN workflow
-- Adds: project_id, received_by, total_received_value, rejected_qty tracking

ALTER TABLE goods_receipts
  ADD COLUMN IF NOT EXISTS project_id           INT REFERENCES projects(id),
  ADD COLUMN IF NOT EXISTS received_by          INT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS total_received_value DECIMAL(18,4) DEFAULT 0;

ALTER TABLE goods_receipt_items
  ADD COLUMN IF NOT EXISTS ordered_qty       DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS rejected_qty      DECIMAL(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_status    VARCHAR(20) DEFAULT 'accepted'
    CHECK (quality_status IN ('accepted','rejected','partial')),
  ADD COLUMN IF NOT EXISTS rejection_reason  TEXT,
  ADD COLUMN IF NOT EXISTS line_total        DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS warehouse_location VARCHAR(200);
