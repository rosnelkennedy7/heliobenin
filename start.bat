@echo off
title HélioBénin — Démarrage serveurs
echo.
echo  ══════════════════════════════════════
echo   HélioBénin — Démarrage des serveurs
echo  ══════════════════════════════════════
echo.

:: Tuer les anciens processus sur les ports 5173, 5174, 8000
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5174 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 /nobreak >nul

:: ── Terminal 1 : Backend FastAPI ──
echo  [1/3] Démarrage Backend (port 8000)...
start "Backend :8000" cmd /k "cd /d C:\Users\VICTUS\Desktop\heliobenin\backend && C:\Users\VICTUS\Desktop\heliobenin\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

timeout /t 2 /nobreak >nul

:: ── Terminal 2 : Frontend utilisateur ──
echo  [2/3] Démarrage Frontend user (port 5173)...
start "Frontend :5173" cmd /k "cd /d C:\Users\VICTUS\Desktop\heliobenin\frontend && npm run dev"

timeout /t 2 /nobreak >nul

:: ── Terminal 3 : Frontend admin ──
echo  [3/3] Démarrage Frontend admin (port 5174)...
start "Admin :5174" cmd /k "cd /d C:\Users\VICTUS\Desktop\heliobenin\frontend && npx vite --config vite.admin.config.js"

echo.
echo  ══════════════════════════════════════
echo   Serveurs en cours de démarrage...
echo.
echo   Frontend  →  http://localhost:5173
echo   Admin     →  http://localhost:5174/admin
echo   Backend   →  http://localhost:8000
echo  ══════════════════════════════════════
echo.
echo  Attendez 5 secondes puis ouvrez votre navigateur.
echo  Cette fenêtre peut être fermée.
echo.
timeout /t 5 /nobreak >nul

:: Ouvrir automatiquement les deux pages
start "" "http://localhost:5173"
start "" "http://localhost:5174/admin"
