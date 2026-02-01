-- =====================================================
-- Migration 043: Shipment Event Reference Data (event_type / event_source)
-- Minimal reference tables (future-proof for delays/penalties/analytics)
-- =====================================================

CREATE TABLE IF NOT EXISTS shipment_event_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipment_event_types_code ON shipment_event_types(code);
CREATE INDEX IF NOT EXISTS idx_shipment_event_types_deleted_at ON shipment_event_types(deleted_at);

CREATE TABLE IF NOT EXISTS shipment_event_sources (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipment_event_sources_code ON shipment_event_sources(code);
CREATE INDEX IF NOT EXISTS idx_shipment_event_sources_deleted_at ON shipment_event_sources(deleted_at);

-- Seed minimal types
INSERT INTO shipment_event_types (code, name_en, name_ar) VALUES
  ('STATUS_CHANGE', 'Status Change', 'تغيير الحالة'),
  ('STAGE_CHANGE', 'Stage Change', 'تغيير المرحلة'),
  ('DOCUMENT', 'Document', 'مستند'),
  ('ALERT', 'Alert', 'تنبيه'),
  ('NOTE', 'Note', 'ملاحظة')
ON CONFLICT (code) DO NOTHING;

-- Seed minimal sources
INSERT INTO shipment_event_sources (code, name_en, name_ar) VALUES
  ('manual', 'Manual', 'يدوي'),
  ('system', 'System', 'النظام'),
  ('customs', 'Customs', 'الجمارك'),
  ('carrier', 'Carrier', 'الناقل')
ON CONFLICT (code) DO NOTHING;

-- Add event_source to shipment_events (kept as VARCHAR for flexibility)
ALTER TABLE shipment_events
  ADD COLUMN IF NOT EXISTS event_source VARCHAR(50) DEFAULT 'system';

CREATE INDEX IF NOT EXISTS idx_shipment_events_event_source ON shipment_events(event_source) WHERE deleted_at IS NULL;
