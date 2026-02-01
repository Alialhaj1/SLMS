@echo off
echo ================================
echo Starting Backend Server
echo ================================
echo.

cd /d C:\projects\slms\backend

echo Checking Node.js...
node -v
if errorlevel 1 (
    echo ERROR: Node.js not found!
    pause
    exit /b 1
)

echo.
echo Checking .env file...
if not exist .env (
    echo WARNING: .env file not found. Creating one...
    (
        echo PORT=4000
        echo NODE_ENV=development
        echo DATABASE_URL=postgresql://slms:slms_pass@localhost:5432/slms_db
        echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-minimum-32-characters
        echo JWT_EXPIRES_IN=24h
        echo JWT_REFRESH_EXPIRES_IN=7d
    ) > .env
    echo .env file created
)

echo.
echo Starting Backend on port 4000...
echo Press Ctrl+C to stop
echo.

npm run dev
