@echo off
ssh -i C:\Users\USER\.ssh\id_ed25519 root@68.183.221.112 "cd /opt/slms && docker compose -f docker-compose.prod.yml build --no-cache frontend"
