-- Migration 130: Add port and payment information to logistics_shipments
-- Adds: port_of_loading_id, port_of_discharge_id, payment_method, lc_number, total_amount

-- Add port of loading (mandatory)
ALTER TABLE logistics_shipments 
ADD COLUMN port_of_loading_id INTEGER REFERENCES ports(id);

-- Add port of discharge (mandatory)
ALTER TABLE logistics_shipments 
ADD COLUMN port_of_discharge_id INTEGER REFERENCES ports(id);

-- Add payment method (e.g., LC, TT, Cash)
ALTER TABLE logistics_shipments 
ADD COLUMN payment_method VARCHAR(100);

-- Add LC number (required if payment method is LC)
ALTER TABLE logistics_shipments 
ADD COLUMN lc_number VARCHAR(100);

-- Add total amount
ALTER TABLE logistics_shipments 
ADD COLUMN total_amount DECIMAL(15, 2);

-- Add comments for documentation
COMMENT ON COLUMN logistics_shipments.port_of_loading_id IS 'Port or airport where the shipment originates (from ports master data)';
COMMENT ON COLUMN logistics_shipments.port_of_discharge_id IS 'Port or airport where the shipment arrives (from ports master data)';
COMMENT ON COLUMN logistics_shipments.payment_method IS 'Payment method: LC (Letter of Credit), TT (Telegraphic Transfer), Cash, etc.';
COMMENT ON COLUMN logistics_shipments.lc_number IS 'Letter of Credit number (mandatory if payment_method contains LC/اعتماد)';
COMMENT ON COLUMN logistics_shipments.total_amount IS 'Total shipment value (auto-populated from PO if linked)';

-- Update view vw_inbound_shipment_report to include new fields
DROP VIEW IF EXISTS vw_inbound_shipment_report CASCADE;
CREATE OR REPLACE VIEW vw_inbound_shipment_report AS
SELECT
  s.id AS shipment_id,
  s.shipment_number,
  s.project_id,
  p.code AS project_code,
  p.name AS project_name_en,
  p.name_ar AS project_name_ar,
  s.vendor_id,
  v.code AS vendor_code,
  v.name AS vendor_name,
  v.name_ar AS vendor_name_ar,
  s.purchase_order_id,
  po.order_number AS po_number,
  s.shipment_type_id,
  st.code AS shipment_type_code,
  st.name_en AS shipment_type_name_en,
  st.name_ar AS shipment_type_name_ar,
  s.bl_no,
  s.awb_no,
  s.incoterm,
  s.port_of_loading_id,
  pol.code AS port_of_loading_code,
  pol.name_en AS port_of_loading_name_en,
  pol.name_ar AS port_of_loading_name_ar,
  pol.port_type AS port_of_loading_type,
  s.port_of_discharge_id,
  pod.code AS port_of_discharge_code,
  pod.name_en AS port_of_discharge_name_en,
  pod.name_ar AS port_of_discharge_name_ar,
  pod.port_type AS port_of_discharge_type,
  s.origin_location_id,
  orig.code AS origin_city_code,
  orig.name AS origin_city_name,
  s.destination_location_id,
  dest.code AS destination_city_code,
  dest.name AS destination_city_name,
  s.payment_method,
  s.lc_number,
  s.total_amount,
  s.expected_arrival_date,
  s.warehouse_id,
  w.code AS warehouse_code,
  w.name AS warehouse_name,
  w.name_ar AS warehouse_name_ar,
  s.status_code,
  s.stage_code,
  s.notes,
  s.created_by,
  s.created_at,
  s.updated_by,
  s.updated_at,
  s.deleted_at,
  -- Aggregated expense summary
  COALESCE(SUM(se.amount), 0) AS total_expenses,
  COALESCE(SUM(CASE WHEN se.approval_status = 'approved' THEN se.amount ELSE 0 END), 0) AS approved_expenses,
  COALESCE(SUM(CASE WHEN se.approval_status = 'posted' THEN se.amount ELSE 0 END), 0) AS posted_expenses,
  COUNT(DISTINCT se.id) AS expense_count
FROM logistics_shipments s
LEFT JOIN projects p ON s.project_id = p.id
LEFT JOIN vendors v ON s.vendor_id = v.id
LEFT JOIN purchase_orders po ON s.purchase_order_id = po.id
LEFT JOIN logistics_shipment_types st ON s.shipment_type_id = st.id
LEFT JOIN ports pol ON s.port_of_loading_id = pol.id
LEFT JOIN ports pod ON s.port_of_discharge_id = pod.id
LEFT JOIN cities orig ON s.origin_location_id = orig.id
LEFT JOIN cities dest ON s.destination_location_id = dest.id
LEFT JOIN warehouses w ON s.warehouse_id = w.id
LEFT JOIN shipment_expenses se ON s.id = se.shipment_id AND se.deleted_at IS NULL
WHERE s.deleted_at IS NULL
GROUP BY
  s.id, s.shipment_number, s.project_id, p.code, p.name, p.name_ar,
  s.vendor_id, v.code, v.name, v.name_ar,
  s.purchase_order_id, po.order_number,
  s.shipment_type_id, st.code, st.name_en, st.name_ar,
  s.bl_no, s.awb_no, s.incoterm,
  s.port_of_loading_id, pol.code, pol.name_en, pol.name_ar, pol.port_type,
  s.port_of_discharge_id, pod.code, pod.name_en, pod.name_ar, pod.port_type,
  s.origin_location_id, orig.code, orig.name,
  s.destination_location_id, dest.code, dest.name,
  s.payment_method, s.lc_number, s.total_amount,
  s.expected_arrival_date,
  s.warehouse_id, w.code, w.name, w.name_ar,
  s.status_code, s.stage_code, s.notes,
  s.created_by, s.created_at, s.updated_by, s.updated_at, s.deleted_at;

COMMENT ON VIEW vw_inbound_shipment_report IS 'Comprehensive shipment report with port, payment, and expense information';
