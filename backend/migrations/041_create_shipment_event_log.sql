-- =====================================================
-- Migration 041: Shipment Event Log (Timeline / Audit)
-- Company-scoped event log for shipment tracking.
-- =====================================================

CREATE TABLE IF NOT EXISTS shipment_events (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shipment_id INTEGER REFERENCES shipments(id) ON DELETE SET NULL,
  shipment_reference VARCHAR(100),
  event_type VARCHAR(50) NOT NULL,
  stage_code VARCHAR(50),
  status_code VARCHAR(50),
  location VARCHAR(255),
  description_en TEXT,
  description_ar TEXT,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipment_events_company_id ON shipment_events(company_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment_id ON shipment_events(shipment_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipment_events_reference ON shipment_events(shipment_reference) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipment_events_event_type ON shipment_events(event_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipment_events_occurred_at ON shipment_events(occurred_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipment_events_deleted_at ON shipment_events(deleted_at);
