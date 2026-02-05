#!/bin/bash
set -e
cd /opt/slms

echo "=== Environment check ==="
cat .env

echo ""
echo "=== Building frontend ==="
docker compose -f docker-compose.prod.yml build frontend

echo ""
echo "=== Starting frontend ==="
docker compose -f docker-compose.prod.yml up -d frontend

echo ""
echo "=== Final status ==="
docker ps -a
docker images
