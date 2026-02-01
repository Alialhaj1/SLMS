@echo off
cd /d c:\projects\slms
echo Checking backend status...
docker ps | findstr backend
echo.
echo Restarting backend...
docker compose restart backend
timeout /t 5
echo.
echo Getting recent logs...
docker compose logs backend --tail 30
