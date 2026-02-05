#!/bin/bash
echo "=== Checking roles ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT id, name FROM roles;"

echo ""
echo "=== Get dashboard:view permission ID ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT id FROM permissions WHERE permission_code = 'dashboard:view';"

echo ""
echo "=== Adding dashboard:view to all roles ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code = 'dashboard:view'
ON CONFLICT DO NOTHING;
"

echo ""
echo "=== Verifying role_permissions ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "
SELECT r.name as role_name, p.permission_code
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.permission_code = 'dashboard:view';
"

echo ""
echo "=== Clearing Redis cache ==="
docker exec slms-redis-prod redis-cli FLUSHALL

echo "Done!"
