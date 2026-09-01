import asyncio
import logging
import os
import signal
import time
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
from PIL import Image

from app.config import (
    BINARY_PATH,
    MODELS_DIR,
    DEFAULT_GPU_ID,
    DEFAULT_THREADS,
    DEFAULT_TILE_SIZE,
)

logger = logging.getLogger("luminascale.engine")


class InferenceResult:
    def __init__(
        self,
        success: bool,
        output_path: Optional[Path] = None,
        duration_seconds: float = 0.0,
        error_message: Optional[str] = None,
        tile_size_used: int = DEFAULT_TILE_SIZE,
        output_width: Optional[int] = None,
        output_height: Optional[int] = None,
        file_size_bytes: Optional[int] = None,
    ):
        self.success = success
        self.output_path = output_path
        self.duration_seconds = duration_seconds
        self.error_message = error_message
        self.tile_size_used = tile_size_used
        self.output_width = output_width
        self.output_height = output_height
        self.file_size_bytes = file_size_bytes


class NCNNEngine:
    def __init__(self):
        self.binary_path = BINARY_PATH
        self.models_dir = MODELS_DIR
        self.active_process: Optional[asyncio.subprocess.Process] = None

    async def upscale_image(
        self,
        input_path: Path,
        output_path: Path,
        model_name: str = "realesrgan-x4plus",
        scale: int = 4,
        tile_size: int = DEFAULT_TILE_SIZE,
        gpu_id: int = DEFAULT_GPU_ID,
        threads: str = DEFAULT_THREADS,
        cancel_event: Optional[asyncio.Event] = None,
    ) -> InferenceResult:
        """
        Executes NCNN Vulkan upscale inference on input_path -> output_path.
        Includes automatic model tile clamping and black-image detection recovery.
        """
        if cancel_event and cancel_event.is_set():
            return InferenceResult(success=False, error_message="Job was cancelled")

        # Clamp tile size to hardware-safe limits on AMD Vega 8 iGPU
        current_tile = tile_size
        if model_name == "realesrnet-x4plus":
            # Real-ESRNet requires <= 64px tiles on Vega 8 to avoid Vulkan shader overflow
            if current_tile == 0 or current_tile > 64:
                current_tile = 64
        elif model_name == "realesrgan-x4plus":
            # Real-ESRGAN x4plus requires <= 128px tiles on Vega 8
            if current_tile == 0 or current_tile > 128:
                current_tile = 128

        # First attempt
        res = await self._run_subprocess(
            input_path=input_path,
            output_path=output_path,
            model_name=model_name,
            scale=scale,
            tile_size=current_tile,
            gpu_id=gpu_id,
            threads=threads,
            cancel_event=cancel_event,
        )

        # Check if output is all black (caused by Vulkan workgroup buffer overflow)
        is_all_black = False
        if res.success and output_path.exists():
            try:
                with Image.open(output_path) as img:
                    ext = img.getextrema()
                    if isinstance(ext, tuple) and len(ext) > 0:
                        if isinstance(ext[0], tuple):  # Multi-channel
                            is_all_black = all(ch_max == 0 for _, ch_max in ext[:3])
                        else:
                            is_all_black = (ext[1] == 0)
            except Exception:
                pass

        if is_all_black:
            logger.warning(
                f"Vulkan output produced all-black image at tile_size={current_tile}. Triggering adaptive tile reduction..."
            )
            res.success = False
            res.error_message = "Vulkan shader buffer overflow (all black output)"

        if res.success:
            return res

        # Recovery strategy: Retry with reduced tile size (64 or 32)
        if current_tile > 32 and not (cancel_event and cancel_event.is_set()):
            new_tile = 64 if current_tile > 64 else 32
            logger.warning(
                f"Halving tile size from {current_tile} to {new_tile} to recover valid image output..."
            )
            if output_path.exists():
                try:
                    output_path.unlink()
                except Exception:
                    pass

            retry_res = await self._run_subprocess(
                input_path=input_path,
                output_path=output_path,
                model_name=model_name,
                scale=scale,
                tile_size=new_tile,
                gpu_id=gpu_id,
                threads=threads,
                cancel_event=cancel_event,
            )
            if retry_res.success:
                logger.info(f"Recovery succeeded at tile_size={new_tile}")
                return retry_res

        return res

    async def _run_subprocess(
        self,
        input_path: Path,
        output_path: Path,
        model_name: str,
        scale: int,
        tile_size: int,
        gpu_id: int,
        threads: str,
        cancel_event: Optional[asyncio.Event],
    ) -> InferenceResult:
        if not self.binary_path or not self.binary_path.exists():
            # Fallback to software high-quality scaling if binary missing
            return await self._fallback_cpu_upscale(input_path, output_path, scale, cancel_event)

        cmd = [
            str(self.binary_path),
            "-i", str(input_path.resolve()),
            "-o", str(output_path.resolve()),
            "-n", model_name,
            "-s", str(scale),
            "-t", str(tile_size),
            "-m", str(self.models_dir.resolve()),
            "-g", str(gpu_id),
            "-j", threads,
            "-v",
        ]

        logger.info(f"Executing: {' '.join(cmd)}")
        start_time = time.perf_counter()

        try:
            self.active_process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            # Wait for process or cancellation
            while self.active_process.returncode is None:
                if cancel_event and cancel_event.is_set():
                    await self.terminate_active_process()
                    return InferenceResult(
                        success=False,
                        error_message="Process cancelled by user",
                        tile_size_used=tile_size,
                    )
                try:
                    stdout_data, stderr_data = await asyncio.wait_for(
                        self.active_process.communicate(), timeout=0.5
                    )
                    break
                except asyncio.TimeoutError:
                    continue

            duration = time.perf_counter() - start_time
            stdout_str = stdout_data.decode("utf-8", errors="replace") if stdout_data else ""
            stderr_str = stderr_data.decode("utf-8", errors="replace") if stderr_data else ""
            full_logs = f"{stdout_str}\n{stderr_str}".strip()

            if self.active_process.returncode != 0:
                err = f"NCNN failed with exit code {self.active_process.returncode}: {full_logs}"
                logger.error(err)
                return InferenceResult(
                    success=False,
                    duration_seconds=duration,
                    error_message=err,
                    tile_size_used=tile_size,
                )

            if not output_path.exists() or output_path.stat().st_size == 0:
                return InferenceResult(
                    success=False,
                    duration_seconds=duration,
                    error_message="NCNN process finished but output file was not created",
                    tile_size_used=tile_size,
                )

            # Inspect output image details
            out_width, out_height = None, None
            try:
                with Image.open(output_path) as img:
                    out_width, out_height = img.size
            except Exception:
                pass

            file_size = output_path.stat().st_size

            return InferenceResult(
                success=True,
                output_path=output_path,
                duration_seconds=round(duration, 3),
                tile_size_used=tile_size,
                output_width=out_width,
                output_height=out_height,
                file_size_bytes=file_size,
            )

        except Exception as e:
            duration = time.perf_counter() - start_time
            return InferenceResult(
                success=False,
                duration_seconds=duration,
                error_message=f"Subprocess execution error: {str(e)}",
                tile_size_used=tile_size,
            )
        finally:
            self.active_process = None

    async def _fallback_cpu_upscale(
        self,
        input_path: Path,
        output_path: Path,
        scale: int,
        cancel_event: Optional[asyncio.Event],
    ) -> InferenceResult:
        """Pillow Lanczos upscale fallback if NCNN binary is unavailable."""
        start_time = time.perf_counter()
        try:
            if cancel_event and cancel_event.is_set():
                return InferenceResult(success=False, error_message="Job was cancelled")

            with Image.open(input_path) as img:
                w, h = img.size
                new_w, new_h = w * scale, h * scale
                # High quality resampling
                upscaled = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                upscaled.save(output_path, quality=95)

            duration = time.perf_counter() - start_time
            return InferenceResult(
                success=True,
                output_path=output_path,
                duration_seconds=round(duration, 3),
                tile_size_used=0,
                output_width=new_w,
                output_height=new_h,
                file_size_bytes=output_path.stat().st_size,
            )
        except Exception as e:
            return InferenceResult(
                success=False,
                duration_seconds=time.perf_counter() - start_time,
                error_message=f"CPU fallback failed: {str(e)}",
            )

    async def terminate_active_process(self):
        """Sends SIGTERM, then SIGKILL if process does not exit."""
        if self.active_process and self.active_process.returncode is None:
            try:
                self.active_process.send_signal(signal.SIGTERM)
                try:
                    await asyncio.wait_for(self.active_process.wait(), timeout=1.5)
                except asyncio.TimeoutError:
                    self.active_process.kill()
                    await self.active_process.wait()
            except ProcessLookupError:
                pass
            except Exception as e:
                logger.warning(f"Error terminating process: {e}")
            finally:
                self.active_process = None
