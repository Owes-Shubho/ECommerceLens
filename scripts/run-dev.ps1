# Starts the analytics service, the API and the frontend in three windows (Windows PowerShell).
# First run: create analytics-service\.venv and run `npm install` in api and frontend (see their READMEs).
$root = Split-Path -Parent $PSScriptRoot
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\analytics-service'; .\.venv\Scripts\activate; python app.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\api'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"
Write-Host "Analytics: http://localhost:5001  API: http://localhost:4000/api  Frontend: http://localhost:5173"
