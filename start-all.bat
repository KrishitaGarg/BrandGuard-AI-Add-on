@echo off
REM BrandGuard AI - Start All Services (Windows)
REM This script starts all required services in separate windows

echo.
echo ================================================================
echo  BrandGuard AI - Starting All Services
echo ================================================================
echo.

echo Starting Backend Server (port 3000)...
start "BrandGuard Backend" cmd /k "cd backend && node src/server.js"

timeout /t 2 /nobreak

echo Starting MCP/AI Server (port 3001)...
start "BrandGuard MCP Server" cmd /k "cd server && node simple-server.cjs"

timeout /t 2 /nobreak

echo Starting Adobe Express UI (port 5241)...
start "BrandGuard Express UI" cmd /k "cd brandguard-express && npm start"

echo.
echo ================================================================
echo  Services Starting - Check the windows that opened
echo ================================================================
echo.
echo Backend:      http://localhost:3000
echo MCP Server:   http://localhost:3001
echo Adobe Express:https://localhost:5241
echo.
pause
