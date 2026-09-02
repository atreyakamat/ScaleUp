# Product Requirements Document (PRD)

**Project Name:** ScaleUp (Local Batch AI Image Upscaler)

**Version:** 1.0.0-PROD

**Target Environment:** AMD Ryzen 7 7730U (Zen 3, 8C/16T) | AMD Radeon Vega 8 (RADV Renoir) | 16 GB Unified Memory | Omarchy (Arch Linux + Hyprland)

**Primary Stack:** React (Vite) + Python (FastAPI) + NCNN Vulkan C++ Compute Backend

---

## 1. Executive Summary & Vision

LuminaScale is a self-hosted, privacy-first image enhancement and batch upscaling application designed to replicate and exceed the core capabilities of cloud services (e.g., ImgUpscaler, Magnific, Upscayl) entirely on local hardware.

By utilizing **NCNN-Vulkan** rather than heavy PyTorch runtimes, the system runs hardware-accelerated deep learning compute directly on the AMD Radeon Vega 8 iGPU through Mesa's RADV driver. This achieves low memory usage (<500 MB total operational footprint), avoids VRAM exhaustion, and eliminates recurring subscription costs and cloud privacy risks.

---

## 2. Hardware & Runtime Operational Profile

| Resource | Specification | Allocation / Budget | Role in Pipeline |
| --- | --- | --- | --- |
| **CPU** | AMD Ryzen 7 7730U (8 Cores / 16 Threads) | 2–4 Worker Threads (`-j 1:2:2`) | Image decode/encode (libpng/OpenCV) & FastAPI event loop. |
| **GPU / Driver** | AMD Radeon Graphics (RADV RENOIR, Vulkan 1.4.354) | Device ID `0` (`-g 0`) | Vulkan compute pipeline for tensor inference. |
| **System RAM** | 16 GB DDR4/LPDDR4x (Shared UMA) | Max 1.5 GB allocated buffer | Shared system and video memory pool. |
| **Storage / IO** | NVMe SSD on `ext4` / `btrfs` | Max 5 GB temporary scratch | Temporary staging for batch queues, outputs, and `.zip` bundles. |

---

## 3. Functional Requirements (FRDs)

### FR-1: Batch Ingestion & Pre-Flight Validation

* **FR-1.1 Multi-File Upload:** The system must accept multiple image uploads simultaneously via drag-and-drop or file dialog (minimum batch: 1; maximum recommended batch: 50 images per job).
* **FR-1.2 Format Support:** Ingest standard raster formats: `.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`.
* **FR-1.3 Pre-Processing Validation:**
* Reject zero-byte or corrupt files before queueing.
* Warn the user if input dimensions exceed 4K ($3840 \times 2160$), applying automatic tile reduction (`-t 128` or `-t 256`) to prevent out-of-memory lockups on integrated graphics.


* **FR-1.4 File Size Limit:** Maximum single-file size capped at 50 MB; total batch payload capped at 500 MB.

### FR-2: Model Selection & Inference Configuration

* **FR-2.1 Model Registry:** The system must support hot-swappable NCNN model definitions with default support for:
1. `realesrgan-x4plus` (General photorealistic super-resolution).
2. `realesrnet-x4plus` (Denoise & smooth gradient enhancement).
3. `realesrgan-x4plus-anime` (Compact CNN for vector, anime, and illustrations).
4. `realesr-animevideov3` (Ultra-low latency model for high-throughput batches).


* **FR-2.2 Scale Factors:** Configurable scale multiplier: **2x**, **3x**, **4x**.
* **FR-2.3 Tiling Control:** Configurable tile dimensions (`0` for untiled, `128`, `256`, `512` pixels) to manage memory usage on the Vega 8 iGPU.
* **FR-2.4 Thread Concurrency Tuning:** Backend must pass `-j load:proc:save` flags (e.g., `-j 1:2:2`) to balance CPU file I/O with GPU compute.

### FR-3: Job Queue & Asynchronous Execution

* **FR-3.1 Unique Job Context:** Each batch receives an immutable UUID4 (`job_id`) with sandboxed disk paths: `uploads/{job_id}` and `outputs/{job_id}`.
* **FR-3.2 Non-Blocking Background Processing:** The FastAPI event loop must delegate the execution of the NCNN subprocess to an asynchronous worker queue, keeping the web interface responsive.
* **FR-3.3 Cancellation Support:** Users must have the ability to abort an active job, which immediately sends `SIGTERM`/`SIGKILL` to the active child process and marks remaining queue items as `cancelled`.

### FR-4: Real-Time Telemetry & Progress

* **FR-4.1 Progress Tracking:** Telemetry must report processed items, current image filename, elapsed time, and estimated time remaining (ETA).
* **FR-4.2 Real-Time Updates:** Telemetry must be delivered via polling (`GET /api/jobs/{id}`) or Server-Sent Events (SSE) (`GET /api/jobs/{id}/events`).

