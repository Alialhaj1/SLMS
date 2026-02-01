@echo off
echo Restarting Backend Server...
cd /d C:\projects\slms\backend
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Backend*" 2>nul
timeout /t 2 /nobreak >nul
start "Backend Server" node dist\index.js
echo.
echo Backend restarted! Check the new "Backend Server" window.
echo After backend starts (shows "listening on port 4000"):
echo.
echo 1. Go to browser
echo 2. Open DevTools Console (F12)
echo 3. Run: localStorage.clear(); location.href='/login';
echo 4. Login again: ali@alhajco.com / A11A22A33
echo 5. Dashboard should load without errors!
pause
