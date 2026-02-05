#!/bin/bash
cd /opt/slms

echo "=== Checking Dockerfile.prod for NEXT_PUBLIC_API_URL ==="
grep -n "NEXT_PUBLIC" frontend-next/Dockerfile.prod

echo ""
echo "=== Building frontend (this takes 2-3 minutes) ==="
docker compose -f docker-compose.prod.yml build --no-cache frontend 2>&1

echo ""
echo "=== Starting frontend container ==="
docker compose -f docker-compose.prod.yml up -d frontend

echo ""
echo "=== Container status ==="
docker ps -a --filter name=frontend

echo ""
echo "=== Frontend logs ==="
sleep 10
docker logs slms-frontend-prod --tail 30

echo ""
echo "=== Checking for localhost:4000 in built JS ==="
docker exec slms-frontend-prod sh -c "grep -r 'localhost:4000' /app/.next/static/chunks/ 2>/dev/null | head -5 || echo 'No localhost:4000 found - GOOD!'"
