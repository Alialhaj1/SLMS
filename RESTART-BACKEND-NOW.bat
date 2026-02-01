@echo off
cd /d c:\projects\slms
docker compose up -d backend
timeout /t 8 /nobreak > nul
docker compose logs backend --tail 50 > backend-logs.txt
type backend-logs.txt
