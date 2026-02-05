#!/bin/bash
# Add missing env vars
echo 'POSTGRES_USER=slms_prod' >> /opt/slms/.env
echo 'POSTGRES_PASSWORD=P0stgr3s2026!Prod' >> /opt/slms/.env

echo "=== Updated .env file ==="
cat /opt/slms/.env

echo ""
echo "=== Building frontend ==="
cd /opt/slms
docker compose -f docker-compose.prod.yml build --no-cache frontend

echo ""
echo "=== Starting frontend ==="
docker compose -f docker-compose.prod.yml up -d frontend

echo ""
echo "=== Container status ==="
docker ps -a --filter name=frontend

echo ""
echo "=== Frontend logs ==="
sleep 10
docker logs slms-frontend-prod --tail 20 2>&1
