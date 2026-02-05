@echo off
echo Docker container status:
ssh -i C:\Users\USER\.ssh\id_ed25519 root@68.183.221.112 "docker ps --format 'table {{.Names}}\t{{.Status}}'"
echo.
echo Docker healthcheck details:
ssh -i C:\Users\USER\.ssh\id_ed25519 root@68.183.221.112 "docker inspect slms-frontend-prod --format '{{json .State.Health.Status}}'"
