from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.analytics import DashboardStats, HourlyTrafficItem
from app.services.analytics.analytics_service import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    return analytics_service.get_dashboard_stats(db)

@router.get("/volume/{camera_code}", response_model=List[HourlyTrafficItem])
def get_volume(camera_code: str = "ALL"):
    return analytics_service.get_hourly_traffic(camera_code)
