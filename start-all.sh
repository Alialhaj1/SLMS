#!/bin/bash
echo "=== Container status ==="
docker ps -a

echo ""
echo "=== Start all services ==="
cd /opt/slms
docker compose -f docker-compose.prod.yml up -d

sleep 10
echo ""
echo "=== Container status after start ==="
docker ps -a

echo ""
echo "=== Backend logs ==="
docker logs slms-backend-prod --tail 50 2>&1
