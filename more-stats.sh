#!/bin/bash
echo "=== More Stats ==="

echo "Shipments:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -t -c "SELECT COUNT(*) FROM shipments;"

echo "Suppliers:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -t -c "SELECT COUNT(*) FROM suppliers;"

echo "Companies:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -t -c "SELECT COUNT(*) FROM companies;"

echo "Freight Agents:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -t -c "SELECT COUNT(*) FROM freight_agents;"

echo "Vendors:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -t -c "SELECT COUNT(*) FROM vendors;" 2>/dev/null || echo "Table not found"

echo ""
echo "=== Companies List ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT id, name_en, name_ar FROM companies LIMIT 5;"

echo ""
echo "=== Restart backend to refresh cache ==="
docker restart slms-backend-prod
