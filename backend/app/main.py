import asyncio
import logging
import os
import shutil
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional

import aiofiles
from fastapi import (
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
    Request,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sse_starlette.sse import EventSourceResponse

from app.config import (
    BINARY_PATH,
    MODELS_DIR,
    UPLOADS_DIR,
    OUTPUTS_DIR,
    STORAGE_DIR,
    PROJECT_ROOT,
    SUPPORTED_EXTENSIONS,
    MAX_SINGLE_FILE_SIZE_BYTES,
    MAX_BATCH_PAYLOAD_SIZE_BYTES,
    MAX_RECOMMENDED_BATCH_ITEMS,
    DEFAULT_TILE_SIZE,
    DEFAULT_GPU_ID,
    DEFAULT_THREADS,
    CLEANUP_INTERVAL_SECONDS,
    RETENTION_HOURS,
)
from app.models import (
    AVAILABLE_MODELS,
    BatchCreateResponse,
    BatchItemResponse,
    ItemStatus,
    JobResponse,
    ModelMetadata,
    SystemHealthResponse,
)
from app.queue import job_manager
from app.utils import (
    cleanup_stale_jobs,
    create_batch_zip,
    get_process_memory_mb,
    get_storage_usage_mb,
    sanitize_filename,
    validate_image_file,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("scaleup.api")


async def periodic_cleanup_task():
    """Background loop that purges jobs older than 24 hours every hour."""
    while True:
        try:
            await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
            pruned = cleanup_stale_jobs(RETENTION_HOURS)
            if pruned > 0:
                logger.info(f"Auto-cleanup purged {pruned} stale job directories")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error during scheduled cleanup: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure directories exist and launch background cleaner
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    cleanup_task = asyncio.create_task(periodic_cleanup_task())
    logger.info("ScaleUp backend initialized successfully")
    yield
    # Shutdown
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    logger.info("ScaleUp backend shut down")


app = FastAPI(
    title="ScaleUp AI Upscaler API",
    version="1.1.0",
    description="High-performance, hardware-accelerated local batch image upscaler using NCNN Vulkan.",
    lifespan=lifespan,
)

# Enable CORS for frontend Vite dev server and local access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static asset endpoints for previewing uploaded & upscaled images
app.mount("/static/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/static/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")

# Serve frontend build if present
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="frontend-assets")

    @app.api_route("/", methods=["GET", "HEAD"])
    async def serve_index():
        return FileResponse(FRONTEND_DIST / "index.html")




@app.get("/api/health", response_model=SystemHealthResponse)
async def get_health():
    """Returns system status, binary availability, and memory telemetry."""
    vulkan_dev = "AMD Radeon Graphics (RADV RENOIR)"
    available_model_files = []
    if MODELS_DIR.exists():
        available_model_files = [f.name for f in MODELS_DIR.glob("*.bin")]

    return SystemHealthResponse(
        status="healthy",
        binary_available=BINARY_PATH is not None and BINARY_PATH.exists(),
        binary_path=str(BINARY_PATH) if BINARY_PATH else None,
        vulkan_device=vulkan_dev,
        available_models=available_model_files,
        storage_usage_mb=get_storage_usage_mb(),
        process_memory_mb=round(get_process_memory_mb(), 2),
    )


@app.get("/api/models", response_model=List[ModelMetadata])
async def get_models():
    """Returns list of supported AI super-resolution models with metadata."""
    return AVAILABLE_MODELS


@app.post("/api/jobs/batch", response_model=BatchCreateResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_batch_job(
    files: List[UploadFile] = File(...),
    model: str = Form("realesrgan-x4plus"),
    scale: int = Form(4),
    tile_size: int = Form(DEFAULT_TILE_SIZE),
    gpu_id: int = Form(DEFAULT_GPU_ID),
    threads: str = Form(DEFAULT_THREADS),
):
    """
    Ingests batch of uploaded images, performs pre-flight validation,
    and enqueues the job for background NCNN Vulkan processing.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    # Validate model
    valid_model_ids = {m.id for m in AVAILABLE_MODELS}
    if model not in valid_model_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model '{model}'. Valid options: {', '.join(sorted(valid_model_ids))}",
        )

    # Validate scale
    selected_model_meta = next(m for m in AVAILABLE_MODELS if m.id == model)
    if scale not in selected_model_meta.scales:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scale {scale} for model {model}. Supported scales: {selected_model_meta.scales}",
        )

    job_id = str(uuid.uuid4())
    job_upload_dir = UPLOADS_DIR / job_id
    job_upload_dir.mkdir(parents=True, exist_ok=True)

    items: List[BatchItemResponse] = []
    warnings: List[str] = []
    total_payload_bytes = 0

    for idx, file in enumerate(files):
        original_filename = file.filename or f"image_{idx+1}.png"
        clean_filename = sanitize_filename(original_filename)
        item_id = str(uuid.uuid4())
        stored_name = f"{item_id}_{clean_filename}"
        target_path = job_upload_dir / stored_name

        # Stream save file to disk in chunks to avoid large memory allocations
        file_bytes = 0
        async with aiofiles.open(target_path, "wb") as f_out:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                file_bytes += len(chunk)
                if file_bytes > MAX_SINGLE_FILE_SIZE_BYTES:
                    break
                await f_out.write(chunk)

        total_payload_bytes += file_bytes
        if total_payload_bytes > MAX_BATCH_PAYLOAD_SIZE_BYTES:
            shutil.rmtree(job_upload_dir, ignore_errors=True)
            raise HTTPException(
                status_code=400,
                detail=f"Total batch size exceeded maximum allowance of 500 MB.",
            )

        # Pre-flight image validation
        is_valid, err_msg, meta = validate_image_file(target_path)
        if not is_valid:
            # File is corrupted, 0 bytes, or invalid format
            items.append(
                BatchItemResponse(
                    item_id=item_id,
                    original_name=original_filename,
                    stored_name=stored_name,
                    status=ItemStatus.SKIPPED_INVALID.value,
                    error_message=err_msg,
                    preview_url=None,
                    original_url=f"/static/uploads/{job_id}/{stored_name}",
                    file_size_bytes=file_bytes,
                )
            )
            warnings.append(f"File '{original_filename}' rejected: {err_msg}")
            continue

        # Check for dimension warning
        if meta and meta.get("warning"):
            warnings.append(f"'{original_filename}': {meta['warning']}")
            # Auto-clamp tile size if requested tile size is too large for 4K
            if meta.get("recommended_tile") and tile_size > meta["recommended_tile"]:
                tile_size = meta["recommended_tile"]

        items.append(
            BatchItemResponse(
                item_id=item_id,
                original_name=original_filename,
                stored_name=stored_name,
                status=ItemStatus.QUEUED.value,
                preview_url=None,
                original_url=f"/static/uploads/{job_id}/{stored_name}",
                input_width=meta.get("width") if meta else None,
                input_height=meta.get("height") if meta else None,
                file_size_bytes=file_bytes,
            )
        )

    if len(files) > MAX_RECOMMENDED_BATCH_ITEMS:
        warnings.append(
            f"Batch contains {len(files)} items (recommended max: {MAX_RECOMMENDED_BATCH_ITEMS}). Processing may take longer."
        )

    # Initialize Job context and launch asynchronous worker
    ctx = job_manager.create_job(
        job_id=job_id,
        model=model,
        scale=scale,
        tile_size=tile_size,
        items=items,
        warnings=warnings,
        gpu_id=gpu_id,
        threads=threads,
    )
    job_manager.start_job(job_id)

    return BatchCreateResponse(
        job_id=job_id,
        status="queued",
        total_items=len(items),
        created_at=ctx.created_at,
        warnings=warnings,
    )


@app.get("/api/jobs/{job_id}", response_model=JobResponse)
async def get_job_status(job_id: str):
    """Retrieves current execution status, telemetry progress, and item results for a job."""
    ctx = job_manager.get_job(job_id)
    if not ctx:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return ctx.to_response()


@app.get("/api/jobs/{job_id}/events")
async def stream_job_events(request: Request, job_id: str):
    """Server-Sent Events (SSE) endpoint for real-time progress and telemetry updates."""
    ctx = job_manager.get_job(job_id)
    if not ctx:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    return EventSourceResponse(job_manager.subscribe_events(job_id))


@app.post("/api/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    """Aborts an active batch job immediately and terminates child processes."""
    ctx = job_manager.get_job(job_id)
    if not ctx:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    success = await job_manager.cancel_job(job_id)
    return {"job_id": job_id, "cancelled": success, "status": ctx.status}


@app.get("/api/jobs/{job_id}/export")
async def export_batch_zip(job_id: str):
    """Downloads a consolidated ZIP archive containing all successfully processed images."""
    ctx = job_manager.get_job(job_id)
    if not ctx:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    job_output_dir = OUTPUTS_DIR / job_id
    zip_path = job_output_dir / f"upscaled_batch_{job_id}.zip"

    if not zip_path.exists():
        # Build zip if not already pre-built
        successful_files = []
        for item in ctx.items:
            if item.status == ItemStatus.SUCCESS.value and item.upscaled_name:
                p = job_output_dir / item.upscaled_name
                if p.exists():
                    successful_files.append((p, item.upscaled_name))

        if not successful_files:
            raise HTTPException(status_code=400, detail="No successfully processed images to export.")

        zip_path = create_batch_zip(job_id, successful_files, job_output_dir)

    return FileResponse(
        path=str(zip_path),
        media_type="application/zip",
        filename=f"upscaled_batch_{job_id}.zip",
    )


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    """Deletes job artifacts from disk and frees memory registry."""
    ctx = job_manager.get_job(job_id)
    if ctx and ctx.status == "processing":
        await job_manager.cancel_job(job_id)

    # Remove folders
    shutil.rmtree(UPLOADS_DIR / job_id, ignore_errors=True)
    shutil.rmtree(OUTPUTS_DIR / job_id, ignore_errors=True)
    job_manager.delete_job(job_id)

    return {"message": f"Job {job_id} deleted successfully."}


@app.post("/api/system/cleanup")
async def trigger_manual_cleanup(retention_hours: int = 24):
    """Manually triggers purging of temporary files older than specified retention hours."""
    pruned = cleanup_stale_jobs(retention_hours)
    return {
        "pruned_directories": pruned,
        "remaining_storage_mb": get_storage_usage_mb(),
    }
