@echo off
echo ============================================
echo  Build Frontend Locally and Deploy to Server
echo ============================================

cd /d c:\projects\slms\frontend-next

echo.
echo Step 1: Building Next.js locally...
call npm run build

if errorlevel 1 (
    echo ERROR: Build failed!
    exit /b 1
)

echo.
echo Step 2: Creating deployment archive...
cd .next
tar -cvzf standalone.tar.gz standalone static

echo.
echo Step 3: Copying to server...
scp -i C:\Users\USER\.ssh\id_ed25519 standalone.tar.gz root@68.183.221.112:/opt/slms/frontend-next/

echo.
echo Step 4: Extracting on server...
ssh -i C:\Users\USER\.ssh\id_ed25519 root@68.183.221.112 "cd /opt/slms/frontend-next/.next && tar -xvzf standalone.tar.gz && rm standalone.tar.gz"

echo.
echo Done! Now you can rebuild containers with pre-built assets.
echo Run: ssh -i C:\Users\USER\.ssh\id_ed25519 root@68.183.221.112 "cd /opt/slms && docker compose -f docker-compose.prod.yml up -d --build"
