#!/bin/bash
echo "=== Full backend logs ==="
docker logs slms-backend-prod 2>&1 | tail -50

echo ""
echo "=== Fixing permissions and restarting ==="
docker exec slms-backend-prod mkdir -p /app/uploads/profiles 2>/dev/null || echo "Container not running, will create via volume"

# Check if uploads volume exists and fix
docker volume ls | grep uploads

echo ""
echo "=== Restart backend with proper volume ==="
cd /opt/slms
docker compose -f docker-compose.prod.yml restart backend

sleep 5
echo ""
echo "=== Backend status after restart ==="
docker logs slms-backend-prod --tail 20
echo ""
echo "=== Test backend ==="
curl -s http://127.0.0.1:4000/api/health || echo "Backend not responding"
