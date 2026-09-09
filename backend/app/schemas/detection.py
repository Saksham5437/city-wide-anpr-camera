from typing import List, Optional
from pydantic import BaseModel

class DetectionBase(BaseModel):
    vehicle_id: str
    plate: str
    camera_code: str
    camera_name: str
    location: str
    lat: float
    lng: float
    timestamp: str
    direction: str = "Inbound"
    speed: float = 45.0
    confidence: float = 98.0
    vehicle_type: str = "Car"
    vehicle_color: str = "White"
    lane_number: int = 1
    bbox_vehicle: Optional[List[float]] = None
    bbox_plate: Optional[List[float]] = None
    violation_id: Optional[str] = None
    re_id_score: Optional[float] = 95.0
    snapshot_url: Optional[str] = None
    plate_crop_url: Optional[str] = None

class DetectionCreate(DetectionBase):
    pass

class Detection(DetectionBase):
    id: str

    class Config:
        from_attributes = True

class TrajectoryPoint(BaseModel):
    camera_code: str
    camera_name: str
    location: str
    lat: float
    lng: float
    timestamp: str
    speed: float
    confidence: float
    plate: str
    detection_id: str
    violation_detected: Optional[bool] = False
    violation_type: Optional[str] = None

class RouteSegment(BaseModel):
    from_camera: str
    from_location: str
    to_camera: str
    to_location: str
    distance_km: float
    time_minutes: float
    avg_speed_kmh: float
    re_id_score: float

class TrajectoryRoute(BaseModel):
    vehicle_id: str
    plate: str
    vehicle_type: str
    vehicle_color: str
    points: List[TrajectoryPoint]
    total_distance_km: float
    total_travel_time_minutes: float
    avg_speed_kmh: float
    longest_stop_minutes: float
    fastest_segment_kmh: float
    re_id_confidence: float
    segments: List[RouteSegment]
    suspicious_trajectory: Optional[bool] = False
    suspicious_reason: Optional[str] = None
