#!/bin/bash
echo "=== Creating uploads directories ==="
mkdir -p /opt/slms/uploads/profiles
mkdir -p /opt/slms/uploads/documents
mkdir -p /opt/slms/uploads/temp
chmod -R 777 /opt/slms/uploads

ls -la /opt/slms/uploads/

echo ""
echo "=== Restart backend ==="
cd /opt/slms
docker compose -f docker-compose.prod.yml restart backend

sleep 8
echo ""
echo "=== Backend logs ==="
docker logs slms-backend-prod --tail 30

echo ""
echo "=== Test backend ==="
curl -s http://127.0.0.1:4000/api/health
