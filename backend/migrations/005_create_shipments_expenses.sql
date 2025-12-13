-- Shipments and Expenses tables
CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY,
  supplier_id INT REFERENCES suppliers(id),
  tracking_number TEXT,
  status TEXT DEFAULT 'created',
  origin TEXT,
  destination TEXT,
  est_arrival TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipments_supplier ON shipments (supplier_id);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  shipment_id INT REFERENCES shipments(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_shipment ON expenses (shipment_id);
