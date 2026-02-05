#!/bin/bash
set -e

echo "Checking existing databases..."
docker exec slms-postgres-prod psql -U slms_prod -d postgres -c "\l"

echo ""
echo "Creating database slms_production if not exists..."
docker exec slms-postgres-prod psql -U slms_prod -d postgres -c "CREATE DATABASE slms_production;" 2>/dev/null || echo "Database may already exist"

echo ""
echo "Restarting backend..."
docker restart slms-backend-prod

echo ""
echo "Waiting for backend to start..."
sleep 10

echo ""
echo "Checking backend logs..."
docker logs slms-backend-prod --tail 40

echo ""
echo "Testing API..."
curl -s http://localhost:4000/api/health || echo "Health endpoint not available"
