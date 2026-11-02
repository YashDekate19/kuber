@echo off
title Kuber Flask Backend Server
cd /d %~dp0backend
echo Starting Kuber Flask REST API on http://localhost:5000...
python run.py
pause

