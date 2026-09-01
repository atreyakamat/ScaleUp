# LuminaScale — Local Batch AI Image Upscaler

[![Vulkan 1.4](https://img.shields.io/badge/Vulkan-1.4.354-red.svg)](https://www.vulkan.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.0.0-009688.svg)](https://fastapi.tiangolo.com/)
[![React Vite](https://img.shields.io/badge/React-18-61dafb.svg)](https://vitejs.dev/)
[![Hardware](https://img.shields.io/badge/Target-Ryzen%207%207730U%20%7C%20Vega%208-orange.svg)]()

**LuminaScale** is a high-performance, self-hosted, privacy-first local image enhancement and batch super-resolution application. Built specifically for Linux desktop environments (Arch Linux + Hyprland), it harnesses **NCNN-Vulkan** C++ compute to execute hardware-accelerated deep learning models directly on integrated and discrete AMD GPUs via Mesa's RADV driver.

---

## Key Features

- **⚡ Hardware Acceleration (NCNN Vulkan):** Zero PyTorch dependency in runtime; ultra-low memory footprint (<120MB API process RSS, dynamic tile clamping keeping GPU memory <600MB UMA) ensuring total desktop stability under Hyprland.
- **🖼️ Comprehensive Format Support:** Direct pre-flight validation and super-resolution for `.png`, `.jpg`, `.jpeg`, `.webp`, and `.bmp`.
- **🤖 4 Pre-Trained Deep Learning Models:**
  1. `realesrgan-x4plus` — General photorealistic super-resolution.
  2. `realesrnet-x4plus` — Denoise & smooth gradient enhancement.
  3. `realesrgan-x4plus-anime` — Anime, manga, UI vectors, and flat illustration upscaling.
  4. `realesr-animevideov3` — Ultra-low latency model for high-throughput batch workloads (2x, 3x, 4x).
- **🛡️ Memory Safeguards & Dynamic OOM Recovery:** Pre-flight dimension inspection warns and auto-clamps tile size for >4K images. Automatic tile-halving fallback ($256\text{px} \to 128\text{px} \to 64\text{px}$) retries images automatically if GPU memory limit is approached.
- **🔄 Real-Time Telemetry & Progress:** Non-blocking async worker queue with live progress percentage, elapsed time, moving-average ETA, and Server-Sent Events (SSE) + JSON polling.
- **🔍 Interactive Before/After Split Viewer:** Side-by-side comparison slider with 1x–4x zoom, click-and-drag panning, side-by-side mode, and instant full-resolution download.
- **📦 Batch Export (.ZIP) & Auto-Cleanup:** Consolidated server-side ZIP packaging and automatic background pruning of scratch files older than 24 hours.

---

## System Architecture

```
+-------------------------------------------------------------------------+
|                        BROWSER CLIENT (React / Vite)                    |
|  [ File Dropzone ]  [ Model Switcher ]  [ Before/After Split Slider ]   |
+-------------------------------------------------------------------------+
                                    │
                     REST / Multipart / SSE (Port 8000)
                                    ▼
+-------------------------------------------------------------------------+
|                     BACKEND SERVICE (FastAPI / Python)                  |
|  - Request Router & Payload Sanitizer (Pillow Fast Headers)             |
|  - Async Background Task Queue Manager & Telemetry Broadcaster          |
|  - Job Registry & Disk Session Handler                                  |
+-------------------------------------------------------------------------+
                                    │
                  Subprocess Dispatch (`asyncio.create_subprocess_exec`)
                                    ▼
+-------------------------------------------------------------------------+
|                NCNN VULKAN INFERENCE ENGINE (C++ Binary)                |
|  - Arguments: `-i <in> -o <out> -n <model> -s <scale> -t 256 -g 0`      |
+-------------------------------------------------------------------------+
                                    │
             Hardware Acceleration via Mesa RADV Driver
                                    ▼
+-------------------------------------------------------------------------+
|             AMD RADEON VEGA 8 iGPU (Vulkan 1.4 / Unified Memory)        |
+-------------------------------------------------------------------------+
```

---

## Quick Start & Background Service

### 1. Launch in Background (Recommended for Daily Use)

```bash
ScaleUp --bg
```

Or open directly in your web browser:
```bash
ScaleUp open
```

Navigate to **`http://localhost:7756`** in your browser.

### 2. Service Management CLI

```bash
ScaleUp --bg          # Start service in the background on port 7756
ScaleUp status        # Check status, memory footprint & GPU telemetry
ScaleUp stop          # Stop background service
ScaleUp restart       # Restart service
ScaleUp logs          # Stream live server logs
ScaleUp open          # Open LuminaScale in default web browser
```

### 3. Run in Foreground

```bash
ScaleUp
# or
./run.sh
```

---

## Running the Automated Test Suite

```bash
PYTHONPATH=backend backend/venv/bin/pytest backend/tests/ -v
```

---

## API Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | System health, Vulkan device info, RAM & disk telemetry |
| `GET` | `/api/models` | Available AI models and supported scales |
| `POST` | `/api/jobs/batch` | Ingest batch images & enqueue processing job |
| `GET` | `/api/jobs/{id}` | Real-time progress, ETA, and per-item statuses |
| `GET` | `/api/jobs/{id}/events` | Server-Sent Events (SSE) real-time streaming feed |
| `POST` | `/api/jobs/{id}/cancel` | Abort active batch job & terminate child processes |
| `GET` | `/api/jobs/{id}/export` | Download consolidated batch `.zip` archive |
| `DELETE` | `/api/jobs/{id}` | Purge job session from disk and memory |
| `POST` | `/api/system/cleanup` | Manually trigger purge of files older than 24h |
