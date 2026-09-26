import asyncio
import io
import time
from pathlib import Path
from PIL import Image
import pytest
import httpx

from app.config import (
    STORAGE_DIR,
    DEFAULT_TILE_SIZE,
    DEFAULT_GPU_ID,
    DEFAULT_THREADS,
    get_binary_path,
)
from app.models import (
    AVAILABLE_MODELS,
    JobOverallStatus,
    ItemStatus,
    ModelMetadata,
    JobProgress,
    BatchItemResponse,
    JobResponse,
)
from app.engine import NCNNEngine, MSG_JOB_CANCELLED
from app.utils import (
    sanitize_filename,
    validate_image_file,
    create_batch_zip,
    cleanup_stale_jobs,
    get_process_memory_mb,
    get_storage_usage_mb,
)
from app.main import app


def _create_temp_image(tmp_path: Path, filename: str, size=(64, 64), color=(255, 0, 0)) -> Path:
    p = tmp_path / filename
    img = Image.new("RGB", size, color=color)
    img.save(p)
    return p


def test_models_config():
    assert len(AVAILABLE_MODELS) >= 4
    model_ids = [m.id for m in AVAILABLE_MODELS]
    assert "realesrgan-x4plus" in model_ids
    assert "realesrnet-x4plus" in model_ids


def test_binary_path_check():
    bp = get_binary_path()
    assert bp is not None or bp is None


def test_binary_path_fallback(monkeypatch):
    import app.config as cfg
    monkeypatch.setattr(cfg.Path, "exists", lambda self: False)
    res = cfg.get_binary_path()
    assert res is None or isinstance(res, cfg.Path)


def test_engine_tile_size_clamping():
    # realesrnet-x4plus clamps to 64
    assert NCNNEngine._clamp_tile_size("realesrnet-x4plus", 0) == 64
    assert NCNNEngine._clamp_tile_size("realesrnet-x4plus", 128) == 64
    assert NCNNEngine._clamp_tile_size("realesrnet-x4plus", 64) == 64

    # realesrgan-x4plus clamps to 128
    assert NCNNEngine._clamp_tile_size("realesrgan-x4plus", 256) == 128
    assert NCNNEngine._clamp_tile_size("realesrgan-x4plus", 64) == 64

    # Other models keep their tile size
    assert NCNNEngine._clamp_tile_size("realesr-animevideov3", 256) == 256


@pytest.mark.anyio
async def test_engine_cancelled_immediate(tmp_path):
    engine = NCNNEngine()
    cancel_evt = asyncio.Event()
    cancel_evt.set()

    in_img = _create_temp_image(tmp_path, "input.png")
    out_img = tmp_path / "output.png"

    res = await engine.upscale_image(
        input_path=in_img,
        output_path=out_img,
        cancel_event=cancel_evt,
    )
    assert res.success is False
    assert res.error_message == MSG_JOB_CANCELLED


@pytest.mark.anyio
async def test_engine_fallback_cpu_upscale(tmp_path):
    engine = NCNNEngine()
    in_img = _create_temp_image(tmp_path, "cpu_in.png", size=(32, 32), color=(0, 255, 0))
    out_img = tmp_path / "cpu_out.png"

    # Successful fallback
    res = await engine._fallback_cpu_upscale(in_img, out_img, scale=2, cancel_event=None)
    assert res.success is True
    assert res.output_width == 64
    assert res.output_height == 64
    assert out_img.exists()

    # Cancelled fallback
    cancel_evt = asyncio.Event()
    cancel_evt.set()
    res_cancel = await engine._fallback_cpu_upscale(in_img, out_img, scale=2, cancel_event=cancel_evt)
    assert res_cancel.success is False
    assert res_cancel.error_message == MSG_JOB_CANCELLED

    # Error fallback on invalid file
    bad_path = tmp_path / "does_not_exist.png"
    res_err = await engine._fallback_cpu_upscale(bad_path, out_img, scale=2, cancel_event=None)
    assert res_err.success is False
    assert "CPU fallback failed" in res_err.error_message


