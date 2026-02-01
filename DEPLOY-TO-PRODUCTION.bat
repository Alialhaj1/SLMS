@echo off
REM =============================================================================
REM SLMS Deployment Script for Windows (PowerShell)
REM Run this on your LOCAL machine to deploy to production server
REM =============================================================================

echo.
echo ========================================
echo     SLMS Deployment Helper (Windows)
echo ========================================
echo.

echo This script will help you deploy SLMS to your production server.
echo.
echo Prerequisites:
echo   1. VPS with Ubuntu 22.04 running
echo   2. SSH access to the server
echo   3. Docker and Docker Compose installed on server
echo   4. Git repository pushed to GitHub/GitLab
echo.

REM Server configuration for alhajco.com
set SERVER_IP=68.183.221.112
set SSH_USER=root
set SSH_KEY=C:\Users\USER\.ssh\id_ed25519

echo Server: %SERVER_IP% (alhajco.com)
echo User: %SSH_USER%
echo.

echo Connecting to %SSH_USER%@%SERVER_IP%...
echo.

ssh -i %SSH_KEY% %SSH_USER%@%SERVER_IP% "cd /opt/slms && ./scripts/deploy.sh"

echo.
echo Done!
pause
