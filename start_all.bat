@echo off
chcp 65001 >nul
setlocal

set ROOT=%~dp0
set MYSQL_BIN=D:\phpstudy_pro\Extensions\MySQL5.7.26\bin
set MYSQLD=%MYSQL_BIN%\mysqld.exe

echo ===== MonaWMS-Lite 本地启动脚本 =====

:: 检查 MySQL 是否已在运行
tasklist | findstr /I "mysqld.exe" >nul
if %errorlevel% neq 0 (
    echo [1/3] 正在启动 MySQL ...
    if exist "%MYSQLD%" (
        start "MySQL 5.7" /B "%MYSQLD%" --defaults-file="D:\phpstudy_pro\Extensions\MySQL5.7.26\my.ini"
        timeout /t 3 /nobreak >nul
    ) else (
        echo 警告：未找到 %MYSQLD%，请手动启动 MySQL
    )
) else (
    echo [1/3] MySQL 已运行
)

echo [2/3] 正在启动后端 ThinkPHP 6（端口 8000）...
start "Backend TP6" cmd /k "cd /d %ROOT%\backend_tp6 && php think run :8000"

echo [3/3] 正在启动前端 Vite ...
start "Frontend Vite" cmd /k "cd /d %ROOT%\frontend && npm run dev"

echo.
echo 服务已启动：
echo   后端 API：http://127.0.0.1:8000/api
echo   前端页面：见 Vite 终端输出（通常为 http://localhost:5173）
echo.
echo 按任意键关闭本窗口（不会停止已启动的服务）
pause >nul
endlocal
