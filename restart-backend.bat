@echo off
cd /d c:\projects\slms
docker compose restart backend
timeout /t 3
