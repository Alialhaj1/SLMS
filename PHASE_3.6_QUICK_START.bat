@echo off
REM ════════════════════════════════════════════════════════════════════
REM Phase 3.6 Quick Start - Test Execution Batch
REM ════════════════════════════════════════════════════════════════════
REM
REM This batch file provides quick commands to start Phase 3.6 testing
REM

setlocal enabledelayedexpansion

echo.
echo ════════════════════════════════════════════════════════════════════
echo Phase 3.6 Financial Statements Testing Quick Start
echo ════════════════════════════════════════════════════════════════════
echo.
echo Available options:
echo.
echo   1. Create test data using SQL (Fastest)
echo   2. Run Python test script (Requires backend API)
echo   3. View test results
echo   4. Clean test data
echo.

set /p choice=Select option (1-4): 

if "%choice%"=="1" goto create_sql
if "%choice%"=="2" goto run_python
if "%choice%"=="3" goto view_results
if "%choice%"=="4" goto clean_data
echo Invalid option. Exiting.
exit /b 1

:create_sql
echo.
echo Creating test data using SQL...
echo.
echo Prerequisites:
echo   - PostgreSQL running on localhost:5432
echo   - Database: slms
echo   - User: postgres
echo   - Password: postgres
echo.
echo Executing: PHASE_3.6_TEST_DATA.sql
echo.

psql -h localhost -U postgres -d slms -f "PHASE_3.6_TEST_DATA.sql"

if %errorlevel% equ 0 (
    echo.
    echo ✅ Test data created successfully!
    echo.
    echo Next steps:
    echo   1. Run validation queries (see PHASE_3.6_TESTING_GUIDE.md)
    echo   2. Check results in database
    echo   3. View frontend reports at http://localhost:3000
) else (
    echo.
    echo ❌ Failed to create test data
    echo.
    echo Troubleshooting:
    echo   - Check PostgreSQL is running
    echo   - Verify database credentials
    echo   - Check file path is correct
)
goto end

:run_python
echo.
echo Running Python test script...
echo.
echo Prerequisites:
echo   - Python 3.8+ installed
echo   - PostgreSQL running
echo   - Backend API running on localhost:3001
echo   - pip packages: requests, psycopg2-binary
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found. Please install Python 3.8+
    goto end
)

echo ✅ Python found. Starting tests...
echo.
python PHASE_3.6_TEST_EXECUTION.py

if %errorlevel% equ 0 (
    echo.
    echo ✅ All tests passed!
    echo.
    echo Results saved to: PHASE_3.6_TEST_RESULTS.json
    echo.
    echo Next steps:
    echo   1. Review PHASE_3.6_TEST_RESULTS.json
    echo   2. Check validation results
    echo   3. View frontend reports
) else (
    echo.
    echo ❌ Tests failed. Check output above for details.
)
goto end

:view_results
echo.
if exist "PHASE_3.6_TEST_RESULTS.json" (
    echo Test results found!
    echo.
    echo Opening in default JSON viewer...
    start PHASE_3.6_TEST_RESULTS.json
) else (
    echo ❌ No test results found. Run tests first.
)
goto end

:clean_data
echo.
echo Cleaning test data...
echo.
echo This will DELETE all test scenarios from the database.
echo.
set /p confirm=Are you sure? (yes/no): 

if /i "%confirm%"=="yes" (
    echo.
    echo Executing cleanup...
    
    REM Create temporary SQL script to delete test data
    (
        echo DELETE FROM journal_entry_details WHERE journal_entry_id IN ^(
        echo   SELECT id FROM journal_entries 
        echo   WHERE description LIKE 'Scenario %%' 
        echo   AND company_id = 1
        echo ^);
        echo.
        echo DELETE FROM journal_entries 
        echo WHERE description LIKE 'Scenario %%' 
        echo AND company_id = 1;
    ) > cleanup.sql
    
    psql -h localhost -U postgres -d slms -f cleanup.sql
    
    if %errorlevel% equ 0 (
        echo.
        echo ✅ Test data cleaned successfully!
    ) else (
        echo.
        echo ❌ Failed to clean test data
    )
    
    del cleanup.sql 2>nul
) else (
    echo Cleanup cancelled.
)
goto end

:end
echo.
echo ════════════════════════════════════════════════════════════════════
echo.
pause
