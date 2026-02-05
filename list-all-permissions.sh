#!/bin/bash
echo "=== All existing permissions ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT permission_code, description FROM permissions ORDER BY permission_code;" > /tmp/all_permissions.txt
cat /tmp/all_permissions.txt

echo ""
echo "=== Total count ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) FROM permissions;"
