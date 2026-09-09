from typing import List, Optional
from pydantic import BaseModel

class DashboardStats(BaseModel):
    active_cameras: int
    total_cameras: int
    vehicles_detected_today: int
    violations_today: int
    vehicles_tracked: int
    active_alerts: int
    current_traffic_volume: int
    peak_traffic_time: str
    average_city_speed: float

class HourlyTrafficItem(BaseModel):
    hour_index: int
    hour_label: str
    hour24: str
    time_range: str
    volume: int
    avg_speed: float
    is_current_hour: bool
    is_peak: bool
