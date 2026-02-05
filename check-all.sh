#!/bin/bash
echo "=== Top 50 Tables with Data ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "
SELECT 
    relname as table_name,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY n_live_tup DESC
LIMIT 50;
"

echo ""
echo "=== Check specific tables ==="
echo "items:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -t -c "SELECT COUNT(*) FROM items;"

echo "vendors:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -t -c "SELECT COUNT(*) FROM vendors;"

echo "shipments:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -t -c "SELECT COUNT(*) FROM shipments;"

echo "suppliers:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -t -c "SELECT COUNT(*) FROM suppliers;"

echo "companies:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -t -c "SELECT COUNT(*) FROM companies;"
