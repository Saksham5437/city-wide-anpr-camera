import time
from typing import List, Optional, Union, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.detection import DetectionModel
from app.schemas.detection import Detection, DetectionCreate
from app.services.detection.detection_service import detection_service

router = APIRouter(prefix="/detections", tags=["detections"])

@router.get("", response_model=Union[List[Detection], Dict[str, Any]])
def get_detections(
    page: Optional[int] = None,
    limit: int = 50,
    plate_number: Optional[str] = Query(None, alias="plate"),
    camera_id: Optional[str] = Query(None, alias="camera_code"),
    vehicle_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_confidence: Optional[float] = None,
    db: Session = Depends(get_db)
):
    if page is not None:
        return detection_service.get_paginated(
            db=db,
            page=page,
            limit=limit,
            plate=plate_number,
            camera_code=camera_id,
            vehicle_type=vehicle_type,
            start_date=start_date,
            end_date=end_date,
            min_confidence=min_confidence
        )

    # Default list format
    query = db.query(DetectionModel)
    if plate_number:
        clean = plate_number.upper().replace(" ", "").replace("-", "")
        query = query.filter(DetectionModel.plate.like(f"%{clean}%"))
    if camera_id:
        query = query.filter(DetectionModel.camera_code == camera_id)
    if vehicle_type:
        query = query.filter(DetectionModel.vehicle_type.ilike(vehicle_type))
        
    return query.order_by(DetectionModel.timestamp.desc()).limit(limit).all()

@router.get("/camera/{camera_code}", response_model=List[Detection])
def get_detections_by_camera(camera_code: str, db: Session = Depends(get_db)):
    return db.query(DetectionModel).filter(DetectionModel.camera_code == camera_code).order_by(DetectionModel.timestamp.desc()).all()

@router.get("/plate/{plate}", response_model=List[Detection])
def get_detections_by_plate(plate: str, db: Session = Depends(get_db)):
    clean = plate.upper().replace(" ", "").replace("-", "")
    return db.query(DetectionModel).filter(DetectionModel.plate == clean).order_by(DetectionModel.timestamp.desc()).all()

@router.post("", response_model=Detection, status_code=status.HTTP_201_CREATED)
async def create_detection(detection_payload: dict, db: Session = Depends(get_db)):
    det_data = detection_payload.get("detection", detection_payload)
    
    plate = det_data.get("plate") or det_data.get("plate_number") or "UNKNOWN"
    camera_code = detection_payload.get("cameraCode") or det_data.get("camera_code", "CAM-V01")
    camera_name = detection_payload.get("cameraName") or det_data.get("camera_name", "Live ANPR Feed")
    location = det_data.get("location", "Video Stream")
    lat = float(det_data.get("lat", 12.9716))
    lng = float(det_data.get("lng", 77.5946))
    timestamp = det_data.get("timestamp") or time.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    confidence = float(det_data.get("confidence", 98.0))
    vehicle_type = det_data.get("vehicleType") or det_data.get("vehicle_type", "Car")
    vehicle_color = det_data.get("vehicleColor") or det_data.get("vehicle_color", "White")
    speed = float(det_data.get("speed", 45.0))
    lane_number = int(det_data.get("laneNumber") or det_data.get("lane_number", 1))
    snapshot_url = det_data.get("snapshotUrl") or det_data.get("snapshot_url")
    plate_crop_url = det_data.get("plateCropUrl") or det_data.get("plate_crop_url")

    make_model = det_data.get("makeModel") or det_data.get("make_model")
    brand = det_data.get("brand") or det_data.get("make")
    model_name = det_data.get("model") or det_data.get("model_name")
    registered_owner = det_data.get("registeredOwner") or det_data.get("registered_owner")
    registered_state = det_data.get("registeredState") or det_data.get("registered_state")
    fuel_type = det_data.get("fuelType") or det_data.get("fuel_type")

    det, alert_obj = await detection_service.process_and_store_detection(
        db=db,
        plate=plate,
        camera_code=camera_code,
        camera_name=camera_name,
        location=location,
        lat=lat,
        lng=lng,
        timestamp=timestamp,
        confidence=confidence,
        vehicle_type=vehicle_type,
        vehicle_color=vehicle_color,
        make_model=make_model,
        brand=brand,
        model_name=model_name,
        speed=speed,
        lane_number=lane_number,
        registered_owner=registered_owner,
        registered_state=registered_state,
        fuel_type=fuel_type,
        snapshot_url=snapshot_url,
        plate_crop_url=plate_crop_url
    )

    return det

