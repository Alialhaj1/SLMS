-- suppliers and products (starter domain tables)
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_info JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  supplier_id INT REFERENCES suppliers(id),
  name TEXT NOT NULL,
  sku TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
