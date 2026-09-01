import io
import json
import pytest
import httpx
import anyio
from PIL import Image
from app.main import app

def create_test_image(width=100, height=100, fmt="PNG", color=(255, 0, 0)):
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=color)
    img.save(buf, format=fmt)
    buf.seek(0)
    return buf.getvalue()

@pytest.mark.anyio
async def test_health_endpoint():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "vulkan_device" in data
        assert data["binary_available"] is True
        assert len(data["available_models"]) >= 4

@pytest.mark.anyio
async def test_models_endpoint():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/models")
        assert response.status_code == 200
        models = response.json()
        assert len(models) >= 4
        model_ids = [m["id"] for m in models]
        assert "realesrgan-x4plus" in model_ids
        assert "realesrnet-x4plus" in model_ids
        assert "realesrgan-x4plus-anime" in model_ids
        assert "realesr-animevideov3" in model_ids

@pytest.mark.anyio
async def test_batch_upload_and_processing():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        img_png = create_test_image(64, 64, fmt="PNG")
        img_jpg = create_test_image(80, 80, fmt="JPEG")

        files = [
            ("files", ("test1.png", img_png, "image/png")),
            ("files", ("test2.jpg", img_jpg, "image/jpeg")),
        ]
        data = {
            "model": "realesr-animevideov3",
            "scale": "2",
            "tile_size": "128",
        }

        resp = await client.post("/api/jobs/batch", files=files, data=data)
        assert resp.status_code == 202
        job_info = resp.json()
        job_id = job_info["job_id"]
        assert job_info["total_items"] == 2

        for _ in range(40):
            status_resp = await client.get(f"/api/jobs/{job_id}")
            assert status_resp.status_code == 200
            state = status_resp.json()
            if state["status"] in ["completed", "failed", "partial_failure"]:
                break
            await anyio.sleep(0.5)

        final_resp = await client.get(f"/api/jobs/{job_id}")
        final_data = final_resp.json()
        assert final_data["status"] == "completed"
        assert len(final_data["items"]) == 2
        assert final_data["items"][0]["status"] == "success"
        assert final_data["items"][0]["output_width"] == 128
        assert final_data["items"][0]["output_height"] == 128

        # Test ZIP export
        zip_resp = await client.get(f"/api/jobs/{job_id}/export")
        assert zip_resp.status_code == 200
        assert zip_resp.headers["content-type"] == "application/zip"
        assert len(zip_resp.content) > 0

@pytest.mark.anyio
async def test_corrupt_and_zero_byte_rejection():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        valid_png = create_test_image(50, 50, fmt="PNG")
        zero_bytes = b""
        corrupt_bytes = b"NOT_AN_IMAGE_HEADER_12345"

        files = [
            ("files", ("valid.png", valid_png, "image/png")),
            ("files", ("empty.png", zero_bytes, "image/png")),
            ("files", ("corrupt.jpg", corrupt_bytes, "image/jpeg")),
        ]
        data = {
            "model": "realesr-animevideov3",
            "scale": "2",
            "tile_size": "128",
        }

        resp = await client.post("/api/jobs/batch", files=files, data=data)
        assert resp.status_code == 202
        job_id = resp.json()["job_id"]

        for _ in range(40):
            state = (await client.get(f"/api/jobs/{job_id}")).json()
            if state["status"] in ["completed", "partial_failure", "failed"]:
                break
            await anyio.sleep(0.5)

        final = (await client.get(f"/api/jobs/{job_id}")).json()
        assert final["status"] in ["partial_failure", "completed"]
        assert final["items"][0]["status"] == "success"
        assert final["items"][1]["status"] == "skipped_invalid"
        assert final["items"][2]["status"] == "skipped_invalid"

@pytest.mark.anyio
async def test_cancellation():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        img_png = create_test_image(200, 200, fmt="PNG")
        files = [
            ("files", (f"img_{i}.png", img_png, "image/png")) for i in range(10)
        ]
        data = {
            "model": "realesrgan-x4plus",
            "scale": "4",
            "tile_size": "256",
        }
        resp = await client.post("/api/jobs/batch", files=files, data=data)
        assert resp.status_code == 202
        job_id = resp.json()["job_id"]

        # Cancel immediately
        cancel_resp = await client.post(f"/api/jobs/{job_id}/cancel")
        assert cancel_resp.status_code == 200
        assert cancel_resp.json()["cancelled"] is True

        state = (await client.get(f"/api/jobs/{job_id}")).json()
        assert state["status"] == "cancelled"

@pytest.mark.anyio
async def test_cleanup_and_delete():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        cleanup_resp = await client.post("/api/system/cleanup?retention_hours=0")
        assert cleanup_resp.status_code == 200
