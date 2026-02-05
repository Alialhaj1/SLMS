#!/bin/bash
echo "=== Checking existing permissions ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT permission_code FROM permissions WHERE permission_code LIKE 'dashboard%' OR permission_code LIKE 'permissions%';"

echo ""
echo "=== Adding missing permissions ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "
INSERT INTO permissions (permission_code, resource, action, description) VALUES 
('dashboard:view', 'dashboard', 'view', 'View dashboard'),
('permissions:view', 'permissions', 'view', 'View permissions'),
('permissions:manage', 'permissions', 'manage', 'Manage permissions')
ON CONFLICT (permission_code) DO NOTHING;
"

echo ""
echo "=== Verifying permissions added ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT permission_code, description FROM permissions WHERE permission_code LIKE 'dashboard%' OR permission_code LIKE 'permissions%';"

echo ""
echo "=== Total permissions count ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) FROM permissions;"
