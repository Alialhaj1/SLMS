#!/bin/bash
cd /opt/slms
docker compose -f docker-compose.prod.yml up -d frontend
sleep 3
docker compose -f docker-compose.prod.yml ps
echo ""
echo "Frontend logs:"
docker logs slms-frontend-prod --tail 20
