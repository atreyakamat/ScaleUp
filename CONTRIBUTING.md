# Contributing to ScaleUp

Thank you for your interest in contributing to **ScaleUp**! We welcome contributions of all kinds: bug fixes, performance optimizations, new super-resolution model integrations, documentation improvements, and UI enhancements.

---

## 🛠️ Development Setup

### 1. Prerequisites
- **Operating System:** Linux (Arch Linux, Ubuntu, Fedora, Debian) with Vulkan-compatible GPU (AMD Radeon, Intel, NVIDIA).
- **Vulkan Driver:** Mesa RADV (`vulkan-radeon`) or vendor Vulkan ICD.
- **Languages / Tools:**
  - Python 3.10+
  - Node.js 18+ and npm
  - `git`, `curl`, `unzip`

### 2. Fork & Clone
```bash
git clone https://github.com/<your-username>/ScaleUp.git
cd ScaleUp
```

### 3. Automated Bootstrap
Run the seed script to set up Python virtualenv, download NCNN Vulkan binary & models, and build the React SPA:
```bash
./scripts/seed.sh
```

### 4. Running in Development Mode

**Terminal 1 — FastAPI Backend:**
```bash
PYTHONPATH=backend backend/venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 7756
```

**Terminal 2 — React Vite Dev Server (HMR enabled):**
```bash
cd frontend
npm run dev
```
Access the Vite dev server at `http://localhost:5173`. Any API calls to `/api` are automatically proxied to port `7756`.

---

## 🧪 Testing Guidelines

Before opening a pull request, ensure all backend and frontend checks pass:

### 1. Run Automated Test Suite
```bash
ScaleUp test
# or
PYTHONPATH=backend backend/venv/bin/pytest backend/tests/ -v
```

### 2. Verify Frontend Production Build
```bash
cd frontend
npm run build
```

---

## 🤖 Adding New Super-Resolution Models

To integrate a new NCNN Vulkan model:
1. Place the compiled `<model-name>.bin` and `<model-name>.param` files in `backend/bin/models/`.
2. Update the model registry in `backend/app/models.py` with its metadata, architecture description, and supported scaling factors ($2\times, 3\times, 4\times$).
3. If the model has unique GPU memory requirements on AMD Vega 8, configure safe tile sizes in `backend/app/engine.py` (e.g. clamp tile size to $\le 128\text{px}$).
4. Add a test case in `backend/tests/test_api.py`.

---

## 🌿 Pull Request Workflow

1. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Commit with conventional commit messages:
   - `feat: add ESRGAN anime compact model`
   - `fix: resolve tile overflow on 8K textures`
   - `docs: update hardware compatibility matrix`
3. Push to your fork and submit a PR to the `main` branch.
4. Fill out the pull request template completely.

Thank you for helping make local AI super-resolution accessible to everyone!
