#!/bin/bash
set -e

echo "Creating database slms..."
docker exec slms-postgres-prod psql -U slms_prod -d postgres -c "CREATE DATABASE slms;"

echo "Restarting backend..."
docker restart slms-backend-prod

echo "Waiting for backend to start..."
sleep 5

echo "Checking backend status..."
docker logs slms-backend-prod --tail 20

echo "Done!"
