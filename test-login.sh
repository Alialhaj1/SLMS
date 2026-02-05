#!/bin/bash
set -e

echo "=== Checking Users in Database ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT id, email, username, status FROM users LIMIT 5;"

echo ""
echo "=== Testing Login API ==="
curl -s -X POST https://alhajco.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@slms.com","password":"admin123"}' | head -c 500

echo ""
echo ""
echo "=== Checking Frontend Healthcheck ==="
curl -s http://localhost:3001/ | head -c 200 || echo "Frontend not responding"
