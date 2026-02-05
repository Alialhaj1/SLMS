#!/bin/bash
echo "=== Check databases ==="
docker exec slms-postgres-prod psql -U slms_prod -c "\l" 2>&1

echo ""
echo "=== Check if slms_production exists ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "\dt" 2>&1 | head -30

echo ""
echo "=== Restart backend ==="
cd /opt/slms
docker compose -f docker-compose.prod.yml restart backend

sleep 5
echo ""
echo "=== Backend logs ==="
docker logs slms-backend-prod --tail 30

echo ""
echo "=== Test backend health ==="
curl -s http://127.0.0.1:4000/api/health
