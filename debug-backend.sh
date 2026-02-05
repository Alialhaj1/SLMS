#!/bin/bash
echo "=== Container status ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "=== Backend logs ==="
docker logs slms-backend-prod --tail 30
echo ""
echo "=== Checking nginx config ==="
cat /etc/nginx/sites-available/slms | head -40
echo ""
echo "=== Testing backend directly ==="
curl -s http://127.0.0.1:4000/api/health || echo "Backend not responding on 4000"
