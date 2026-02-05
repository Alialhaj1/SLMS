@echo off
echo ===========================================
echo Uploading updated files to server...
echo ===========================================

scp -i C:\Users\USER\.ssh\id_ed25519 c:\projects\slms\docker-compose.prod.yml root@68.183.221.112:/opt/slms/docker-compose.prod.yml
scp -i C:\Users\USER\.ssh\id_ed25519 c:\projects\slms\frontend-next\Dockerfile.prod root@68.183.221.112:/opt/slms/frontend-next/Dockerfile.prod
scp -i C:\Users\USER\.ssh\id_ed25519 c:\projects\slms\frontend-next\pages\api\health.ts root@68.183.221.112:/opt/slms/frontend-next/pages/api/health.ts

echo.
echo ===========================================
echo Rebuilding frontend container...
echo ===========================================

ssh -i C:\Users\USER\.ssh\id_ed25519 root@68.183.221.112 "cd /opt/slms && docker compose -f docker-compose.prod.yml stop frontend && docker compose -f docker-compose.prod.yml rm -f frontend && docker compose -f docker-compose.prod.yml build --no-cache frontend && docker compose -f docker-compose.prod.yml up -d frontend"

echo.
echo ===========================================
echo Waiting 60 seconds for container to start...
echo ===========================================
timeout /t 60

echo.
echo ===========================================
echo Checking container status...
echo ===========================================
ssh -i C:\Users\USER\.ssh\id_ed25519 root@68.183.221.112 "docker ps --format 'table {{.Names}}\t{{.Status}}'"

echo.
echo ===========================================
echo Testing health endpoint...
echo ===========================================
ssh -i C:\Users\USER\.ssh\id_ed25519 root@68.183.221.112 "curl -s http://localhost:3001/api/health"

echo.
echo Done!
