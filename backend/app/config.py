import os
import shutil
from pathlib import Path

# Base Paths
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

BIN_DIR = BACKEND_DIR / "bin"
MODELS_DIR = BIN_DIR / "models"
STORAGE_DIR = BACKEND_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
OUTPUTS_DIR = STORAGE_DIR / "outputs"

# Ensure storage directories exist
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
BIN_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Binary path resolution
def get_binary_path() -> Path | None:
    local_bin = BIN_DIR / "realesrgan-ncnn-vulkan"
    if local_bin.exists() and os.access(local_bin, os.X_OK):
        return local_bin
    
    sys_bin = shutil.which("realesrgan-ncnn-vulkan")
    if sys_bin:
        return Path(sys_bin)
    
    return None

BINARY_PATH = get_binary_path()

# Supported image formats
SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
SUPPORTED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/bmp",
    "image/x-ms-bmp",
}

# Operational limits & budgets
MAX_SINGLE_FILE_SIZE_BYTES = 50 * 1024 * 1024       # 50 MB
MAX_BATCH_PAYLOAD_SIZE_BYTES = 500 * 1024 * 1024    # 500 MB
MAX_RECOMMENDED_BATCH_ITEMS = 50

# Hardware & Tiling Defaults (Optimized for Ryzen 7 7730U + Vega 8 RADV)
DEFAULT_GPU_ID = 0
DEFAULT_TILE_SIZE = 128  # 128px prevents Vulkan workgroup shader buffer overflow on Vega 8
DEFAULT_THREADS = "1:2:2"   # load:proc:save
HIGH_RES_THRESHOLD_PIXELS = 3840 * 2160 # 4K
MEDIUM_RES_THRESHOLD_PIXELS = 1920 * 1080 # ~2MP

# System RAM Budget
PROCESS_RAM_BUDGET_MB = 2048 # 2 GB maximum budget

# Session retention
RETENTION_HOURS = 24
CLEANUP_INTERVAL_SECONDS = 3600 # 1 hour
