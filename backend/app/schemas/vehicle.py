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

class ViolationDetail(BaseModel):
    id: str
    challan_number: str
    violation_type: str
    timestamp: str
    location: str
    camera_code: str
    fine_amount: float
    status: str
    speed_limit: Optional[float] = None
    recorded_speed: Optional[float] = None
    evidence_image: Optional[str] = None
    notes: Optional[str] = None

class SightingDetail(BaseModel):
    id: str
    camera_code: str
    camera_name: str
    location: str
    timestamp: str
    speed: float
    confidence: float
    lane_number: int
    direction: Optional[str] = "Inbound"
    snapshot_url: Optional[str] = None

class VehicleDossier(BaseModel):
    plate: str
    type: str
    make_model: str
    color: str
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None
    sightings_count: int
    violations_count: int
    is_watchlisted: bool
    watchlist_reason: Optional[str] = None
    risk_level: str
    registered_owner: str
    registered_state: str
    fuel_type: str
    
    # Extended RTO RC Book Information
    rc_status: str
    registration_date: str
    vehicle_age: str
    chassis_number: str
    engine_number: str
    insurance_policy: str
    insurance_valid_until: str
    insurance_status: str
    pucc_number: str
    pucc_valid_until: str
    pucc_status: str
    rto_office: str
    demerit_points: int
    
    # Violations Intelligence
    active_violations: List[ViolationDetail]
    settled_violations: List[ViolationDetail]
    total_unpaid_fines: float
    total_paid_fines: float
    
    # Chronological Sightings
    recent_sightings: List[SightingDetail]

