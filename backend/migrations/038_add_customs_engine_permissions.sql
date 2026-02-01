-- =====================================================
-- Migration 038: Customs Engine Permissions (Frontend-aligned)
-- IMPORTANT: Permission codes must match frontend exactly.
-- =====================================================

INSERT INTO permissions (permission_code, resource, action, description, module) VALUES
  ('logistics:hs_codes:view', 'logistics:hs_codes', 'view', 'View HS Codes', 'Logistics'),
  ('logistics:hs_codes:create', 'logistics:hs_codes', 'create', 'Create HS Codes', 'Logistics'),
  ('logistics:hs_codes:edit', 'logistics:hs_codes', 'edit', 'Edit HS Codes', 'Logistics'),
  ('logistics:hs_codes:delete', 'logistics:hs_codes', 'delete', 'Delete HS Codes', 'Logistics'),

  ('logistics:customs_tariffs:view', 'logistics:customs_tariffs', 'view', 'View Customs Tariffs', 'Logistics'),
  ('logistics:customs_tariffs:create', 'logistics:customs_tariffs', 'create', 'Create Customs Tariffs', 'Logistics'),
  ('logistics:customs_tariffs:edit', 'logistics:customs_tariffs', 'edit', 'Edit Customs Tariffs', 'Logistics'),
  ('logistics:customs_tariffs:delete', 'logistics:customs_tariffs', 'delete', 'Delete Customs Tariffs', 'Logistics'),

  ('logistics:customs_exemptions:view', 'logistics:customs_exemptions', 'view', 'View Customs Exemptions', 'Logistics'),
  ('logistics:customs_exemptions:create', 'logistics:customs_exemptions', 'create', 'Create Customs Exemptions', 'Logistics'),
  ('logistics:customs_exemptions:edit', 'logistics:customs_exemptions', 'edit', 'Edit Customs Exemptions', 'Logistics'),
  ('logistics:customs_exemptions:delete', 'logistics:customs_exemptions', 'delete', 'Delete Customs Exemptions', 'Logistics')
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
