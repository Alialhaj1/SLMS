-- Create item-specific UOM conversions (multiple units per item)
-- Base unit is defined by items.base_uom_id and should have conversion_factor = 1.

CREATE TABLE IF NOT EXISTS item_uom_conversions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    item_id INTEGER NOT NULL REFERENCES items(id),
    uom_id INTEGER NOT NULL REFERENCES units_of_measure(id),
    conversion_factor DECIMAL(18, 8) NOT NULL, -- 1 <uom> = X <base_uom> for the item
    is_base BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL,
    UNIQUE (item_id, uom_id)
);

CREATE INDEX IF NOT EXISTS idx_item_uom_conversions_company_item ON item_uom_conversions(company_id, item_id);
CREATE INDEX IF NOT EXISTS idx_item_uom_conversions_item ON item_uom_conversions(item_id);
CREATE INDEX IF NOT EXISTS idx_item_uom_conversions_uom ON item_uom_conversions(uom_id);
