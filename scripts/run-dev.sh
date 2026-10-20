#!/usr/bin/env bash
# Starts the analytics service, the API and the frontend; Ctrl+C stops all three.
# First run: create analytics-service/.venv and run `npm install` in api and frontend (see their READMEs).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
trap 'kill 0' EXIT
(cd "$ROOT/analytics-service" && source .venv/bin/activate && python app.py) &
(cd "$ROOT/api" && npm run dev) &
(cd "$ROOT/frontend" && npm run dev) &
echo "Analytics: http://localhost:5001  API: http://localhost:4000/api  Frontend: http://localhost:5173"
wait
