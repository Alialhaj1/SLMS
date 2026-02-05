@echo off
ssh -i C:\Users\USER\.ssh\id_ed25519 root@68.183.221.112 "curl -sS -w 'HTTP_CODE: %%{http_code}' http://localhost:3001/api/health"
