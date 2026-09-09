from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime

class RawOcrObservation(BaseModel):
    frame_idx: int
    timestamp_sec: float
    raw_plate: str
    cleaned_plate: str
    confidence: float
    country_estimated: Optional[str] = "UNKNOWN"
    image_quality: float

class VehiclePassageBase(BaseModel):
    video_id: Optional[str] = None
    track_id: int
    camera_code: str
    vehicle_id: Optional[str] = None
    plate_number: str
    plate_country: str = "UNKNOWN"
    plate_format: str = "Universal Alphanumeric"
    recognition_status: str = "RECOGNIZED"
    compliance_status: str = "COMPLIANT"
    vehicle_type: str = "Car"
    vehicle_color: str = "Unknown"
    make: str = "Unknown"
    model: str = "Unknown"
    first_seen_timestamp: str
    last_seen_timestamp: str
    duration_seconds: float = 0.0
    avg_speed: float = 45.0
    max_speed: float = 45.0
    direction: str = "Inbound"
    lane_number: int = 1
    vehicle_confidence: float = 95.0
    plate_confidence: float = 90.0
    ocr_confidence: float = 90.0
    final_confidence: float = 92.0
    best_vehicle_image_path: Optional[str] = None
    best_plate_image_path: Optional[str] = None
    raw_ocr_observations: Optional[List[Dict[str, Any]]] = None

class VehiclePassageCreate(VehiclePassageBase):
    pass

class VehiclePassage(VehiclePassageBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class PassagePaginatedResponse(BaseModel):
    items: List[VehiclePassage]
    total: int
    page: int
    limit: int
    total_pages: int
