#!/bin/bash
set -e

echo "=== Checking Tables in Database ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "\dt"

echo ""
echo "=== If empty, need to run migrations ==="
echo "Checking migrations table..."
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT * FROM migrations LIMIT 5;" 2>/dev/null || echo "No migrations table"

echo ""
echo "=== Check if users table exists ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users';" 2>/dev/null || echo "No users table"
