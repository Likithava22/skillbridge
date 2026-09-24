@echo off
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

:: 1. Launch Backend Service (Port 5000)
cd /d "%ROOT_DIR%\backend"
start "SkillBridge Backend Service (Port 5000)" cmd /k "title SkillBridge Backend API (Port 5000) & color 0A & node server.js"

:: 2. Launch Frontend Service (Port 3000)
cd /d "%ROOT_DIR%\frontend"
start "SkillBridge Frontend Service (Port 3000)" cmd /k "title SkillBridge Frontend Service (Port 3000) & color 0E & node server.js"

:: 3. Open Portal in Default Browser & Auto-Close Launcher Window
timeout /t 2 /nobreak >nul
start http://localhost:3000
exit
