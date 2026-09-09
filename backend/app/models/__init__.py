from app.models.camera import CameraModel
from app.models.vehicle import VehicleModel, WatchlistModel
from app.models.detection import DetectionModel
from app.models.violation import ViolationModel
from app.models.alert import AlertModel
from app.models.user import UserModel
from app.models.audit_log import AuditLogModel
from app.models.video import VideoModel
from app.models.passage import VehiclePassageModel

__all__ = [
    "CameraModel",
    "VehicleModel",
    "WatchlistModel",
    "DetectionModel",
    "ViolationModel",
    "AlertModel",
    "UserModel",
    "AuditLogModel",
    "VideoModel",
    "VehiclePassageModel"
]
