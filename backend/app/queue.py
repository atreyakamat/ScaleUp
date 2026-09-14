import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Dict, List, Optional, AsyncGenerator

from app.config import (
    UPLOADS_DIR,
    OUTPUTS_DIR,
    DEFAULT_GPU_ID,
    DEFAULT_THREADS,
    DEFAULT_TILE_SIZE,
)
from app.models import (
    ItemStatus,
    JobOverallStatus,
    BatchItemResponse,
    JobProgress,
    JobResponse,
)
from app.engine import NCNNEngine
from app.utils import create_batch_zip

logger = logging.getLogger("scaleup.queue")


class JobContext:
    def __init__(
        self,
        job_id: str,
        model: str,
        scale: int,
        tile_size: int,
        items: List[BatchItemResponse],
        warnings: List[str],
        gpu_id: int = DEFAULT_GPU_ID,
        threads: str = DEFAULT_THREADS,
    ):
        self.job_id = job_id
        self.model = model
        self.scale = scale
        self.tile_size = tile_size
        self.gpu_id = gpu_id
        self.threads = threads
        self.items = items
        self.warnings = warnings
        self.status = JobOverallStatus.QUEUED.value
        self.created_at = time.time()
        self.completed_at: Optional[float] = None
        self.progress = JobProgress(
            current_index=0,
            total_items=len(items),
            percentage=0.0,
            current_file=None,
            elapsed_seconds=0.0,
            eta_seconds=None,
        )
        self.cancel_event = asyncio.Event()
        self.subscribers: List[asyncio.Queue] = []
        self.engine = NCNNEngine()
        self.task: Optional[asyncio.Task] = None
        self.zip_path: Optional[Path] = None

    def to_response(self) -> JobResponse:
        return JobResponse(
            job_id=self.job_id,
            status=self.status,
            model=self.model,
            scale=self.scale,
            tile_size=self.tile_size,
            total_items=len(self.items),
            created_at=self.created_at,
            completed_at=self.completed_at,
            progress=self.progress,
            items=self.items,
            warnings=self.warnings,
        )

    def broadcast_event(self, event_type: str = "update"):
        payload = {
            "event": event_type,
            "data": self.to_response().model_dump(),
        }
        for q in list(self.subscribers):
            try:
                q.put_nowait(payload)
            except Exception:
                pass


