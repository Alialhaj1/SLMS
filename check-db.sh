#!/bin/bash
echo "=== Current .env contents ==="
cat /opt/slms/.env | grep -E "^POSTGRES|^DB_"

echo ""
echo "=== docker-compose.prod.yml postgres config ==="
grep -A 20 "postgres:" /opt/slms/docker-compose.prod.yml | head -25

echo ""
echo "=== Check what user exists in postgres ==="
docker exec slms-postgres-prod psql -U postgres -c "SELECT usename FROM pg_user;" 2>&1 || echo "Can't connect as postgres"

echo ""
echo "=== Backend environment in container ==="
docker exec slms-backend-prod env 2>/dev/null | grep -E "DB_|POSTGRES" || echo "Container not running"
