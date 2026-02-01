@echo off
REM =============================================================================
REM SLMS - SSH Connection to Production Server
REM Server: alhajco.com (68.183.221.112)
REM =============================================================================

echo.
echo ========================================
echo   SLMS Production Server - SSH
echo   Server: alhajco.com
echo   IP: 68.183.221.112
echo ========================================
echo.

ssh -i C:\Users\USER\.ssh\id_ed25519 root@68.183.221.112
