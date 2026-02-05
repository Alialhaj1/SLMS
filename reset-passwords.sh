#!/bin/bash
set -e

echo "=== Generating password hash ==="
HASH=$(docker exec slms-backend-prod node -e "const bcryptjs = require('bcryptjs'); console.log(bcryptjs.hashSync('Admin123!', 10));")
echo "Hash generated: $HASH"

echo ""
echo "=== Updating users ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "UPDATE users SET password = '$HASH', locked_until = NULL, status = 'active' WHERE email = 'ali@alhajco.com';"

docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "UPDATE users SET password = '$HASH', locked_until = NULL, status = 'active' WHERE email = 'import@darkhawlan.com';"

echo ""
echo "=== Clear Redis ==="
docker exec slms-redis-prod redis-cli FLUSHALL

echo ""
echo "=== Test login ==="
curl -s -X POST https://alhajco.com/api/auth/login -H "Content-Type: application/json" -d '{"email":"ali@alhajco.com","password":"Admin123!"}'

echo ""
