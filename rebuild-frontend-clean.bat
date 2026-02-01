@echo off
cd c:\projects\slms
docker compose down
docker compose build --no-cache frontend-next
docker compose up -d
echo Done! Check http://localhost:3001
