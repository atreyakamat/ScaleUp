import os
import re
import time
import zipfile
import shutil
from pathlib import Path
from typing import Tuple, Optional, Dict, Any, List
from PIL import Image

from app.config import (
    SUPPORTED_EXTENSIONS,
    MAX_SINGLE_FILE_SIZE_BYTES,
    HIGH_RES_THRESHOLD_PIXELS,
    MEDIUM_RES_THRESHOLD_PIXELS,
    UPLOADS_DIR,
    OUTPUTS_DIR,
    STORAGE_DIR,
    RETENTION_HOURS,
)


def sanitize_filename(filename: str) -> str:
    """Sanitizes filename against directory traversal and dangerous characters."""
    clean = os.path.basename(filename)
    clean = re.sub(r'[\r\n\t\0]', '', clean)
    clean = re.sub(r'[^\w.\- ]', '_', clean)
    if not clean:
        clean = f"image_{int(time.time()*1000)}"
    return clean


def validate_image_file(file_path: Path) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """
    Validates that a file is a non-empty, valid raster image of supported format.
    Checks dimensions and memory footprint.
    Does not keep full pixel buffers in memory.
    """
    if not file_path.exists():
        return False, "File does not exist on disk", None

    file_size = file_path.stat().st_size
    if file_size == 0:
        return False, "Uploaded file is 0 bytes (empty file)", None

    if file_size > MAX_SINGLE_FILE_SIZE_BYTES:
        return False, f"File size ({file_size / (1024*1024):.1f} MB) exceeds limit of 50 MB", None

    ext = file_path.suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        return False, f"Unsupported format '{ext}'. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}", None

    try:
        # Fast header & structure verification
        with Image.open(file_path) as img:
            img.verify()

        # Re-open to read dimensions & properties (verify closes file handle)
        with Image.open(file_path) as img:
            width, height = img.size
            img_format = img.format
            mode = img.mode

        total_pixels = width * height
        warning = None
        recommended_tile = None

        if total_pixels > HIGH_RES_THRESHOLD_PIXELS:
            warning = f"High resolution image ({width}x{height}, >4K). Clamping tile size to 128/256px to safeguard GPU memory."
            recommended_tile = 128
        elif total_pixels > MEDIUM_RES_THRESHOLD_PIXELS:
            recommended_tile = 256

        meta = {
            "width": width,
            "height": height,
            "format": img_format,
            "mode": mode,
            "file_size": file_size,
            "warning": warning,
            "recommended_tile": recommended_tile,
        }
        return True, None, meta

    except Exception as e:
        return False, f"Corrupted or invalid image data: {str(e)}", None


def create_batch_zip(job_id: str, output_files: List[Tuple[Path, str]], output_dir: Path) -> Path:
    """
    Safely packages processed output images into a single ZIP archive.
    output_files is a list of (absolute_file_path, arcname).
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    zip_path = output_dir / f"upscaled_batch_{job_id}.zip"
    
    # Write to temporary file first then atomic rename
    temp_zip = output_dir / f".temp_{job_id}.zip"
    with zipfile.ZipFile(temp_zip, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for file_path, arcname in output_files:
            if file_path.exists():
                zf.write(file_path, arcname=arcname)
    
    temp_zip.replace(zip_path)
    return zip_path


def _is_dir_stale(item: Path, cutoff: float) -> bool:
    try:
        return item.is_dir() and item.stat().st_mtime < cutoff
    except OSError:
        return False


def cleanup_stale_jobs(retention_hours: int = RETENTION_HOURS) -> int:
    """Purges job folders older than retention_hours from uploads and outputs."""
    cutoff = time.time() - (retention_hours * 3600)
    pruned_count = 0

    for base_dir in [UPLOADS_DIR, OUTPUTS_DIR]:
        if not base_dir.exists():
            continue
        for item in base_dir.iterdir():
            if _is_dir_stale(item, cutoff):
                shutil.rmtree(item, ignore_errors=True)
                pruned_count += 1

    return pruned_count


def get_process_memory_mb() -> float:
    """Retrieves current process RSS memory in MB via /proc/self/status on Linux."""
    try:
        with open("/proc/self/status", "r") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    parts = line.split()
                    return float(parts[1]) / 1024.0
    except Exception:
        pass
    return 0.0


def get_storage_usage_mb() -> float:
    """Calculates total size of storage directory in MB."""
    total_bytes = 0
    if STORAGE_DIR.exists():
        for root, _, files in os.walk(STORAGE_DIR):
            for f in files:
                try:
                    total_bytes += os.path.getsize(os.path.join(root, f))
                except OSError:
                    pass
    return round(total_bytes / (1024 * 1024), 2)
