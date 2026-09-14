from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class ModelType(str, Enum):
    PHOTO = "photo"
    DENOISE = "denoise"
    ANIME = "anime"
    FAST = "fast"


class ModelMetadata(BaseModel):
    id: str
    name: str
    type: str
    scales: List[int]
    default_scale: int
    description: str


AVAILABLE_MODELS: List[ModelMetadata] = [
    ModelMetadata(
        id="realesrgan-x4plus",
        name="Real-ESRGAN x4 Plus",
        type="photo",
        scales=[2, 4],
        default_scale=4,
        description="Best for general real-world photography, textures, and landscapes.",
    ),
    ModelMetadata(
        id="realesrnet-x4plus",
        name="Real-ESRNet x4 Plus",
        type="denoise",
        scales=[2, 4],
        default_scale=4,
        description="Denoise & smooth gradient enhancement without over-sharpening artifacts.",
    ),
    ModelMetadata(
        id="realesrgan-x4plus-anime",
        name="Real-ESRGAN Anime",
        type="anime",
        scales=[4],
        default_scale=4,
        description="Optimized for flat art, anime/manga illustrations, and UI graphics.",
    ),
    ModelMetadata(
        id="realesr-animevideov3",
        name="Real-ESR AnimeVideo v3",
        type="fast",
        scales=[2, 3, 4],
        default_scale=4,
        description="Ultra-low latency model for high-throughput batch super-resolution.",
    ),
]


class ItemStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED_INVALID = "skipped_invalid"
    CANCELLED = "cancelled"


class JobOverallStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    PARTIAL_FAILURE = "partial_failure"
    FAILED = "failed"
    CANCELLED = "cancelled"


class BatchItemResponse(BaseModel):
    item_id: str
    original_name: str
    stored_name: str
    upscaled_name: Optional[str] = None
    status: str = ItemStatus.QUEUED.value
    duration_seconds: Optional[float] = None
    error_message: Optional[str] = None
    preview_url: Optional[str] = None
    original_url: Optional[str] = None
    input_width: Optional[int] = None
    input_height: Optional[int] = None
    output_width: Optional[int] = None
    output_height: Optional[int] = None
    file_size_bytes: Optional[int] = None
    tile_size_used: Optional[int] = None


class JobProgress(BaseModel):
    current_index: int = 0
    total_items: int = 0
    percentage: float = 0.0
    current_file: Optional[str] = None
    elapsed_seconds: float = 0.0
    eta_seconds: Optional[float] = None


class JobResponse(BaseModel):
    job_id: str
    status: str
    model: str
    scale: int
    tile_size: int
    total_items: int
    created_at: float
    completed_at: Optional[float] = None
    progress: JobProgress
    items: List[BatchItemResponse]
    warnings: List[str] = Field(default_factory=list)


class BatchCreateResponse(BaseModel):
    job_id: str
    status: str
    total_items: int
    created_at: float
    warnings: List[str] = Field(default_factory=list)


class SystemHealthResponse(BaseModel):
    status: str
    binary_available: bool
    binary_path: Optional[str] = None
    vulkan_device: Optional[str] = None
    available_models: List[str]
    storage_usage_mb: float
    process_memory_mb: float
