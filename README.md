# ScaleUp — Local Batch AI Image Upscaler

[![Vulkan 1.4](https://img.shields.io/badge/Vulkan-1.4.354-red.svg)](https://www.vulkan.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.0.0-009688.svg)](https://fastapi.tiangolo.com/)
[![React Vite](https://img.shields.io/badge/React-18-61dafb.svg)](https://vitejs.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![Hardware](https://img.shields.io/badge/Target-Ryzen%207%207730U%20%7C%20Vega%208-orange.svg)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg)]()

**ScaleUp** is a self-hosted, privacy-first local image enhancement and batch super-resolution application. Built with a dark-blue glassmorphic UI for Linux desktop environments (Arch Linux + Hyprland), it harnesses **NCNN-Vulkan** C++ compute to execute hardware-accelerated deep learning models directly on integrated and discrete AMD GPUs via Mesa's RADV driver.

By bypassing heavy PyTorch runtimes, ScaleUp operates with an ultra-low memory footprint ($\le 120\text{ MB}$ API process RSS, dynamic tile clamping keeping GPU memory $\le 600\text{ MB}$ UMA), avoiding VRAM exhaustion and ensuring total desktop stability under Hyprland without killing user sessions.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Hardware & Runtime Operational Profile](#-hardware--runtime-operational-profile)
- [Quick Start & Daily Usage](#-quick-start--daily-usage)
  - [1. One-Click Bootstrap & Seed](#1-one-click-bootstrap--seed)
  - [2. Background Daemon CLI (`ScaleUp`)](#2-background-daemon-cli-scaleup)
  - [3. Run in Foreground](#3-run-in-foreground)
  - [4. Docker & Docker Compose](#4-docker--docker-compose)
- [Manual Step-by-Step Installation](#-manual-step-by-step-installation)
- [AI Model Registry & Tiling Optimization](#-ai-model-registry--tiling-optimization)
  - [Model Specifications](#model-specifications)
  - [AMD Vega 8 Shader Buffer & Tiling Safeguards](#amd-vega-8-shader-buffer--tiling-safeguards)
  - [Automatic Black-Image Detection & Recovery](#automatic-black-image-detection--recovery)
- [Interactive Split Comparison & Gallery](#-interactive-split-comparison--gallery)
- [API Reference](#-api-reference)
- [Automated Test Suite](#-automated-test-suite)
- [Systemd Service Setup](#-optional-systemd-service-setup)
- [Troubleshooting & FAQ](#-troubleshooting--faq)

---

## ⚡ Key Features

- **🚀 Hardware Acceleration (NCNN Vulkan):** Zero PyTorch dependency in runtime; ultra-low memory footprint ($\sim 60\text{ MB}$ base RSS) running on AMD Radeon Vega 8 (RADV Renoir) with FP16 half-precision tensor compute.
- **🌌 Modern Dark Blue UI:** Tailored sapphire-and-navy glassmorphism with responsive sliders, real-time metrics, interactive canvas, and smooth animations.
- **🖼️ Multi-Format Support:** Ingestion and batch upscaling for `.png`, `.jpg`, `.jpeg`, `.webp`, and `.bmp`.
- **🛡️ Pre-Flight Validation & Error Resilience:**
  - Automatic rejection of 0-byte or corrupted image files without breaking the batch pipeline.
  - Dimension inspection (>4K warning & tile auto-clamping).
  - Dynamic GPU OOM / Black shader output recovery with automatic tile-reduction retry ($128\text{px} \to 64\text{px} \to 32\text{px}$).
- **🤖 4 Pre-Trained Deep Learning Models:** Support for photorealistic (`realesrgan-x4plus`), denoising (`realesrnet-x4plus`), anime/vector art (`realesrgan-x4plus-anime`), and ultra-fast throughput (`realesr-animevideov3`).
- **🔄 Real-Time Telemetry & Progress:** Non-blocking async queue delivering real-time item status, elapsed time, moving-average ETA, and Server-Sent Events (SSE) + JSON polling.
- **🔍 Interactive Before/After Split Viewer:** Side-by-side comparison slider with 1x–4x zoom, click-and-drag panning, side-by-side mode, and instant full-resolution download.
- **📦 Batch Export (.ZIP) & Auto-Cleanup:** Consolidated server-side ZIP packaging and automatic background pruning of scratch files older than 24 hours.

---

## 📐 System Architecture

```
+-------------------------------------------------------------------------+
|                        BROWSER CLIENT (React / Vite)                    |
|  [ File Dropzone ]  [ Model Switcher ]  [ Before/After Split Slider ]   |
+-------------------------------------------------------------------------+
                                    │
                     REST / Multipart / SSE (Port 7756)
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
|  - Arguments: `-i <in> -o <out> -n <model> -s <scale> -t 128 -g 0`      |
+-------------------------------------------------------------------------+
                                    │
             Hardware Acceleration via Mesa RADV Driver
                                    ▼
+-------------------------------------------------------------------------+
|             AMD RADEON VEGA 8 iGPU (Vulkan 1.4 / Unified Memory)        |
+-------------------------------------------------------------------------+
```

---

## 💻 Hardware & Runtime Operational Profile

| Resource | Specification | Allocation / Budget | Role in Pipeline |
| :--- | :--- | :--- | :--- |
| **CPU** | AMD Ryzen 7 7730U (8 Cores / 16 Threads) | 2–4 Worker Threads (`-j 1:2:2`) | Image decode/encode (Pillow/OpenCV) & FastAPI event loop. |
| **GPU / Driver** | AMD Radeon Graphics (RADV RENOIR, Vulkan 1.4.354) | Device ID `0` (`-g 0`) | Vulkan compute pipeline for tensor inference. |
| **System RAM** | 16 GB DDR4/LPDDR4x (Shared UMA) | Max 1.5 GB allocated buffer (Budget: $\le 2048\text{ MB}$) | Shared system and video memory pool. |
| **Storage / IO** | NVMe SSD on `ext4` / `btrfs` | Max 5 GB temporary scratch | Temporary staging for batch queues, outputs, and `.zip` bundles. |

---

## 🚀 Quick Start & Daily Usage

### 1. One-Click Bootstrap & Seed

Clone the repository and run the automated seed script:

```bash
git clone https://github.com/atreyakamat/ScaleUp.git
cd ScaleUp
./scripts/seed.sh
```

The script will automatically:
1. Create project directories (`uploads`, `outputs`, `models`).
2. Download the pre-compiled `realesrgan-ncnn-vulkan` binary and extract all 4 AI models.
3. Configure the Python virtualenv and install backend dependencies.
4. Build the React frontend production distribution.
5. Install the global `ScaleUp` CLI command into `~/.local/bin/ScaleUp`.

---

### 2. Background Daemon CLI (`ScaleUp`)

Start ScaleUp in the background for daily use:

```bash
ScaleUp --bg
```

#### Management Commands:

```bash
ScaleUp --bg          # Start service in the background on port 7756
ScaleUp status        # Check status, memory footprint & GPU telemetry
ScaleUp open          # Open ScaleUp directly in your default web browser
ScaleUp stop          # Stop background service
ScaleUp restart       # Restart background service
ScaleUp logs          # Stream live server logs (tail -f)
```

Open **`http://localhost:7756`** in your browser.

---

### 3. Run in Foreground

```bash
ScaleUp
# or
./run.sh
```

---

### 4. Docker & Docker Compose

#### Option A: Docker Compose (GPU Accelerated)

```bash
docker compose up -d
```

#### Option B: Docker CLI

```bash
# Build Docker image
docker build --network=host -t scaleup:latest .

# Run container with AMD/Intel GPU passthrough
docker run -d \
  --name scaleup \
  --restart unless-stopped \
  -p 7756:7756 \
  --device /dev/dri:/dev/dri \
  scaleup:latest
```

Access the UI at **`http://localhost:7756`**.

---

## 🛠️ Manual Step-by-Step Installation

If you prefer to set up each component manually:

### 1. Prerequisites (Arch Linux)

```bash
# Install Vulkan runtime and drivers
sudo pacman -S vulkan-radeon vulkan-tools libvulkan python nodejs npm

# Verify AMD Radeon Vega 8 Vulkan device
vulkaninfo --summary
```

### 2. Backend Setup & Model Download

```bash
mkdir -p backend/bin/models backend/storage/uploads backend/storage/outputs

# Download NCNN Vulkan binary
cd backend/bin
curl -L -o realesrgan.zip https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-ubuntu.zip
unzip -q realesrgan.zip
rm realesrgan.zip
chmod +x realesrgan-ncnn-vulkan

# Extract Real-ESRNet weights
curl -sL https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.2/realesrgan-ncnn-vulkan-20210801-ubuntu.zip -o /tmp/v012.zip
unzip -q -j /tmp/v012.zip "models/realesrnet-x4plus.*" -d models/
rm -f /tmp/v012.zip

cd ../..

# Setup Python Virtual Environment
python3 -m venv backend/venv
backend/venv/bin/pip install -r backend/requirements.txt
```

### 3. Frontend Build

```bash
cd frontend
npm install
npm run build
cd ..
```

### 4. Start Server

```bash
PORT=7756 PYTHONPATH=backend backend/venv/bin/uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 7756
```

---

## 🤖 AI Model Registry & Tiling Optimization

### Model Specifications

| Model ID | Name | Architecture | Scales | Default | Ideal Use Case |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **`realesrgan-x4plus`** | Real-ESRGAN x4+ | RRDBNet (999 layers) | 2x, 4x | 4x | Photorealistic photography, textures, landscapes. |
| **`realesrnet-x4plus`** | Real-ESRNet x4+ | RRDBNet (Denoise) | 2x, 4x | 4x | Smooth gradient restoration, denoise without over-sharpening. |
| **`realesrgan-x4plus-anime`** | Real-ESRGAN Anime | Compact CNN (268 layers) | 4x | 4x | Flat 2D art, manga, vector illustrations, UI assets. |
| **`realesr-animevideov3`** | Real-ESR AnimeVideo v3 | Compact V3 | 2x, 3x, 4x | 4x | Ultra-low latency model for high-throughput batches. |

---

### AMD Vega 8 Shader Buffer & Tiling Safeguards

On integrated graphics (AMD Radeon Vega 8 / RADV Renoir), large deep learning models (`realesrgan-x4plus` and `realesrnet-x4plus`) allocate large intermediate activation tensors. If the tile size is $\ge 200\text{px}$, the Vulkan shader buffer can exceed hardware workgroup descriptor limits, causing the shader to silently zero out the buffer and return a black image (`(0,0,0)` pixels).

ScaleUp includes **built-in hardware clamping**:
- `realesrgan-x4plus`: Clamped to $\le 128\text{px}$ (Optimal Vega 8 stability).
- `realesrnet-x4plus`: Clamped to $\le 64\text{px}$ (Ultra-safe shader footprint).
- `realesrgan-x4plus-anime` & `realesr-animevideov3`: Supports up to $256\text{px}$ / untiled.

---

### Automatic Black-Image Detection & Recovery

If an unexpected shader buffer overflow produces an all-zero image, ScaleUp's inference engine automatically detects the condition via pixel dynamic range inspection, halves the tile size ($128\text{px} \to 64\text{px} \to 32\text{px}$), and retries inference transparently until a vibrant, full-contrast image is generated.

---

## 🔍 Interactive Split Comparison & Gallery

ScaleUp includes an interactive inspection suite:

1. **Before/After Split Slider:** Draggable divider line comparing original vs upscaled resolution.
2. **Pan & Zoom Navigation:** Zoom in from **1x to 4x** (or Fit) with mouse drag to pan across high-res details.
3. **Multiple View Modes:**
   - `Split Slider` (Draggable vertical line)
   - `Side-by-Side` (Full dual-column comparison)
   - `Hold Spacebar` (Quick toggle to preview original)
4. **Single-Click & Batch Downloads:** Download individual upscaled assets or click **Download Batch (.ZIP)** for a structured archive.

---

## 📡 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **`GET`** | `/api/health` | System health, Vulkan GPU device, RAM & disk scratch telemetry |
| **`GET`** | `/api/models` | Supported AI model registry and allowable scales |
| **`POST`**| `/api/jobs/batch` | Ingest batch images (`multipart/form-data`) and enqueue processing job |
| **`GET`** | `/api/jobs/{id}` | Poll real-time progress, moving-average ETA, and item statuses |
| **`GET`** | `/api/jobs/{id}/events` | Server-Sent Events (SSE) stream for live telemetry broadcasting |
| **`POST`**| `/api/jobs/{id}/cancel` | Abort active batch job immediately & terminate child processes |
| **`GET`** | `/api/jobs/{id}/export` | Download consolidated batch `.zip` archive |
| **`DELETE`**| `/api/jobs/{id}` | Purge job session and delete scratch files from disk |
| **`POST`**| `/api/system/cleanup` | Manually trigger purge of files older than specified retention hours (default: 24h) |

---

## 🧪 Automated Test Suite

ScaleUp includes an automated test suite verifying health endpoints, model registries, multi-file batch execution, 0-byte corrupt image rejection, signal cancellation, and ZIP exports:

```bash
PYTHONPATH=backend backend/venv/bin/pytest backend/tests/ -v
```

---

## ⚙️ (Optional) Systemd Service Setup

To run ScaleUp automatically on system startup:

```bash
mkdir -p ~/.config/systemd/user/

cat << 'EOF_SERVICE' > ~/.config/systemd/user/scaleup.service
[Unit]
Description=ScaleUp AI Upscaler Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/atreya/Projects/ScaleUp
ExecStart=/home/atreya/Projects/ScaleUp/bin/ScaleUp
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
EOF_SERVICE

systemctl --user daemon-reload
systemctl --user enable --now scaleup.service
```

---

## ❓ Troubleshooting & FAQ

#### 1. Why does the app use NCNN Vulkan instead of PyTorch?
PyTorch packages CUDA/ROCm runtimes that require several gigabytes of VRAM and system memory. NCNN-Vulkan uses lightweight C++ compute via Mesa's RADV driver, achieving superior performance on AMD integrated graphics (Vega 8) with $< 120\text{ MB}$ RAM footprint.

#### 2. How is Hyprland desktop stability ensured?
Integrated GPUs share unified memory (UMA) with system RAM. By enforcing dynamic tile clamping ($\le 128\text{px}$) and strict process isolation, ScaleUp prevents GPU out-of-memory lockups and avoids killing the Hyprland Wayland compositor.

#### 3. Where are logs stored?
Logs are written to `~/.local/state/ScaleUp/scaleup.log`. You can stream logs in real-time with:
```bash
ScaleUp logs
```

#### 4. How are old temporary files cleaned up?
An automated background task runs hourly to purge upload/output directories older than 24 hours. You can also trigger an immediate purge with `POST /api/system/cleanup` or via the **Clean** button in the web UI.

---

## 📄 License

MIT License — free for personal, commercial, and open-source use.
