#!/bin/bash
echo "=== User table columns ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "\d users"
