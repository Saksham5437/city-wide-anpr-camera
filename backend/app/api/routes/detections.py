import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.detection import DetectionModel
from app.schemas.detection import Detection, DetectionCreate
from app.core.websocket import manager

router = APIRouter(prefix="/detections", tags=["detections"])

@router.get("", response_model=List[Detection])
def get_detections(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(DetectionModel).order_by(DetectionModel.timestamp.desc()).limit(limit).all()

@router.get("/camera/{camera_code}", response_model=List[Detection])
def get_detections_by_camera(camera_code: str, db: Session = Depends(get_db)):
    return db.query(DetectionModel).filter(DetectionModel.camera_code == camera_code).all()

@router.get("/plate/{plate}", response_model=List[Detection])
def get_detections_by_plate(plate: str, db: Session = Depends(get_db)):
    clean = plate.upper().replace(" ", "").replace("-", "")
    return db.query(DetectionModel).filter(DetectionModel.plate == clean).all()

@router.post("", response_model=Detection, status_code=status.HTTP_201_CREATED)
async def create_detection(detection_payload: dict, db: Session = Depends(get_db)):
    det_data = detection_payload.get("detection", detection_payload)
    
    clean_plate = (det_data.get("plate") or "UNKNOWN").upper().replace(" ", "").replace("-", "")
    db_det = DetectionModel(
        id=f"det-{int(time.time()*1000)}",
        vehicle_id=f"veh-{clean_plate}",
        plate=clean_plate,
        camera_code=detection_payload.get("cameraCode") or det_data.get("camera_code", "CAM-V01"),
        camera_name=detection_payload.get("cameraName") or det_data.get("camera_name", "Live ANPR Feed"),
        location=det_data.get("location", "Video Stream"),
        lat=det_data.get("lat", 12.9716),
        lng=det_data.get("lng", 77.5946),
        timestamp=det_data.get("timestamp") or time.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        direction=det_data.get("direction", "Inbound"),
        speed=det_data.get("speed", 45.0),
        confidence=det_data.get("confidence", 98.0),
        vehicle_type=det_data.get("vehicleType") or det_data.get("vehicle_type", "Car"),
        vehicle_color=det_data.get("vehicleColor") or det_data.get("vehicle_color", "White"),
        lane_number=det_data.get("laneNumber") or det_data.get("lane_number", 1),
        snapshot_url=det_data.get("snapshotUrl") or det_data.get("snapshot_url")
    )
    db.add(db_det)
    db.commit()
    db.refresh(db_det)

    # Broadcast over WebSockets to live dashboard listeners
    await manager.broadcast("DETECTION", {
        "id": db_det.id,
        "plate": db_det.plate,
        "cameraCode": db_det.camera_code,
        "speed": db_det.speed,
        "vehicleType": db_det.vehicle_type,
        "timestamp": db_det.timestamp
    })

    return db_det
