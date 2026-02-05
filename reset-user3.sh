#!/bin/bash
set -e

echo "=== Reset user password and unlock account ==="

# Pre-generated bcrypt hash for 'Admin123!' (cost factor 10)
# Update user password and unlock
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "
UPDATE users 
SET password = '\$2b\$10\$3Qh5Xv8xK9mWjVpL4rNzQeY0tBcG7dM1wS6iP2uO3kHfE4gRnAqZK',
    failed_login_attempts = 0,
    locked_until = NULL,
    status = 'active'
WHERE email = 'ali@alhajco.com';
"

echo "User updated"

echo ""
echo "=== Verify update ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "
SELECT email, failed_login_attempts, locked_until, status FROM users WHERE email = 'ali@alhajco.com';
"

echo ""
echo "=== Test Login ==="
curl -s -X POST https://alhajco.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@alhajco.com","password":"Admin123!"}'

echo ""
