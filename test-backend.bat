@echo off
echo ================================
echo Testing Backend Connection
echo ================================
echo.

echo Checking if backend is running on port 4000...
netstat -an | findstr ":4000.*LISTENING" >nul
if errorlevel 1 (
    echo [X] Backend is NOT running on port 4000
    echo.
    echo To start backend, run:
    echo    start-backend.bat
    echo.
    pause
    exit /b 1
) else (
    echo [OK] Backend is listening on port 4000
)

echo.
echo Testing backend API...
curl -s http://localhost:4000/api/health
if errorlevel 1 (
    echo [X] Backend is not responding
) else (
    echo.
    echo [OK] Backend is responding!
)

echo.
echo Testing login endpoint...
curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"test\",\"password\":\"test\"}"

echo.
echo.
pause
