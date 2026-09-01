#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

PORT="${PORT:-7756}"

echo "=========================================================="
echo " Starting LuminaScale (NCNN Vulkan Local AI Upscaler)   "
echo " Target: AMD Ryzen 7 7730U + Radeon Vega 8 (RADV Renoir)"
echo " Memory Budget: <= 2048 MB RAM                           "
echo " Web UI running on: http://127.0.0.1:${PORT}             "
echo "=========================================================="

# Check Python environment
if [ ! -d "backend/venv" ]; then
    echo "Creating backend virtualenv..."
    python3 -m venv backend/venv
    backend/venv/bin/pip install -r backend/requirements.txt
fi

# Build frontend if needed
if [ ! -d "frontend/dist" ]; then
    echo "Building frontend..."
    cd frontend && npm install && npm run build && cd ..
fi

echo "Starting LuminaScale Backend & SPA on http://127.0.0.1:${PORT} ..."
export PYTHONPATH=backend
exec backend/venv/bin/uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port "$PORT"
