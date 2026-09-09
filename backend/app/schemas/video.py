from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime

class VideoJobBase(BaseModel):
    filename: str
    camera_code: Optional[str] = "CAM-V01"
    location: Optional[str] = "Video ANPR Camera Stream"

class VideoJobCreate(VideoJobBase):
    pass

class VideoJobProgress(BaseModel):
    video_id: str
    filename: str
    status: str
    progress_percentage: float
    processed_frames: int
    total_frames: int
    fps: float
    duration_seconds: float
    total_vehicles: int
    unique_vehicles: int
    plates_recognized: int
    plates_unreadable: int
    compliant_vehicles: int
    violating_vehicles: int
    review_required: int
    total_violations: int

class VideoSummaryBreakdown(BaseModel):
    total_vehicles: int
    unique_vehicles: int
    plates_recognized: int
    plates_unreadable: int
    compliant_vehicles: int
    violating_vehicles: int
    review_required: int
    total_violations: int
    by_vehicle_type: Dict[str, int]
    by_violation_type: Dict[str, int]
    by_country: Dict[str, int]
    by_compliance: Dict[str, int]

class VideoJobResponse(VideoJobBase):
    id: str
    file_path: str
    duration_seconds: float
    fps: float
    resolution: str
    frame_count: int
    status: str
    progress_percentage: float
    processed_frames: int
    total_vehicles: int
    unique_vehicles: int
    plates_recognized: int
    plates_unreadable: int
    compliant_vehicles: int
    violating_vehicles: int
    review_required: int
    total_violations: int
    processing_start: Optional[datetime] = None
    processing_end: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
