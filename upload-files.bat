@echo off
echo Uploading docker-compose.prod.yml...
scp -i C:\Users\USER\.ssh\id_ed25519 c:\projects\slms\docker-compose.prod.yml root@68.183.221.112:/opt/slms/

echo Uploading Dockerfile.prod...
scp -i C:\Users\USER\.ssh\id_ed25519 c:\projects\slms\frontend-next\Dockerfile.prod root@68.183.221.112:/opt/slms/frontend-next/

echo Files uploaded successfully!
