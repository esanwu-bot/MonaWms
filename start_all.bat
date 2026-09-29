@echo off
setlocal

set ROOT=%~dp0
set MYSQL_BIN=D:\phpstudy_pro\Extensions\MySQL5.7.26\bin
set MYSQLD=%MYSQL_BIN%\mysqld.exe

echo ===== MonaWMS-Lite Local Launcher =====

:: Check if MySQL is already running
tasklist | findstr /I "mysqld.exe" >nul
if %errorlevel% neq 0 (
    echo [1/3] Starting MySQL ...
    if exist "%MYSQLD%" (
        start "MySQL 5.7" /B "%MYSQLD%" --defaults-file="D:\phpstudy_pro\Extensions\MySQL5.7.26\my.ini"
        timeout /t 3 /nobreak >nul
    ) else (
        echo Warning: %MYSQLD% not found, please start MySQL manually
    )
) else (
    echo [1/3] MySQL already running
)

echo [2/3] Starting Backend TP6 on port 8000 ...
start "Backend TP6" cmd /k "cd /d %ROOT%\backend_tp6 && php think run --host 0.0.0.0 --port 8000"

echo [3/3] Starting Frontend Vite ...
start "Frontend Vite" cmd /k "cd /d %ROOT%\frontend && npm run dev"

echo.
echo Services started:
echo   Backend API: http://127.0.0.1:8000/api
echo   Frontend URL: see the Vite terminal (usually http://localhost:5173)
echo.
echo Press any key to close this window (started services will keep running)
pause >nul
endlocal
