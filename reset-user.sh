#!/bin/bash
set -e

echo "=== Reset user password and unlock account ==="

# Generate bcrypt hash for 'Admin123!'
# Using node to generate the hash
docker exec slms-backend-prod node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('Admin123!', 10).then(hash => console.log(hash));
" > /tmp/hash.txt

HASH=$(cat /tmp/hash.txt)
echo "Generated hash: $HASH"

# Update user password and unlock
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "
UPDATE users 
SET password_hash = '$HASH',
    failed_login_attempts = 0,
    locked_until = NULL,
    status = 'active'
WHERE email = 'ali@alhajco.com';
"

echo ""
echo "=== Test Login ==="
curl -s -X POST https://alhajco.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@alhajco.com","password":"Admin123!"}'

echo ""
