#!/bin/bash
set -e

echo "=== Checking new backup file ==="
head -20 /tmp/slms_backup_new.sql

echo ""
echo "=== Line count ==="
wc -l /tmp/slms_backup_new.sql

echo ""
echo "=== COPY statements count ==="
grep -c "COPY public" /tmp/slms_backup_new.sql || echo "0"

echo ""
echo "=== Modifying owner from slms to slms_prod ==="
sed -i 's/Owner: slms$/Owner: slms_prod/g' /tmp/slms_backup_new.sql
sed -i 's/OWNER TO slms;/OWNER TO slms_prod;/g' /tmp/slms_backup_new.sql

# Remove the restrict line that causes issues
sed -i '/\\restrict/d' /tmp/slms_backup_new.sql

echo ""
echo "=== Dropping and recreating database ==="
docker exec slms-postgres-prod psql -U slms_prod -d postgres -c "DROP DATABASE IF EXISTS slms_production;"
docker exec slms-postgres-prod psql -U slms_prod -d postgres -c "CREATE DATABASE slms_production;"

echo ""
echo "=== Importing database ==="
docker exec -i slms-postgres-prod psql -U slms_prod -d slms_production < /tmp/slms_backup_new.sql 2>&1 | grep -E "ERROR|error" | head -20 || echo "No errors found"

echo ""
echo "=== Verifying import ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) as companies FROM companies;"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) as users FROM users;"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) as currencies FROM currencies;"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) as countries FROM countries;"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) as suppliers FROM suppliers;"

echo ""
echo "=== Restarting backend ==="
docker restart slms-backend-prod

echo "=== Done ==="
