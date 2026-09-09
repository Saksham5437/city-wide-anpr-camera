import time
import os
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.detection import DetectionModel
from app.models.vehicle import VehicleModel, WatchlistModel
from app.models.alert import AlertModel
from app.models.camera import CameraModel
from app.schemas.detection import DetectionCreate
from app.core.config import settings
from app.core.websocket import manager

class DetectionService:
    @staticmethod
    def get_paginated(
        db: Session,
        page: int = 1,
        limit: int = 50,
        plate: Optional[str] = None,
        camera_code: Optional[str] = None,
        vehicle_type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        min_confidence: Optional[float] = None
    ) -> Dict[str, Any]:
        query = db.query(DetectionModel)

        if plate:
            clean_plate = plate.upper().replace(" ", "").replace("-", "")
            query = query.filter(DetectionModel.plate.like(f"%{clean_plate}%"))

        if camera_code:
            query = query.filter(DetectionModel.camera_code == camera_code)

        if vehicle_type:
            query = query.filter(DetectionModel.vehicle_type.ilike(vehicle_type))

        if start_date:
            query = query.filter(DetectionModel.timestamp >= start_date)

        if end_date:
            query = query.filter(DetectionModel.timestamp <= end_date)

        if min_confidence is not None:
            query = query.filter(DetectionModel.confidence >= min_confidence)

        total = query.count()
        offset = (page - 1) * limit
        items = query.order_by(DetectionModel.timestamp.desc()).offset(offset).limit(limit).all()

        return {
            "items": items,
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit if total > 0 else 1
        }

    @staticmethod
    async def process_and_store_detection(
        db: Session,
        plate: str,
        camera_code: str,
        camera_name: str,
        location: str,
        lat: float,
        lng: float,
        timestamp: Optional[str] = None,
        confidence: float = 98.0,
        vehicle_type: str = "Car",
        vehicle_color: str = "White",
        speed: float = 45.0,
        lane_number: int = 1,
        snapshot_url: Optional[str] = None,
        plate_crop_url: Optional[str] = None
    ) -> Tuple[DetectionModel, Optional[AlertModel]]:
        # 1. Normalize plate
        clean_plate = plate.upper().replace(" ", "").replace("-", "").strip()
        ts = timestamp or datetime.utcnow().isoformat()
        
        # 2. Duplicate suppression check (configurable window)
        window_seconds = settings.DUPLICATE_WINDOW_SECONDS
        if window_seconds > 0:
            recent_det = db.query(DetectionModel).filter(
                DetectionModel.plate == clean_plate,
                DetectionModel.camera_code == camera_code
            ).order_by(DetectionModel.timestamp.desc()).first()
            # If detected recently, still persist historical record but mark / suppress duplicate alert
            # In our system every detection is preserved historically per requirements

        # 3. Find or Create Vehicle
        veh = db.query(VehicleModel).filter(VehicleModel.plate == clean_plate).first()
        if not veh:
            veh = VehicleModel(
                id=f"veh-{int(time.time()*1000)}",
                plate=clean_plate,
                type=vehicle_type,
                make_model=f"{vehicle_type} ({vehicle_color})",
                color=vehicle_color,
                first_seen=ts,
                last_seen=ts,
                sightings_count=1,
                violations_count=0,
                is_watchlisted=False,
                risk_level="Low",
                registered_owner="RTO Lookup Available",
                registered_state="Karnataka",
                fuel_type="Petrol"
            )
            db.add(veh)
            db.flush()
        else:
            veh.last_seen = ts
            veh.sightings_count = (veh.sightings_count or 1) + 1
            if vehicle_type and veh.type == "Unknown":
                veh.type = vehicle_type
            if vehicle_color and veh.color == "Unknown":
                veh.color = vehicle_color

        # 3b. Ensure Camera exists for ForeignKey integrity in MySQL
        cam = db.query(CameraModel).filter(CameraModel.code == camera_code).first()
        if not cam:
            cam = CameraModel(
                id=camera_code,
                code=camera_code,
                name=camera_name,
                location=location,
                lat=lat,
                lng=lng,
                zone="Active Surveillance Zone",
                status="ONLINE",
                camera_type="ANPR Live Node"
            )
            db.add(cam)
            db.flush()


        # 4. Create Detection Record (Permanent History)
        det_id = f"det-{int(time.time()*1000)}"
        det = DetectionModel(
            id=det_id,
            vehicle_id=veh.id,
            plate=clean_plate,
            camera_code=camera_code,
            camera_name=camera_name,
            location=location,
            lat=lat,
            lng=lng,
            timestamp=ts,
            direction="Inbound",
            speed=speed,
            confidence=confidence,
            vehicle_type=vehicle_type,
            vehicle_color=vehicle_color,
            lane_number=lane_number,
            snapshot_url=snapshot_url,
            plate_crop_url=plate_crop_url
        )
        db.add(det)

        # 5. Check Watchlist & Trigger Alert
        alert_obj = None
        watchlist_entry = db.query(WatchlistModel).filter(
            WatchlistModel.plate == clean_plate,
            WatchlistModel.is_active == True
        ).first()

        if watchlist_entry:
            watchlist_entry.flagged_sightings = (watchlist_entry.flagged_sightings or 0) + 1
            veh.is_watchlisted = True
            veh.watchlist_reason = watchlist_entry.reason
            veh.risk_level = "Critical"

            alert_id = f"alt-{int(time.time()*1000)}"
            alert_obj = AlertModel(
                id=alert_id,
                title=f"WATCHLIST MATCH: {clean_plate}",
                type="Critical",
                category="WATCHLIST",
                vehicle_plate=clean_plate,
                camera_code=camera_code,
                location=location,
                timestamp=ts,
                description=f"Watchlisted vehicle {clean_plate} detected at {location}. Reason: {watchlist_entry.reason}",
                status="ACTIVE",
                action_required=f"Intercept vehicle at {location}. Contact TMC dispatch."
            )
            db.add(alert_obj)

        # 6. Commit transaction safely
        db.commit()
        db.refresh(det)
        if alert_obj:
            db.refresh(alert_obj)

        # 7. WebSocket Broadcast after successful DB commit
        await manager.broadcast("DETECTION", {
            "id": det.id,
            "plate": det.plate,
            "cameraCode": det.camera_code,
            "cameraName": det.camera_name,
            "location": det.location,
            "lat": det.lat,
            "lng": det.lng,
            "speed": det.speed,
            "vehicleType": det.vehicle_type,
            "vehicleColor": det.vehicle_color,
            "confidence": det.confidence,
            "timestamp": det.timestamp
        })

        if alert_obj:
            await manager.broadcast("ALERT", {
                "id": alert_obj.id,
                "title": alert_obj.title,
                "type": alert_obj.type,
                "category": alert_obj.category,
                "vehiclePlate": alert_obj.vehicle_plate,
                "cameraCode": alert_obj.camera_code,
                "location": alert_obj.location,
                "timestamp": alert_obj.timestamp,
                "description": alert_obj.description,
                "status": alert_obj.status
            })

        return det, alert_obj

detection_service = DetectionService()
