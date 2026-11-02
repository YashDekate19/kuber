@echo off
title Kuber Next.js Frontend Server
cd /d %~dp0frontend
echo Starting Kuber Next.js Frontend on http://localhost:3000...
npm run dev
pause

