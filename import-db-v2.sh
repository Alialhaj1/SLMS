#!/bin/bash
set -e

echo "=== Checking backup file ==="
head -20 /tmp/slms_backup_new.sql

echo ""
echo "=== Counting COPY statements ==="
grep -c "^COPY " /tmp/slms_backup_new.sql || echo "No COPY found"

echo ""
echo "=== Preparing backup - replacing owner ==="
sed -i 's/Owner: slms$/Owner: slms_prod/g' /tmp/slms_backup_new.sql
sed -i 's/OWNER TO slms;/OWNER TO slms_prod;/g' /tmp/slms_backup_new.sql

echo ""
echo "=== Importing to production database ==="
docker exec -i slms-postgres-prod psql -U slms_prod -d slms_production < /tmp/slms_backup_new.sql 2>&1 | tail -100

echo ""
echo "=== Verifying import ==="
echo "Companies:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) FROM companies;"
echo "Users:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) FROM users;"
echo "Shipments:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) FROM shipments;"
echo "Suppliers:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) FROM suppliers;"
echo "Countries:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) FROM countries;"
echo "Currencies:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) FROM currencies;"

echo ""
echo "=== Done ==="