class JobManager:
    def __init__(self):
        self.jobs: Dict[str, JobContext] = {}

    def create_job(
        self,
        job_id: str,
        model: str,
        scale: int,
        tile_size: int,
        items: List[BatchItemResponse],
        warnings: List[str],
        gpu_id: int = DEFAULT_GPU_ID,
        threads: str = DEFAULT_THREADS,
    ) -> JobContext:
        ctx = JobContext(
            job_id=job_id,
            model=model,
            scale=scale,
            tile_size=tile_size,
            items=items,
            warnings=warnings,
            gpu_id=gpu_id,
            threads=threads,
        )
        self.jobs[job_id] = ctx
        return ctx

    def get_job(self, job_id: str) -> Optional[JobContext]:
        return self.jobs.get(job_id)

    def start_job(self, job_id: str):
        ctx = self.get_job(job_id)
        if not ctx:
            return
        ctx.task = asyncio.create_task(self._process_job(ctx))

    async def cancel_job(self, job_id: str) -> bool:
        ctx = self.get_job(job_id)
        if not ctx:
            return False

        if ctx.status in [
            JobOverallStatus.COMPLETED.value,
            JobOverallStatus.FAILED.value,
            JobOverallStatus.CANCELLED.value,
        ]:
            return False

        logger.info(f"Cancelling job {job_id}")
        ctx.cancel_event.set()
        await ctx.engine.terminate_active_process()

        # Mark remaining queued items as cancelled
        for item in ctx.items:
            if item.status in [ItemStatus.QUEUED.value, ItemStatus.PROCESSING.value]:
                item.status = ItemStatus.CANCELLED.value
                if not item.error_message:
                    item.error_message = "Cancelled by user"

        ctx.status = JobOverallStatus.CANCELLED.value
        ctx.completed_at = time.time()
        ctx.progress.current_file = None
        ctx.broadcast_event("cancelled")
        return True

    @staticmethod
    def _resolve_output_filename(original_name: str) -> str:
        stem = Path(original_name).stem
        ext = Path(original_name).suffix.lower()
        if ext not in [".png", ".jpg", ".jpeg", ".webp"]:
            ext = ".png"
        return f"upscaled_{stem}{ext}"

    async def _process_single_item(
        self,
        ctx: JobContext,
        item: JobItem,
        job_upload_dir: Path,
        job_output_dir: Path,
    ) -> bool:
        input_path = job_upload_dir / item.stored_name
        upscaled_filename = self._resolve_output_filename(item.original_name)
        output_path = job_output_dir / upscaled_filename

        result = await ctx.engine.upscale_image(
            input_path=input_path,
            output_path=output_path,
            model_name=ctx.model,
            scale=ctx.scale,
            tile_size=ctx.tile_size,
            gpu_id=ctx.gpu_id,
            threads=ctx.threads,
            cancel_event=ctx.cancel_event,
        )

        if ctx.cancel_event.is_set():
            item.status = ItemStatus.CANCELLED.value
            item.error_message = "Job cancelled during processing"
            return False

        if result.success:
            item.status = ItemStatus.SUCCESS.value
            item.upscaled_name = upscaled_filename
            item.duration_seconds = result.duration_seconds
            item.preview_url = f"/static/outputs/{ctx.job_id}/{upscaled_filename}"
            item.original_url = f"/static/uploads/{ctx.job_id}/{item.stored_name}"
            item.output_width = result.output_width
            item.output_height = result.output_height
            item.file_size_bytes = result.file_size_bytes
            item.tile_size_used = result.tile_size_used
            return True

        item.status = ItemStatus.FAILED.value
        item.error_message = result.error_message
        item.original_url = f"/static/uploads/{ctx.job_id}/{item.stored_name}"
        return False

    async def _process_job(self, ctx: JobContext):
        job_upload_dir = UPLOADS_DIR / ctx.job_id
        job_output_dir = OUTPUTS_DIR / ctx.job_id
        job_output_dir.mkdir(parents=True, exist_ok=True)

        ctx.status = JobOverallStatus.PROCESSING.value
        start_time = time.time()
        processed_durations: List[float] = []

        total = len(ctx.items)
        success_count = 0
        failed_count = 0

        ctx.broadcast_event("start")

        for idx, item in enumerate(ctx.items):
            if ctx.cancel_event.is_set():
                break

            if item.status == ItemStatus.SKIPPED_INVALID.value:
                failed_count += 1
                ctx.progress.current_index = idx + 1
                ctx.progress.percentage = round(((idx + 1) / total) * 100, 1)
                ctx.broadcast_event("item_skip")
                continue

            item.status = ItemStatus.PROCESSING.value
            ctx.progress.current_index = idx + 1
            ctx.progress.current_file = item.original_name
            ctx.progress.percentage = round((idx / total) * 100, 1)
            ctx.progress.elapsed_seconds = round(time.time() - start_time, 1)

            if processed_durations:
                avg_dur = sum(processed_durations) / len(processed_durations)
                ctx.progress.eta_seconds = round(avg_dur * (total - idx), 1)
            else:
                ctx.progress.eta_seconds = None

            ctx.broadcast_event("item_start")

            succeeded = await self._process_single_item(ctx, item, job_upload_dir, job_output_dir)
            if ctx.cancel_event.is_set():
                break

            if succeeded:
                success_count += 1
                if item.duration_seconds:
                    processed_durations.append(item.duration_seconds)
            else:
                failed_count += 1

            ctx.progress.percentage = round(((idx + 1) / total) * 100, 1)
            ctx.progress.elapsed_seconds = round(time.time() - start_time, 1)
            ctx.broadcast_event("item_done")

        ctx.completed_at = time.time()
        ctx.progress.elapsed_seconds = round(ctx.completed_at - start_time, 1)
        ctx.progress.current_file = None
        ctx.progress.eta_seconds = 0.0

        # Determine overall job status
        if ctx.cancel_event.is_set():
            ctx.status = JobOverallStatus.CANCELLED.value
        elif failed_count == 0 and success_count > 0:
            ctx.status = JobOverallStatus.COMPLETED.value
        elif success_count > 0 and failed_count > 0:
            ctx.status = JobOverallStatus.PARTIAL_FAILURE.value
        else:
            ctx.status = JobOverallStatus.FAILED.value

        # Pre-generate ZIP bundle for fast download if any images succeeded
        if success_count > 0:
            try:
                successful_files = []
                for item in ctx.items:
                    if item.status == ItemStatus.SUCCESS.value and item.upscaled_name:
                        file_p = job_output_dir / item.upscaled_name
                        if file_p.exists():
                            successful_files.append((file_p, item.upscaled_name))
                if successful_files:
                    ctx.zip_path = create_batch_zip(ctx.job_id, successful_files, job_output_dir)
            except Exception:
                logger.exception("Failed to create ZIP package")

        ctx.broadcast_event("complete")

    async def subscribe_events(self, job_id: str) -> AsyncGenerator[dict, None]:
        ctx = self.get_job(job_id)
        if not ctx:
            return

        queue = asyncio.Queue()
        ctx.subscribers.append(queue)
        try:
            # Yield initial current state immediately
            yield {
                "event": "init",
                "data": json.dumps(ctx.to_response().model_dump()),
            }

            while True:
                payload = await queue.get()
                yield {
                    "event": payload["event"],
                    "data": json.dumps(payload["data"]),
                }
                if payload["event"] in ["complete", "cancelled"]:
                    break
        finally:
            if queue in ctx.subscribers:
                ctx.subscribers.remove(queue)

    def delete_job(self, job_id: str):
        if job_id in self.jobs:
            del self.jobs[job_id]


# Global singleton manager
job_manager = JobManager()
