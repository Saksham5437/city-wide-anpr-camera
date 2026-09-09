from typing import List, Optional, Tuple
from pydantic import BaseModel

class AnprProcessingRequest(BaseModel):
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    camera_code: Optional[str] = "CAM-V01"
    camera_name: Optional[str] = "Live ANPR Feed"
    detect_violations: bool = True
    speed_estimate_kmh: Optional[float] = None

class DetectedVehicle(BaseModel):
    bbox: List[float] # [x, y, w, h]
    confidence: float
    vehicle_class: str
    color: str

class DetectedPlate(BaseModel):
    bbox: List[float]
    plate_text: str
    ocr_confidence: float
    format_standard: str
    is_registered: bool

class AnprProcessingResult(BaseModel):
    success: bool
    vehicles: List[DetectedVehicle]
    plates: List[DetectedPlate]
    violations_detected: List[str]
    processing_time_ms: float
    timestamp: str
