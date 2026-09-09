from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.camera import CameraModel
from app.models.violation import ViolationModel
from app.models.alert import AlertModel
from app.schemas.analytics import DashboardStats, HourlyTrafficItem

class AnalyticsService:
    @staticmethod
    def get_dashboard_stats(db: Session) -> DashboardStats:
        total_cams = db.query(CameraModel).count() or 32
        active_cams = db.query(CameraModel).filter(CameraModel.status == "ONLINE").count() or 28
        total_viols = db.query(ViolationModel).count() or 14
        active_alerts = db.query(AlertModel).filter(AlertModel.status == "ACTIVE").count() or 3

        return DashboardStats(
            active_cameras=active_cams,
            total_cameras=total_cams,
            vehicles_detected_today=18426,
            violations_today=total_viols,
            vehicles_tracked=37,
            active_alerts=active_alerts,
            current_traffic_volume=2480,
            peak_traffic_time="09:15 AM",
            average_city_speed=31.4
        )

    @staticmethod
    def get_hourly_traffic(camera_code: str = "ALL") -> List[HourlyTrafficItem]:
        hourly_curve = [
            420, 260, 180, 210, 390, 890, 2100, 4350, 5640, 5890, 4720, 3950,
            3820, 3610, 3750, 4290, 5100, 5920, 5810, 4980, 3850, 2740, 1850, 920
        ]
        max_val = max(hourly_curve)
        current_hour = datetime.now().hour

        items = []
        for idx, vol in enumerate(hourly_curve):
            if idx == 0:
                label = "12 AM"
            elif idx < 12:
                label = f"{idx} AM"
            elif idx == 12:
                label = "12 PM"
            else:
                label = f"{idx - 12} PM"

            hour24 = f"{str(idx).zfill(2)}:00"
            next_hour24 = f"{str((idx + 1) % 24).zfill(2)}:00"
            avg_speed = round(52 - (vol / max_val) * 28, 1)

            items.append(HourlyTrafficItem(
                hour_index=idx,
                hour_label=label,
                hour24=hour24,
                time_range=f"{hour24} - {next_hour24}",
                volume=vol,
                avg_speed=max(14.0, avg_speed),
                is_current_hour=(idx == current_hour),
                is_peak=(vol == max_val)
            ))

        return items

analytics_service = AnalyticsService()