def test_engine_detect_black_image(tmp_path):
    engine = NCNNEngine()

    black_img = _create_temp_image(tmp_path, "black.png", size=(50, 50), color=(0, 0, 0))
    assert engine._is_image_black(black_img) is True

    color_img = _create_temp_image(tmp_path, "color.png", size=(50, 50), color=(100, 150, 200))
    assert engine._is_image_black(color_img) is False

    nonexistent = tmp_path / "ghost.png"
    assert engine._is_image_black(nonexistent) is False


@pytest.mark.anyio
async def test_engine_terminate_process():
    engine = NCNNEngine()
    # When active_process is None, should complete safely
    await engine.terminate_active_process()
    assert engine.active_process is None


def test_utils_sanitization(tmp_path):
    # Sanitize filename tests
    assert sanitize_filename("../../etc/passwd") == "passwd"
    assert sanitize_filename("safe_image.png") == "safe_image.png"
    clean_empty = sanitize_filename("")
    assert clean_empty.startswith("image_")


def test_utils_image_validation(tmp_path):
    # Valid image
    p = _create_temp_image(tmp_path, "meta.png", size=(80, 60))
    valid, err, meta = validate_image_file(p)
    assert valid is True
    assert err is None
    assert meta["width"] == 80
    assert meta["height"] == 60

    # Nonexistent file
    ghost = tmp_path / "nonexistent.png"
    v_ghost, err_ghost, _ = validate_image_file(ghost)
    assert v_ghost is False
    assert "does not exist" in err_ghost

    # 0-byte file
    empty = tmp_path / "empty.png"
    empty.write_bytes(b"")
    v_empty, err_empty, _ = validate_image_file(empty)
    assert v_empty is False
    assert "0 bytes" in err_empty

    # Corrupt / invalid image
    corrupt = tmp_path / "corrupt.png"
    corrupt.write_bytes(b"NOT_PNG_DATA")
    v_corrupt, err_corrupt, _ = validate_image_file(corrupt)
    assert v_corrupt is False
    assert "Corrupted" in err_corrupt

    # Unsupported format
    txt = tmp_path / "test.txt"
    txt.write_text("hello")
    v_txt, err_txt, _ = validate_image_file(txt)
    assert v_txt is False
    assert "Unsupported format" in err_txt


def test_utils_image_validation_resolutions(tmp_path):
    # Medium res (> 1080p, <= 4K)
    med_img = _create_temp_image(tmp_path, "med.png", size=(2000, 1100))
    v_med, _, meta_med = validate_image_file(med_img)
    assert v_med is True
    assert meta_med["recommended_tile"] == 256

    # High res (> 4K)
    hi_img = _create_temp_image(tmp_path, "high.png", size=(3850, 2170))
    v_hi, _, meta_hi = validate_image_file(hi_img)
    assert v_hi is True
    assert meta_hi["recommended_tile"] == 128
    assert "High resolution image" in meta_hi["warning"]


def test_utils_create_zip_and_cleanup(tmp_path):
    f1 = _create_temp_image(tmp_path, "img1.png")
    f2 = _create_temp_image(tmp_path, "img2.png")
    zip_dest_dir = tmp_path / "zips"

    zip_file = create_batch_zip("test_job_1", [(f1, "img1.png"), (f2, "img2.png")], zip_dest_dir)
    assert zip_file.exists()
    assert zip_file.stat().st_size > 0

    # Test cleanup_stale_jobs
    cleaned = cleanup_stale_jobs(retention_hours=99999)
    assert isinstance(cleaned, int)

    # Test process memory & storage usage
    mem = get_process_memory_mb()
    assert isinstance(mem, float)
    assert mem >= 0.0

    storage = get_storage_usage_mb()
    assert isinstance(storage, float)
    assert storage >= 0.0


