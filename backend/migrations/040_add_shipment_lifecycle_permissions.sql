-- =====================================================
-- Migration 040: Shipment Lifecycle Engine Permissions (Frontend-aligned)
-- IMPORTANT: Permission codes must match frontend exactly.
-- =====================================================

INSERT INTO permissions (permission_code, resource, action, description, module) VALUES
  ('logistics:shipment_lifecycle_statuses:view', 'logistics:shipment_lifecycle_statuses', 'view', 'View Shipment Lifecycle Statuses', 'Logistics'),
  ('logistics:shipment_lifecycle_statuses:create', 'logistics:shipment_lifecycle_statuses', 'create', 'Create Shipment Lifecycle Statuses', 'Logistics'),
  ('logistics:shipment_lifecycle_statuses:edit', 'logistics:shipment_lifecycle_statuses', 'edit', 'Edit Shipment Lifecycle Statuses', 'Logistics'),
  ('logistics:shipment_lifecycle_statuses:delete', 'logistics:shipment_lifecycle_statuses', 'delete', 'Delete Shipment Lifecycle Statuses', 'Logistics'),

  ('logistics:shipment_stages:view', 'logistics:shipment_stages', 'view', 'View Shipment Stages', 'Logistics'),
  ('logistics:shipment_stages:create', 'logistics:shipment_stages', 'create', 'Create Shipment Stages', 'Logistics'),
  ('logistics:shipment_stages:edit', 'logistics:shipment_stages', 'edit', 'Edit Shipment Stages', 'Logistics'),
  ('logistics:shipment_stages:delete', 'logistics:shipment_stages', 'delete', 'Delete Shipment Stages', 'Logistics'),

  ('logistics:shipment_event_log:view', 'logistics:shipment_event_log', 'view', 'View Shipment Event Log', 'Logistics'),
  ('logistics:shipment_event_log:export', 'logistics:shipment_event_log', 'export', 'Export Shipment Event Log', 'Logistics'),

  ('logistics:shipment_document_requirements:view', 'logistics:shipment_document_requirements', 'view', 'View Shipment Document Requirements', 'Logistics'),
  ('logistics:shipment_document_requirements:manage', 'logistics:shipment_document_requirements', 'manage', 'Manage Shipment Document Requirements', 'Logistics')
ON CONFLICT (permission_code) DO NOTHING;

-- Ensure super_admin role has all permissions
DO $$
DECLARE
    all_permissions JSONB;
    super_admin_id INTEGER;
BEGIN
    SELECT jsonb_agg(permission_code)
    INTO all_permissions
    FROM permissions;

    SELECT id INTO super_admin_id
    FROM roles
    WHERE name = 'super_admin' OR name = 'Super Admin'
    LIMIT 1;

    IF super_admin_id IS NOT NULL AND all_permissions IS NOT NULL THEN
        UPDATE roles
        SET permissions = all_permissions,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = super_admin_id;
    END IF;
END $$;
