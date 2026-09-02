# Stage 1: Build Frontend SPA
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend + Vulkan Runtime
FROM python:3.11-slim-bookworm

LABEL maintainer="ScaleUp Team"
LABEL version="1.1.0"
LABEL description="ScaleUp — Local Hardware-Accelerated AI Image Upscaler (NCNN Vulkan)"

# Switch to HTTPS Debian repositories and install Vulkan compute runtime
RUN sed -i 's|http://|https://|g' /etc/apt/sources.list.d/debian.sources && \
    apt-get update && apt-get install -y --no-install-recommends \
    libvulkan1 \
    mesa-vulkan-drivers \
    vulkan-tools \
    libgomp1 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy Backend source code and NCNN binaries/models
COPY backend /app/backend

# Copy Built Frontend Distribution
COPY --from=frontend-builder /build/dist /app/frontend/dist

# Set up storage and execute permissions
RUN mkdir -p /app/backend/storage/uploads /app/backend/storage/outputs && \
    chmod +x /app/backend/bin/realesrgan-ncnn-vulkan

ENV PORT=7756 \
    PYTHONPATH=/app/backend \
    PYTHONUNBUFFERED=1

EXPOSE 7756

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://127.0.0.1:7756/api/health || exit 1

CMD ["uvicorn", "app.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "7756"]
