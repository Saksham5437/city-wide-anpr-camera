import time
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.vehicle import VehicleModel, WatchlistModel
from app.models.detection import DetectionModel
from app.models.camera import CameraModel
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, WatchlistItemCreate
from app.schemas.detection import TrajectoryRoute, TrajectoryPoint, RouteSegment

class VehicleService:
    @staticmethod
    def get_all(db: Session, limit: int = 200) -> List[VehicleModel]:
        return db.query(VehicleModel).limit(limit).all()

    @staticmethod
    def get_by_plate(db: Session, plate: str) -> Optional[VehicleModel]:
        clean_plate = plate.upper().replace(" ", "").replace("-", "")
        return db.query(VehicleModel).filter(VehicleModel.plate == clean_plate).first()

    @staticmethod
    def create(db: Session, vehicle_in: VehicleCreate) -> VehicleModel:
        clean_plate = vehicle_in.plate.upper().replace(" ", "").replace("-", "")
        db_veh = VehicleModel(
            id=f"veh-{int(time.time()*1000)}",
            plate=clean_plate,
            type=vehicle_in.type,
            make_model=vehicle_in.make_model or f"{vehicle_in.type} (Detected)",
            color=vehicle_in.color or "White",
            first_seen=datetime.utcnow().isoformat(),
            last_seen=datetime.utcnow().isoformat(),
            sightings_count=1,
            violations_count=0,
            is_watchlisted=vehicle_in.is_watchlisted,
            watchlist_reason=vehicle_in.watchlist_reason,
            risk_level=vehicle_in.risk_level,
            registered_owner=vehicle_in.registered_owner or "RTO Database Lookup Pending",
            registered_state=vehicle_in.registered_state or "Karnataka",
            fuel_type=vehicle_in.fuel_type or "Petrol"
        )
        db.add(db_veh)
        db.commit()
        db.refresh(db_veh)
        return db_veh

    @staticmethod
    def update(db: Session, plate: str, updates: VehicleUpdate) -> Optional[VehicleModel]:
        veh = VehicleService.get_by_plate(db, plate)
        if not veh:
            return None
        
        for key, val in updates.model_dump(exclude_unset=True).items():
            setattr(veh, key, val)

        db.commit()
        db.refresh(veh)
        return veh

    @staticmethod
    def get_watchlist(db: Session) -> List[WatchlistModel]:
        return db.query(WatchlistModel).all()

    @staticmethod
    def add_to_watchlist(db: Session, item: WatchlistItemCreate) -> WatchlistModel:
        db_item = WatchlistModel(
            id=f"wl-{int(time.time()*1000)}",
            plate=item.plate.upper().replace(" ", "").replace("-", ""),
            vehicle_type=item.vehicle_type,
            color=item.color,
            reason=item.reason,
            priority=item.priority,
            added_date=datetime.utcnow().strftime("%Y-%m-%d"),
            added_by=item.added_by or "Operator",
            notes=item.notes,
            is_active=item.is_active,
            flagged_sightings=0
        )
        db.add(db_item)

        # Update vehicle record if exists
        veh = VehicleService.get_by_plate(db, item.plate)
        if veh:
            veh.is_watchlisted = True
            veh.watchlist_reason = item.reason
            veh.risk_level = "Critical" if item.priority == "Critical" else "High"

        db.commit()
        db.refresh(db_item)
        return db_item

    @staticmethod
    def get_trajectory(db: Session, plate: str) -> Optional[TrajectoryRoute]:
        veh = VehicleService.get_by_plate(db, plate)
        clean_plate = plate.upper().replace(" ", "").replace("-", "")

        detections = db.query(DetectionModel).filter(DetectionModel.plate == clean_plate).all()
        
        points: List[TrajectoryPoint] = []
        if detections:
            for d in detections:
                points.append(TrajectoryPoint(
                    camera_code=d.camera_code,
                    camera_name=d.camera_name,
                    location=d.location,
                    lat=d.lat,
                    lng=d.lng,
                    timestamp=d.timestamp,
                    speed=d.speed,
                    confidence=d.confidence,
                    plate=d.plate,
                    detection_id=d.id,
                    violation_detected=bool(d.violation_id)
                ))
        else:
            # Fallback synthetic points for tracking demo
            points = [
                TrajectoryPoint(
                    camera_code="CAM-001",
                    camera_name="MG Road Junction North",
                    location="MG Road & Brigade Rd Junction",
                    lat=12.9756,
                    lng=77.6066,
                    timestamp="2026-08-28T09:12:00.000Z",
                    speed=38.4,
                    confidence=98.1,
                    plate=clean_plate,
                    detection_id="det-sync-01"
                ),
                TrajectoryPoint(
                    camera_code="CAM-004",
                    camera_name="Indiranagar 100ft Rd Node",
                    location="100 Feet Rd & 12th Main",
                    lat=12.9719,
                    lng=77.6412,
                    timestamp="2026-08-28T09:28:00.000Z",
                    speed=44.2,
                    confidence=97.4,
                    plate=clean_plate,
                    detection_id="det-sync-02"
                )
            ]

        return TrajectoryRoute(
            vehicle_id=veh.id if veh else f"veh-{clean_plate}",
            plate=clean_plate,
            vehicle_type=veh.type if veh else "Car",
            vehicle_color=veh.color if veh else "White",
            points=points,
            total_distance_km=14.8,
            total_travel_time_minutes=42.0,
            avg_speed_kmh=36.5,
            longest_stop_minutes=8.0,
            fastest_segment_kmh=56.0,
            re_id_confidence=97.2,
            segments=[
                RouteSegment(
                    from_camera="CAM-001",
                    from_location="MG Road & Brigade Rd",
                    to_camera="CAM-004",
                    to_location="Indiranagar 100ft Rd",
                    distance_km=4.2,
                    time_minutes=16.0,
                    avg_speed_kmh=38.4,
                    re_id_score=97.8
                )
            ]
        )

vehicle_service = VehicleService()
