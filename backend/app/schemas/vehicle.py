from typing import Optional, List
from pydantic import BaseModel

class VehicleBase(BaseModel):
    plate: str
    type: str = "Car"
    make_model: Optional[str] = "Standard Vehicle"
    color: Optional[str] = "White"
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None
    sightings_count: int = 1
    violations_count: int = 0
    is_watchlisted: bool = False
    watchlist_reason: Optional[str] = None
    risk_level: str = "Low"
    registered_owner: Optional[str] = "RTO Database Lookup Pending"
    registered_state: Optional[str] = "Karnataka"
    fuel_type: Optional[str] = "Petrol"

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    type: Optional[str] = None
    make_model: Optional[str] = None
    color: Optional[str] = None
    registered_owner: Optional[str] = None
    registered_state: Optional[str] = None
    risk_level: Optional[str] = None
    is_watchlisted: Optional[bool] = None
    watchlist_reason: Optional[str] = None

class Vehicle(VehicleBase):
    id: str

    class Config:
        from_attributes = True

class WatchlistItemBase(BaseModel):
    plate: str
    vehicle_type: str = "Car"
    color: str = "White"
    reason: str
    priority: str = "High"
    notes: Optional[str] = None
    is_active: bool = True

class WatchlistItemCreate(WatchlistItemBase):
    added_by: Optional[str] = "Operator"

class WatchlistItem(WatchlistItemBase):
    id: str
    added_date: Optional[str] = None
    added_by: str = "Operator"
    flagged_sightings: int = 0

    class Config:
        from_attributes = True
