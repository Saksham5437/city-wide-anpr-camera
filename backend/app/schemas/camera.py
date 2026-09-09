from typing import List, Optional
from pydantic import BaseModel

class CameraBase(BaseModel):
    code: str
    name: str
    location: str
    lat: float
    lng: float
    zone: str
    status: str = "ONLINE"
    camera_type: str = "ANPR Traffic Camera"
    ai_modules: Optional[List[str]] = None
    vehicles_per_min: int = 40
    traffic_level: str = "Normal"
    last_detected_plate: Optional[str] = None
    violations_today: int = 0
    vehicles_today: int = 0
    avg_speed: float = 35.0
    uptime: float = 99.5
    direction: str = "Northbound"
    stream_url: Optional[str] = None
    resolution: str = "1080p"
    fps: int = 30
    ip_address: str = "192.168.1.100"
    install_date: Optional[str] = None

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    traffic_level: Optional[str] = None
    vehicles_per_min: Optional[int] = None
    last_detected_plate: Optional[str] = None
    violations_today: Optional[int] = None
    vehicles_today: Optional[int] = None
    avg_speed: Optional[float] = None
    uptime: Optional[float] = None

class Camera(CameraBase):
    id: str

    class Config:
        from_attributes = True
