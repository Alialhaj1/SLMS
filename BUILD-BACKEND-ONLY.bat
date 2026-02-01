@echo off
cd /d C:\projects\slms\backend
echo Building Backend...
call npm run build
echo.
echo Build complete!
echo.
echo Now restart backend:
echo   node dist\index.js
echo.
pause
