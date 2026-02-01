@echo off
echo ========================================
echo  Rebuilding Frontend-Next (Translations)
echo ========================================
echo.

echo [1/3] Stopping frontend-next service...
docker compose stop frontend-next

echo.
echo [2/3] Rebuilding frontend-next image (no cache)...
docker compose build --no-cache frontend-next

echo.
echo [3/3] Starting frontend-next service...
docker compose up -d frontend-next

echo.
echo ========================================
echo  Rebuild Complete!
echo ========================================
echo.
echo Frontend-next is now running with updated translations.
echo Open http://localhost:3001 to test.
echo.
pause
