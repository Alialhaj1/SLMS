#!/bin/bash
set -e

echo "=== Checking for login attempts in Redis ==="
docker exec slms-redis-prod redis-cli KEYS "*ali*"
docker exec slms-redis-prod redis-cli KEYS "*login*"
docker exec slms-redis-prod redis-cli KEYS "*lock*"

echo ""
echo "=== Flush all Redis keys for this user ==="
docker exec slms-redis-prod redis-cli FLUSHALL

echo ""
echo "=== Restart backend to clear any caches ==="
docker restart slms-backend-prod

sleep 5

echo ""
echo "=== Test Login Again ==="
curl -s -X POST https://alhajco.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@alhajco.com","password":"Admin123!"}'

echo ""