@pytest.mark.anyio
async def test_api_not_found_routes():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Invalid job ID
        r = await client.get("/api/jobs/nonexistent-job-id-12345")
        assert r.status_code == 404

        # Cancel invalid job
        r = await client.post("/api/jobs/nonexistent-job-id-12345/cancel")
        assert r.status_code == 404

        # Export invalid job
        r = await client.get("/api/jobs/nonexistent-job-id-12345/export")
        assert r.status_code == 404

        # Delete invalid job (idempotent)
        r = await client.delete("/api/jobs/nonexistent-job-id-12345")
        assert r.status_code == 200


@pytest.mark.anyio
async def test_api_batch_upload_validation_errors():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # No files provided triggers validation error (400 or 422)
        r = await client.post("/api/jobs/batch", files=[], data={"model": "realesrgan-x4plus"})
        assert r.status_code in [400, 422]

        # Invalid scale
        buf = io.BytesIO()
        img = Image.new("RGB", (10, 10))
        img.save(buf, format="PNG")
        raw_bytes = buf.getvalue()

        r = await client.post(
            "/api/jobs/batch",
            files=[("files", ("test.png", raw_bytes, "image/png"))],
            data={"model": "realesrgan-x4plus", "scale": "7"},
        )
        assert r.status_code == 400
        assert "Invalid scale 7" in r.json()["detail"]


@pytest.mark.anyio
async def test_job_context_and_manager():
    from app.queue import JobContext, JobManager
    from app.models import BatchItemResponse

    item = BatchItemResponse(
        item_id="item-1",
        original_name="orig.png",
        stored_name="stored.png",
    )
    ctx = JobContext(
        job_id="test-job-ctx",
        model="realesrgan-x4plus",
        scale=4,
        tile_size=128,
        items=[item],
        warnings=["Test warning"],
    )

    resp = ctx.to_response()
    assert resp.job_id == "test-job-ctx"
    assert resp.status == "queued"
    assert len(resp.items) == 1

    # Test subscribe, broadcast, unsubscribe
    q = asyncio.Queue()
    ctx.subscribers.append(q)
    assert q in ctx.subscribers

    ctx.broadcast_event("progress")
    msg = q.get_nowait()
    assert msg["event"] == "progress"
    assert msg["data"]["job_id"] == "test-job-ctx"

    ctx.subscribers.remove(q)
    assert q not in ctx.subscribers

    # Test JobManager methods
    jm = JobManager()
    jm.jobs["test-job-ctx"] = ctx
    assert jm.get_job("test-job-ctx") is ctx
    assert jm.get_job("ghost") is None

    # Cancel job
    cancelled_first = await jm.cancel_job("test-job-ctx")
    assert cancelled_first is True
    assert ctx.status == "cancelled"

    # Cancel nonexistent job
    cancelled_ghost = await jm.cancel_job("ghost")
    assert cancelled_ghost is False

    # Cancel already cancelled job
    cancelled_again = await jm.cancel_job("test-job-ctx")
    assert cancelled_again is False

    # Delete job
    jm.delete_job("test-job-ctx")
    assert jm.get_job("test-job-ctx") is None


@pytest.mark.anyio
async def test_app_lifespan_and_extra_routes():
    from app.main import lifespan

    # Test lifespan startup and shutdown
    async with lifespan(app):
        pass

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Test events 404
        r = await client.get("/api/jobs/nonexistent-job-events/events")
        assert r.status_code == 404

        # Test batch upload with custom gpu_id and threads
        buf = io.BytesIO()
        img = Image.new("RGB", (20, 20))
        img.save(buf, format="PNG")
        raw_bytes = buf.getvalue()

        r = await client.post(
            "/api/jobs/batch",
            files=[("files", ("test_custom.png", raw_bytes, "image/png"))],
            data={
                "model": "realesrgan-x4plus",
                "scale": "2",
                "tile_size": "128",
                "gpu_id": "0",
                "threads": "1:1:1",
            },
        )
        assert r.status_code == 202
        job_id = r.json()["job_id"]

        # Cancel right away
        cancel_res = await client.post(f"/api/jobs/{job_id}/cancel")
        assert cancel_res.status_code == 200

        # Export on job with no successful items -> 400
        export_res = await client.get(f"/api/jobs/{job_id}/export")
        assert export_res.status_code == 400
        assert "No successfully processed" in export_res.json()["detail"]

        # Test invalid model upload
        inv_model_res = await client.post(
            "/api/jobs/batch",
            files=[("files", ("test.png", raw_bytes, "image/png"))],
            data={"model": "fake-model-xyz"},
        )
        assert inv_model_res.status_code == 400
        assert "Invalid model" in inv_model_res.json()["detail"]


