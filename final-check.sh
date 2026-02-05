#!/bin/bash
echo "=== Companies ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT id, name_ar FROM companies LIMIT 5;"

echo ""
echo "=== Shipments ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) as total FROM shipments;"

echo ""
echo "=== Suppliers ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) as total FROM suppliers;"

echo ""
echo "=== Test API ==="
sleep 3
curl -s https://alhajco.com/api/health
