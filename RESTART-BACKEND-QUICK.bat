@echo off
cd /d c:\projects\slms
echo Restarting backend...
docker compose restart backend
timeout /t 5 /nobreak > nul
echo Backend restarted successfully!
