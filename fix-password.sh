#!/bin/bash
set -e

echo "=== Generating proper bcrypt hash ==="
# Use the compiled TypeScript in the backend to generate the hash
HASH=$(docker exec slms-backend-prod node -e "
const bcryptjs = require('bcryptjs');
const hash = bcryptjs.hashSync('Admin123!', 10);
console.log(hash);
")

echo "Generated hash: $HASH"

echo ""
echo "=== Updating user password ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "
UPDATE users 
SET password = '$HASH',
    login_attempts = 0,
    locked_until = NULL,
    status = 'active'
WHERE email = 'ali@alhajco.com';
"

echo ""
echo "=== Clear Redis ==="
docker exec slms-redis-prod redis-cli FLUSHALL

echo ""
echo "=== Test Login ==="
curl -s -X POST https://alhajco.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@alhajco.com","password":"Admin123!"}'

echo ""
