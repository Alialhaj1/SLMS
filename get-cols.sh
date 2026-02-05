#!/bin/bash
echo "=== User table columns ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;"
