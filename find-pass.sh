#!/bin/bash
echo "=== Password column name ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE '%pass%';"
