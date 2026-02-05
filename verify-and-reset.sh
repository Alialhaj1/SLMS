#!/bin/bash
echo "=== Full Database Statistics ==="

echo ""
echo "Companies:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) FROM companies;" 2>&1 | grep -E "^\s*[0-9]+"

echo "Users:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) FROM users;" 2>&1 | grep -E "^\s*[0-9]+"

echo "Shipments:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) FROM shipments;" 2>&1 | grep -E "^\s*[0-9]+"

echo "Suppliers:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) FROM suppliers;" 2>&1 | grep -E "^\s*[0-9]+"

echo "Currencies:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) FROM currencies;" 2>&1 | grep -E "^\s*[0-9]+"

echo "Countries:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) FROM countries;" 2>&1 | grep -E "^\s*[0-9]+"

echo "Ports:"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT COUNT(*) FROM ports;" 2>&1 | grep -E "^\s*[0-9]+"

echo ""
echo "=== User list ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT id, email, status FROM users LIMIT 10;"

echo ""
echo "=== Reset user password ==="
# Generate bcrypt hash
HASH=\$(docker exec slms-backend-prod node -e "const bcryptjs = require('bcryptjs'); console.log(bcryptjs.hashSync('Admin123!', 10));")
echo "Hash: \$HASH"

docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "UPDATE users SET password = '\$HASH', locked_until = NULL, status = 'active' WHERE email = 'ali@alhajco.com';"

echo ""
echo "=== Test login ==="
curl -s -X POST https://alhajco.com/api/auth/login -H "Content-Type: application/json" -d '{"email":"ali@alhajco.com","password":"Admin123!"}'
