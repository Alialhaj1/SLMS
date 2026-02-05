@echo off
echo Waiting 180 seconds for build to complete...
timeout /t 180 /nobreak
call c:\projects\slms\check-final.bat
