@echo off
echo ========================================
echo Uploading updated files to server...
echo ========================================

scp -i C:\Users\USER\.ssh\id_ed25519 c:\projects\slms\docker-compose.prod.yml root@68.183.221.112:/opt/slms/
scp -i C:\Users\USER\.ssh\id_ed25519 c:\projects\slms\frontend-next\Dockerfile.prod root@68.183.221.112:/opt/slms/frontend-next/

echo.
echo ========================================
echo Rebuilding frontend container...
echo ========================================

ssh -i C:\Users\USER\.ssh\id_ed25519 root@68.183.221.112 "cd /opt/slms && docker compose -f docker-compose.prod.yml stop frontend && docker compose -f docker-compose.prod.yml build --no-cache frontend && docker compose -f docker-compose.prod.yml up -d frontend"

echo.
echo ========================================
echo Waiting for container to start (60s)...
echo ========================================
timeout /t 60 /nobreak

echo.
echo ========================================
echo Checking health status...
echo ========================================
ssh -i C:\Users\USER\.ssh\id_ed25519 root@68.183.221.112 "docker ps --format 'table {{.Names}}\t{{.Status}}' && echo. && curl -s http://localhost:3001/api/health"

echo.
echo Done!
pause
