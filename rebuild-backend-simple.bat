@echo off
cd C:\projects\slms\backend
call npm run build
echo.
echo ===================================
echo Build completed!
echo Now restart backend with:
echo   node dist\index.js
echo ===================================
pause
