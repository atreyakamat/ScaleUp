#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "=========================================================="
echo "  ScaleUp — Automated Setup & Model Seeding Pipeline     "
echo "=========================================================="

# 1. Directories
echo "[1/5] Initializing project directory structure..."
mkdir -p backend/bin/models backend/storage/uploads backend/storage/outputs
touch backend/storage/uploads/.gitkeep backend/storage/outputs/.gitkeep

# 2. Download NCNN Vulkan binary if not present
if [ ! -f "backend/bin/realesrgan-ncnn-vulkan" ]; then
    echo "[2/5] Downloading Real-ESRGAN NCNN Vulkan binary..."
    cd backend/bin
    curl -sL -o realesrgan.zip https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-ubuntu.zip
    unzip -q -o realesrgan.zip
    rm -f realesrgan.zip
    chmod +x realesrgan-ncnn-vulkan
    cd "$DIR"
else
    echo "[2/5] NCNN Vulkan binary already present."
fi

# 3. Seed AI Models
echo "[3/5] Verifying and seeding AI super-resolution models..."
MODELS_DIR="backend/bin/models"

# Ensure realesrnet-x4plus is present
if [ ! -f "$MODELS_DIR/realesrnet-x4plus.bin" ] || [ ! -f "$MODELS_DIR/realesrnet-x4plus.param" ]; then
    echo "  -> Fetching Real-ESRNet x4plus weights..."
    curl -sL https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.2/realesrgan-ncnn-vulkan-20210801-ubuntu.zip -o /tmp/v012.zip
    unzip -q -j /tmp/v012.zip "models/realesrnet-x4plus.*" -d "$MODELS_DIR/"
    rm -f /tmp/v012.zip
fi

echo "  -> Models in $MODELS_DIR:"
ls -lh "$MODELS_DIR"/*.bin

# 4. Setup Python Virtual Environment
echo "[4/5] Setting up Python backend virtual environment..."
if [ ! -d "backend/venv" ]; then
    python3 -m venv backend/venv
fi
backend/venv/bin/pip install --upgrade pip --quiet
backend/venv/bin/pip install -r backend/requirements.txt --quiet

# 5. Build Frontend SPA
echo "[5/5] Building React frontend SPA..."
cd frontend
npm install --quiet
npm run build
cd "$DIR"

# 6. Install Global CLI Command
echo "Installing ScaleUp CLI to ~/.local/bin/ScaleUp..."
mkdir -p ~/.local/bin
cp bin/ScaleUp ~/.local/bin/ScaleUp
chmod +x ~/.local/bin/ScaleUp

echo ""
echo "=========================================================="
echo "  ✅ ScaleUp is fully setup, seeded, and ready to run!    "
echo "  Start in background:  ScaleUp --bg                     "
echo "  Start in foreground:  ./run.sh                          "
echo "  Web UI:               http://localhost:7756             "
echo "=========================================================="
