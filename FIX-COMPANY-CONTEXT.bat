@echo off
echo ========================================
echo   ARCHITECTURAL FIX - Company Context
echo ========================================
echo.
echo Building Backend...
cd /d C:\projects\slms\backend
call npm run build
if errorlevel 1 (
    echo.
    echo ❌ Build failed!
    pause
    exit /b 1
)
echo.
echo ✅ Build successful!
echo.
echo ========================================
echo   NEXT STEPS:
echo ========================================
echo.
echo 1. Restart Backend:
echo    node dist\index.js
echo.
echo 2. Refresh Frontend (Ctrl+R)
echo.
echo 3. Company selector will appear in header
echo.
echo 4. Select a company
echo.
echo 5. Chart of Accounts will work!
echo.
echo ========================================
pause