### FR-5: Output Preview, Comparison & Batch Export

* **FR-5.1 Side-by-Side Split Slider:** Interactive Before/After slider component in React comparing original vs. upscaled imagery at full resolution with zoom/pan capabilities.
* **FR-5.2 Individual Downloads:** Direct download link for each processed image.
* **FR-5.3 Consolidated ZIP Export:** Dynamic server-side packaging of all successfully upscaled files into a single structured archive (`upscaled_batch_{job_id}.zip`).
* **FR-5.4 Auto-Cleanup Policy:** Temporary files and ZIP archives must be purged after 24 hours or via manual user command.

---

## 4. Non-Functional Requirements (NFRs) & Performance Budgets

| Metric | Target SLA | Mitigation / Strategy |
| --- | --- | --- |
| **Inference Latency (Standard 1080p -> 4K)** | $\le 2.5\text{s}$ per image | Tiling fixed at $256$, half-precision enabled. |
| **FastAPI RAM Footprint** | $\le 120\text{ MB}$ | No PyTorch imports in API process; run NCNN as a standalone C++ binary. |
| **GPU Memory Spike (Vega 8)** | $\le 600\text{ MB}$ UMA | Tile size clamped to $256\text{px}$ dynamically for inputs $> 2\text{MP}$. |
| **UI First Contentful Paint (FCP)** | $\le 0.8\text{s}$ | Lightweight Vite bundle without heavy external UI component kits. |
| **Crash Rate** | $0\%$ unhandled fatal halts | Corrupted images caught and logged to error stream; queue proceeds to next image. |

---

## 5. System Architecture & Data Flow

```
+-------------------------------------------------------------------------+
|                        BROWSER CLIENT (React / Vite)                    |
|  [ File Dropzone ]  [ Model Switcher ]  [ Before/After Slider ]         |
+-------------------------------------------------------------------------+
                                    |
                     REST / Multipart / SSE (Port 8000)
                                    v
+-------------------------------------------------------------------------+
|                     BACKEND SERVICE (FastAPI / Python)                  |
|  - Request Router & Payload Sanitizer                                   |
|  - Async Background Task Queue Manager                                  |
|  - Job Registry & Disk Session Handler                                  |
+-------------------------------------------------------------------------+
                                    |
                  Subprocess Dispatch (`asyncio.create_subprocess_exec`)
                                    v
+-------------------------------------------------------------------------+
|                NCNN VULKAN INFERENCE ENGINE (C++ Binary)                |
|  - Pipeline: Real-ESRGAN / Real-ESRNet Binaries                        |
|  - Arguments: `-i <in> -o <out> -n <model> -s <scale> -t 256 -g 0`      |
+-------------------------------------------------------------------------+
                                    |
             Hardware Acceleration via Mesa RADV Driver
                                    v
+-------------------------------------------------------------------------+
|             AMD RADEON VEGA 8 iGPU (Vulkan 1.4 / Unified Memory)        |
+-------------------------------------------------------------------------+

```

---

## 6. API Interface & Data Contracts

### 6.1 `GET /api/models`

Returns list of available models and metadata.

**Response `200 OK`:**

```json
[
  {
    "id": "realesrgan-x4plus",
    "name": "Real-ESRGAN x4 Plus",
    "type": "photo",
    "scales": [2, 4],
    "default_scale": 4,
    "description": "Best for general real-world photography and textures."
  },
  {
    "id": "realesrgan-x4plus-anime",
    "name": "Real-ESRGAN Anime",
    "type": "anime",
    "scales": [4],
    "default_scale": 4,
    "description": "Optimized for flat art, comics, and UI elements."
  }
]

```

---

### 6.2 `POST /api/jobs/batch`

Ingests files and enqueues the processing job.

**Request (`multipart/form-data`):**

* `files`: Array of Binary Files
* `model`: `string` (e.g., `"realesrgan-x4plus"`)
* `scale`: `integer` (`2`, `3`, `4`)
* `tile_size`: `integer` (Default: `256`)

**Response `202 Accepted`:**

```json
{
  "job_id": "7e3b1c82-9e91-4d32-8df2-04e4a77918a2",
  "status": "queued",
  "total_items": 12,
  "created_at": 1740000000
}

```

---

### 6.3 `GET /api/jobs/{job_id}`

Returns real-time progress and completed asset references.

**Response `200 OK`:**

```json
{
  "job_id": "7e3b1c82-9e91-4d32-8df2-04e4a77918a2",
  "status": "processing",
  "progress": {
    "current_index": 4,
    "total_items": 12,
    "percentage": 33.3,
    "current_file": "portrait_sample.jpg"
  },
  "items": [
    {
      "original_name": "landscape.png",
      "upscaled_name": "upscaled_landscape.png",
      "status": "success",
      "duration_seconds": 2.14,
      "preview_url": "/static/outputs/7e3b1c82.../upscaled_landscape.png",
      "original_url": "/static/uploads/7e3b1c82.../landscape.png"
    }
  ]
}

```

