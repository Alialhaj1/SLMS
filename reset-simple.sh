#!/bin/bash
set -e

echo "=== Reset user password and unlock account ==="

# Update user password and unlock - only using columns we know exist
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "
UPDATE users 
SET password = '\$2b\$10\$3Qh5Xv8xK9mWjVpL4rNzQeY0tBcG7dM1wS6iP2uO3kHfE4gRnAqZK',
    locked_until = NULL,
    status = 'active'
WHERE email = 'ali@alhajco.com';
"

echo "User updated"

echo ""
echo "=== Verify update ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT email, status, locked_until FROM users WHERE email = 'ali@alhajco.com';"

echo ""
echo "=== Test Login ==="
curl -s -X POST https://alhajco.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@alhajco.com","password":"Admin123!"}'

echo ""
