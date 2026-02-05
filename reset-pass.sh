#!/bin/bash
set -e

echo "=== Fixing PostgreSQL Password ==="

# Get the current password from .env
cd /opt/slms
source .env
echo "Password from .env: ${POSTGRES_PASSWORD}"

# Reset password in PostgreSQL
echo "Resetting password for slms_prod user..."
docker exec slms-postgres-prod psql -U slms_prod -d postgres -c "ALTER USER slms_prod PASSWORD '${POSTGRES_PASSWORD}';"

echo ""
echo "Creating slms_production database if not exists..."
docker exec slms-postgres-prod psql -U slms_prod -d postgres -c "SELECT 'CREATE DATABASE slms_production' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'slms_production')\gexec" 2>/dev/null || true
docker exec slms-postgres-prod createdb -U slms_prod slms_production 2>/dev/null || echo "Database already exists"

echo ""
echo "Restarting backend..."
docker restart slms-backend-prod

sleep 10

echo ""
echo "Backend logs:"
docker logs slms-backend-prod --tail 30
