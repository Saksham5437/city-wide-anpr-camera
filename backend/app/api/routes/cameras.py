from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.camera import Camera, CameraCreate, CameraUpdate
from app.services.camera.camera_service import camera_service

router = APIRouter(prefix="/cameras", tags=["cameras"])

@router.get("", response_model=List[Camera])
def get_cameras(db: Session = Depends(get_db)):
    return camera_service.get_all(db)

@router.get("/{camera_code}", response_model=Camera)
def get_camera(camera_code: str, db: Session = Depends(get_db)):
    cam = camera_service.get_by_code(db, camera_code)
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    return cam

@router.post("", response_model=Camera, status_code=status.HTTP_201_CREATED)
def create_camera(camera_in: CameraCreate, db: Session = Depends(get_db)):
    return camera_service.create(db, camera_in)

@router.put("/{camera_code}", response_model=Camera)
def update_camera(camera_code: str, camera_in: CameraUpdate, db: Session = Depends(get_db)):
    cam = camera_service.update(db, camera_code, camera_in)
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    return cam

@router.put("/{camera_code}/status", response_model=Camera)
def update_camera_status(camera_code: str, status_payload: dict, db: Session = Depends(get_db)):
    status_val = status_payload.get("status", "ONLINE")
    cam = camera_service.update_status(db, camera_code, status_val)
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    return cam