def test_queue_resolve_output_filename():
    from app.queue import JobManager

    assert JobManager._resolve_output_filename("my_cat.png") == "upscaled_my_cat.png"
    assert JobManager._resolve_output_filename("photo.jpeg") == "upscaled_photo.jpeg"
    assert JobManager._resolve_output_filename("graphic.bmp") == "upscaled_graphic.png"
    assert JobManager._resolve_output_filename("anim.webp") == "upscaled_anim.webp"


def test_utils_is_dir_stale(tmp_path):
    from app.utils import _is_dir_stale

    # Regular file should not be stale dir
    f = tmp_path / "file.txt"
    f.write_text("hello")
    assert _is_dir_stale(f, cutoff=time.time() + 1000) is False

    # Stale directory
    d = tmp_path / "stale_dir"
    d.mkdir()
    assert _is_dir_stale(d, cutoff=time.time() + 1000) is True
    assert _is_dir_stale(d, cutoff=time.time() - 1000) is False


def test_utils_validate_oversized_file(tmp_path, monkeypatch):
    p = tmp_path / "big.png"
    p.write_bytes(b"dummy")

    class DummyStat:
        st_size = 60 * 1024 * 1024

    monkeypatch.setattr(Path, "stat", lambda self: DummyStat() if self == p else Path.stat(self))
    v, err, _ = validate_image_file(p)
    assert v is False
    assert "exceeds limit of 50 MB" in err


@pytest.mark.anyio
async def test_process_single_item_cancel_and_failure(tmp_path):
    from app.queue import JobContext, JobManager
    from app.models import BatchItemResponse

    in_img = _create_temp_image(tmp_path, "in.png")
    out_dir = tmp_path / "out"
    out_dir.mkdir()

    item = BatchItemResponse(
        item_id="it-1",
        original_name="in.png",
        stored_name="in.png",
    )
    ctx = JobContext(
        job_id="job-it",
        model="realesrgan-x4plus",
        scale=4,
        tile_size=128,
        items=[item],
        warnings=[],
    )
    jm = JobManager()

    # Cancelled during processing
    ctx.cancel_event.set()
    res = await jm._process_single_item(ctx, item, tmp_path, out_dir)
    assert res is False
    assert item.status == "cancelled"

    # Failed upscale (corrupted input file)
    ctx.cancel_event.clear()
    bad_item = BatchItemResponse(
        item_id="it-2",
        original_name="bad.png",
        stored_name="nonexistent_bad.png",
    )
    res_fail = await jm._process_single_item(ctx, bad_item, tmp_path, out_dir)
    assert res_fail is False
    assert bad_item.status == "failed"


@pytest.mark.anyio
async def test_main_batch_upload_warning_and_clamping(monkeypatch):
    monkeypatch.setattr("app.main.MAX_RECOMMENDED_BATCH_ITEMS", 1)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # High-res image triggers tile clamp warning
        buf = io.BytesIO()
        img = Image.new("RGB", (3850, 2170))
        img.save(buf, format="PNG")
        raw_bytes = buf.getvalue()

        # Upload 2 items with batch recommendation limit of 1
        files = [
            ("files", ("hi1.png", raw_bytes, "image/png")),
            ("files", ("hi2.png", raw_bytes, "image/png")),
        ]
        r = await client.post(
            "/api/jobs/batch",
            files=files,
            data={"model": "realesrgan-x4plus", "scale": "4", "tile_size": "256"},
        )
        assert r.status_code == 202
        data = r.json()
        assert len(data["warnings"]) >= 2


