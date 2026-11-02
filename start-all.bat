@echo off
title Launch Kuber Application
echo Launching Kuber Backend and Frontend...
start "Kuber Backend (Flask)" cmd /k "cd /d %~dp0backend && python run.py"
start "Kuber Frontend (Next.js)" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Both servers launched in separate windows!
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000