---

### 6.4 `GET /api/jobs/{job_id}/export`

Packages all finished items into a compressed ZIP stream.

**Response:** `200 OK` (`Content-Type: application/zip`, `Content-Disposition: attachment; filename="upscaled_batch_7e3b1c82.zip"`)

---

## 7. Frontend State Architecture & UX Design

### State Machine Definition

```
  [ IDLE ]
     │  (Files selected / dropped)
     ▼
[ STAGED ] ──(User configures model & clicks "Start")──► [ UPLOADING ]
     ▲                                                         │
     │                                           (Upload finished / Job queued)
     │                                                         ▼
     │                                                  [ PROCESSING ]
     │                                                         │
     │                                     ┌───────────────────┴───────────────────┐
     │                                     │ (All done)                            │ (Errors encountered)
     │                                     ▼                                       ▼
     └──────(Reset / New Batch)───── [ COMPLETED ]                          [ PARTIAL_FAILURE ]

```

### Key UI Views

1. **Staging / Dropzone Panel:** Visual cue for total image count, cumulative upload size, and validation warnings for extreme-resolution images.
2. **Settings Drawer:** Control sliders for Scale Factor ($2\times - 4\times$), Tile Sizes ($128/256/512$), and Model Select dropdown.
3. **Active Processing Pipeline:** Determinate progress bar, active image thumbnail indicator, and cancel button.
4. **Gallery & Comparison Suite:**
* Grid display of processed outputs.
* Interactive **Split Comparison Viewer**: Overlays original and processed images on an HTML5 canvas with a draggable divider bar.
* Floating Action Bar with **Download Selected** and **Download Batch (.ZIP)** buttons.



---

## 8. Directory Layout & File Manifest

```
local-upscaler/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI entry point & CORS configuration
│   │   ├── config.py            # System paths, binary detection, defaults
│   │   ├── engine.py            # Subprocess execution & NCNN CLI interface
│   │   ├── queue.py             # In-memory async job queue manager
│   │   ├── models.py            # Pydantic models for API contracts
│   │   └── utils.py             # Image validation, ZIP creation, disk cleaner
│   ├── bin/
│   │   ├── realesrgan-ncnn-vulkan  # Pre-compiled C++ Vulkan executable
│   │   └── models/                 # Model weight files (.bin / .param)
│   ├── storage/
│   │   ├── uploads/             # Raw incoming image folders (keyed by job_id)
│   │   └── outputs/             # Processed images and generated ZIP archives
│   ├── requirements.txt
│   └── venv/
└── frontend/
    ├── public/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   │   ├── Dropzone.jsx          # File upload & validation container
    │   │   ├── ControlPanel.jsx      # Model/scale/tile parameters
    │   │   ├── ProgressBar.jsx       # Real-time progress telemetry bar
    │   │   ├── ImageGrid.jsx         # Card-based gallery for results
    │   │   └── CompareSlider.jsx     # Interactive before/after split slider
    │   ├── hooks/
    │   │   ├── useBatchJob.js        # Polling/SSE hook for job lifecycle
    │   │   └── useModels.js          # Fetches available models
    │   ├── App.jsx                   # Main layout container
    │   ├── index.css                 # Styling system
    │   └── main.jsx
    ├── package.json
    └── vite.config.js

```

---

## 9. Failure Modes & Recovery Strategies

| Failure Scenario | Root Cause | System Recovery Behavior |
| --- | --- | --- |
| **GPU Out of Memory (VK_ERROR_OUT_OF_DEVICE_MEMORY)** | Image dimension too large for default tile size on Vega 8 iGPU. | Backend catches exit code, halves `-t` tile size (e.g., $256 \to 128$), and retries the failed image once before flagging error. |
| **Corrupted Image Upload** | Incomplete transfer or invalid image header. | Pre-validation rejects image before NCNN dispatch, marking item as `skipped_invalid` without terminating the batch. |
| **Hyprland / Desktop Session Interruption** | System sleep, suspend, or window manager reload. | FastAPI job process continues in the background; React reconnects and resumes polling upon browser tab reactivation. |
| **Disk Space Exhaustion** | Storage accumulating unpruned batches. | Hourly cron/background task purges directories in `storage/` older than 24 hours. |

---

## 10. Phased Implementation Roadmap

* **Phase 1 (Core Foundation):** Directory initialization, binary verification, FastAPI endpoint scaffolding, and single-image NCNN execution test.
* **Phase 2 (Async Batch Pipeline):** Background task queue implementation, multi-file upload endpoints, and ZIP compression pipeline.
* **Phase 3 (Frontend Interface):** React layout construction, drag-and-drop batch ingestion, and real-time polling hook.
* **Phase 4 (Interactive Comparison & Polish):** Interactive before/after split viewer, dynamic tile-fallback error handling, and performance optimization for the Ryzen 7730U.
