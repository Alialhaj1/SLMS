#!/bin/bash
echo "=== Checking user permissions ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "
SELECT u.email, r.name as role_name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id;
"

echo ""
echo "=== Restart backend to clear cache ==="
docker restart slms-backend-prod

echo ""
echo "Done! Please try logging in again."
