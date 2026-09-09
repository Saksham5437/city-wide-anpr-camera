from app.schemas.camera import Camera, CameraCreate, CameraUpdate
from app.schemas.vehicle import Vehicle, VehicleCreate, VehicleUpdate, WatchlistItem, WatchlistItemCreate
from app.schemas.detection import Detection, DetectionCreate, TrajectoryRoute, TrajectoryPoint, RouteSegment
from app.schemas.violation import Violation, ViolationCreate
from app.schemas.alert import Alert, AlertCreate
from app.schemas.analytics import DashboardStats, HourlyTrafficItem
from app.schemas.auth import User, UserCreate, Token, TokenPayload
from app.schemas.anpr import AnprProcessingRequest, AnprProcessingResult, DetectedVehicle, DetectedPlate

__all__ = [
    "Camera", "CameraCreate", "CameraUpdate",
    "Vehicle", "VehicleCreate", "VehicleUpdate", "WatchlistItem", "WatchlistItemCreate",
    "Detection", "DetectionCreate", "TrajectoryRoute", "TrajectoryPoint", "RouteSegment",
    "Violation", "ViolationCreate",
    "Alert", "AlertCreate",
    "DashboardStats", "HourlyTrafficItem",
    "User", "UserCreate", "Token", "TokenPayload",
    "AnprProcessingRequest", "AnprProcessingResult", "DetectedVehicle", "DetectedPlate"
]
