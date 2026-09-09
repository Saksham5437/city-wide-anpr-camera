from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.analytics import DashboardStats, HourlyTrafficItem
from app.services.analytics.analytics_service import analytics_service
from app.models.camera import CameraModel

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    return analytics_service.get_dashboard_stats(db)

@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    return analytics_service.get_overview(db)

@router.get("/detections")
def get_detection_analytics(db: Session = Depends(get_db)):
    return analytics_service.get_detection_analytics(db)

@router.get("/cameras")
def get_camera_analytics(db: Session = Depends(get_db)):
    cameras = db.query(CameraModel).all()
    return {
        "total": len(cameras),
        "online": sum(1 for c in cameras if c.status == "ONLINE"),
        "offline": sum(1 for c in cameras if c.status != "ONLINE"),
        "cameras": cameras
    }

@router.get("/traffic")
@router.get("/volume/{camera_code}", response_model=List[HourlyTrafficItem])
def get_volume(camera_code: str = "ALL"):
    return analytics_service.get_hourly_traffic(camera_code)
