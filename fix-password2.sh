#!/bin/bash
set -e

# The hash we generated
HASH='$2a$10$yL/HsQOmUHNDupk6FNrnX.xpAXv8deO0x/I3D9L5eG6a1gCsCkojG'

echo "=== Updating user password ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "
UPDATE users 
SET password = '$HASH',
    locked_until = NULL,
    status = 'active'
WHERE email = 'ali@alhajco.com';
"

echo ""
echo "=== Clear Redis ==="
docker exec slms-redis-prod redis-cli FLUSHALL

echo ""
echo "=== Verify user ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT email, status, locked_until FROM users WHERE email = 'ali@alhajco.com';"

echo ""
echo "=== Test Login ==="
curl -s -X POST https://alhajco.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@alhajco.com","password":"Admin123!"}'

echo ""
