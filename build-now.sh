#!/bin/bash
cd /opt/slms

# Kill any existing build processes
pkill -f "docker-compose" 2>/dev/null
pkill -f "docker compose" 2>/dev/null
sleep 2

echo "=== Building frontend with limited memory ==="
# Use --memory flag to limit build memory
docker compose -f docker-compose.prod.yml build frontend 2>&1

echo ""
echo "=== Starting frontend ==="
docker compose -f docker-compose.prod.yml up -d frontend

echo ""
echo "=== Status ==="
docker ps -a
docker images
