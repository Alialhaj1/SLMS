-- Add measurement type for basic units of measure

ALTER TABLE units_of_measure
  ADD COLUMN IF NOT EXISTS measurement_type VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_units_of_measure_measurement_type
  ON units_of_measure (measurement_type);
