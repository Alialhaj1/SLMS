@echo off
setlocal

REM Apply the generated COA SQL to Postgres with UTF-8 preserved.
REM IMPORTANT: Do NOT pipe via PowerShell Get-Content, it can convert Arabic to '????'.

set ROOT=%~dp0\..\..
pushd "%ROOT%" >nul

docker-compose exec -T postgres psql -U slms -d slms_db < backend\scripts\output\coa-import.sql

popd >nul
echo.
echo Done.
endlocal
