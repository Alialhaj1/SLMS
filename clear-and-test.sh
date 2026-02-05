#!/bin/bash
set -e

echo "=== Clearing Redis cache ==="
docker exec slms-redis-prod redis-cli FLUSHALL

echo ""
echo "=== Checking all user columns with lock/attempt in name ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND (column_name LIKE '%lock%' OR column_name LIKE '%attempt%' OR column_name LIKE '%fail%');"

echo ""
echo "=== Current user data ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT * FROM users WHERE email = 'ali@alhajco.com';"

echo ""
echo "=== Restart backend to clear any in-memory cache ==="
docker restart slms-backend-prod
sleep 5

echo ""
echo "=== Test Login ==="
curl -s -X POST https://alhajco.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@alhajco.com","password":"Admin123!"}'

echo ""
