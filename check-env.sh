#!/bin/bash
echo "=== .env file ==="
cat /opt/slms/.env

echo ""
echo "=== Trying to connect with slms_prod user ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT 1;" 2>&1

echo ""
echo "=== If connection fails, recreate postgres with correct credentials ==="
# The postgres container needs to be recreated with correct credentials from .env
