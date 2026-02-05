#!/bin/bash
set -e

echo "=== Checking Users in Database ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT id, email, status FROM users LIMIT 5;"

echo ""
echo "=== Test Login API ==="
curl -s -X POST https://alhajco.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@slms.com","password":"admin123"}'

echo ""
echo ""
