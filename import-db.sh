#!/bin/bash
set -e

echo "=== Importing database backup ==="

# First, we need to modify the backup to use the production user
echo "Preparing backup file..."
sed -i 's/Owner: slms/Owner: slms_prod/g' /tmp/slms_backup.sql
sed -i 's/OWNER TO slms;/OWNER TO slms_prod;/g' /tmp/slms_backup.sql

echo "Dropping existing tables and importing..."

# Import the backup
docker exec -i slms-postgres-prod psql -U slms_prod -d slms_production < /tmp/slms_backup.sql 2>&1 | tail -50

echo ""
echo "=== Verifying import ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) as companies FROM companies;"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) as users FROM users;"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) as shipments FROM shipments;"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) as suppliers FROM suppliers;"

echo ""
echo "=== Import complete ==="
