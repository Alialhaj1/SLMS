#!/bin/bash
echo "=== Check DATABASE_URL being passed to backend ==="
cd /opt/slms
source .env
echo "POSTGRES_USER=$POSTGRES_USER"
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" 
echo "Expected URL: postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/slms_production"

echo ""
echo "=== Test postgres connection with password ==="
export PGPASSWORD="$POSTGRES_PASSWORD"
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT current_user, current_database();" 2>&1

echo ""
echo "=== Check postgres users ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT usename FROM pg_user;" 2>&1

echo ""
echo "=== Is password special chars an issue? ==="
# The password has ! in it which might need escaping
echo "Password contains special chars: P0stgr3s2026!Prod"