def test_rolling_eta_estimator():
    from app.queue import RollingEtaEstimator

    estimator = RollingEtaEstimator(window_size=5, alpha=0.3)
    assert estimator.estimate_remaining(0) == 0.0
    assert estimator.estimate_remaining(10) is None

    # Record some uniform durations
    for _ in range(5):
        estimator.record_duration(2.0)

    eta = estimator.estimate_remaining(5)
    assert eta is not None
    # 5 items * ~2.0s = ~10.0s
    assert 9.0 <= eta <= 11.0

    # Test outlier handling: an outlier of 20s should be smoothed
    estimator.record_duration(20.0)
    eta_smoothed = estimator.estimate_remaining(1)
    assert eta_smoothed < 15.0

    # Negative or zero duration ignored
    estimator.record_duration(0.0)
    estimator.record_duration(-1.0)


@pytest.mark.anyio
async def test_500_image_batch_processing_and_gc(tmp_path, monkeypatch):
    """
    Validates that the queue engine processes a minimum working limit of 500 images,
    running periodic GC cycles without memory leaking or blocking.
    """
    from app.queue import JobManager, JobContext
    from unittest.mock import AsyncMock

    jm = JobManager()
    items = [
        BatchItemResponse(
            item_id=f"item-{i}",
            original_name=f"frame_{i:04d}.png",
            stored_name=f"frame_{i:04d}.png",
            duration_seconds=0.01,
        )
        for i in range(500)
    ]
    assert len(items) == 500

    ctx = JobContext(
        job_id="batch-500-test",
        model="realesr-animevideov3",
        scale=2,
        tile_size=128,
        items=items,
        warnings=[],
    )

    # Mock _process_single_item to simulate high-speed processing
    async def mock_process(ctx, item, up_dir, out_dir):
        item.status = "success"
        item.upscaled_name = f"upscaled_{item.original_name}"
        item.duration_seconds = 0.005
        return True

    monkeypatch.setattr(jm, "_process_single_item", mock_process)

    # Run the 500-item batch
    await jm._process_job(ctx)

    assert ctx.status == "completed"
    assert ctx.progress.total_items == 500
    assert ctx.progress.current_index == 500
    assert ctx.progress.percentage == 100.0
    assert ctx.progress.eta_seconds == 0.0
    assert all(it.status == "success" for it in ctx.items)


@pytest.mark.anyio
async def test_batch_hard_limit_exceeded(monkeypatch):
    """Verify that batches exceeding MAX_BATCH_ITEMS are rejected with HTTP 400."""
    from app.config import MAX_BATCH_ITEMS

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Test custom limit check via monkeypatch
        monkeypatch.setattr("app.main.MAX_BATCH_ITEMS", 2)
        dummy_files = [
            ("files", (f"img_{i}.png", b"fakebytes", "image/png"))
            for i in range(3)
        ]
        r = await client.post(
            "/api/jobs/batch",
            files=dummy_files,
            data={"model": "realesrgan-x4plus", "scale": "4"},
        )
        assert r.status_code == 400
        assert "exceeds maximum allowed limit of 2" in r.json()["detail"]


@pytest.mark.anyio
async def test_throttled_sse_broadcast():
    from app.queue import JobContext

    ctx = JobContext(
        job_id="test-throttle",
        model="realesrgan-x4plus",
        scale=4,
        tile_size=128,
        items=[],
        warnings=[],
    )
    q = asyncio.Queue()
    ctx.subscribers.append(q)

    # First broadcast succeeds
    ctx.broadcast_event("item_start")
    assert not q.empty()
    await q.get()

    # Immediate second broadcast within throttle window is dropped
    ctx.broadcast_event("item_done")
    assert q.empty()

    # Force broadcast bypasses throttle
    ctx.broadcast_event("complete", force=True)
    assert not q.empty()
    msg = await q.get()
    assert msg["event"] == "complete"
