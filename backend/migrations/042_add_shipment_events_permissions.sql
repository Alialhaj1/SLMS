-- =====================================================
-- Migration 042: Shipment Events Permissions (Frontend-aligned)
-- IMPORTANT: Permission codes must match frontend exactly.
-- =====================================================

INSERT INTO permissions (permission_code, resource, action, description, module) VALUES
  ('logistics:shipment_events:view', 'logistics:shipment_events', 'view', 'View Shipment Events', 'Logistics'),
  ('logistics:shipment_events:export', 'logistics:shipment_events', 'export', 'Export Shipment Events', 'Logistics')
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
