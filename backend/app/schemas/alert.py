from typing import Optional
from pydantic import BaseModel

class AlertBase(BaseModel):
    title: str
    type: str = "Critical"
    category: str = "WATCHLIST"
    vehicle_plate: Optional[str] = None
    camera_code: Optional[str] = None
    location: str
    timestamp: str
    description: str
    status: str = "ACTIVE"
    action_required: Optional[str] = None

class AlertCreate(AlertBase):
    pass

class Alert(AlertBase):
    id: str

    class Config:
        from_attributes = True
