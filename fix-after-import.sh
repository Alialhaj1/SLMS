#!/bin/bash
set -e

echo "=== Fixing user password after import ==="

# Generate proper bcrypt hash using backend
HASH=$(docker exec slms-backend-prod node -e "
const bcryptjs = require('bcryptjs');
const hash = bcryptjs.hashSync('Admin123!', 10);
console.log(hash);
")

echo "Generated hash: $HASH"

echo ""
echo "=== Updating ali@alhajco.com password ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "
UPDATE users 
SET password = '$HASH',
    locked_until = NULL,
    status = 'active'
WHERE email = 'ali@alhajco.com';
"

echo ""
echo "=== Clear Redis cache ==="
docker exec slms-redis-prod redis-cli FLUSHALL

echo ""
echo "=== Restart backend ==="
docker restart slms-backend-prod
sleep 5

echo ""
echo "=== Test login ==="
curl -s -X POST https://alhajco.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@alhajco.com","password":"Admin123!"}' | head -c 200

echo ""
echo ""
echo "=== Data Summary ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "
SELECT 'companies' as table_name, COUNT(*) as count FROM companies
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL SELECT 'countries', COUNT(*) FROM countries
UNION ALL SELECT 'currencies', COUNT(*) FROM currencies
UNION ALL SELECT 'ports', COUNT(*) FROM ports
UNION ALL SELECT 'shipments', COUNT(*) FROM shipments
ORDER BY table_name;
"
