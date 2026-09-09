from typing import Optional
from pydantic import BaseModel

class ViolationBase(BaseModel):
    challan_number: str
    vehicle_id: str
    plate: str
    camera_code: str
    location: str
    timestamp: str
    violation_type: str
    speed_limit: Optional[int] = None
    recorded_speed: Optional[float] = None
    fine_amount: int = 1000
    confidence: float = 95.0
    status: str = "New"
    evidence_image: Optional[str] = None
    vehicle_type: str = "Car"
    vehicle_color: str = "White"
    notes: Optional[str] = None
    adjudicated_by: Optional[str] = None
    adjudicated_at: Optional[str] = None
    rejection_reason: Optional[str] = None

class ViolationCreate(ViolationBase):
    pass

class Violation(ViolationBase):
    id: str

    class Config:
        from_attributes = True
