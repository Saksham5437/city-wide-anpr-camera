from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.camera import CameraModel
from app.schemas.camera import CameraCreate, CameraUpdate

class CameraService:
    @staticmethod
    def get_all(db: Session) -> List[CameraModel]:
        return db.query(CameraModel).all()

    @staticmethod
    def get_by_code(db: Session, code: str) -> Optional[CameraModel]:
        return db.query(CameraModel).filter(
            (CameraModel.code == code) | (CameraModel.id == code)
        ).first()

    @staticmethod
    def create(db: Session, camera_in: CameraCreate) -> CameraModel:
        db_camera = CameraModel(
            id=f"cam-{camera_in.code.lower()}",
            **camera_in.model_dump()
        )
        db.add(db_camera)
        db.commit()
        db.refresh(db_camera)
        return db_camera

    @staticmethod
    def update(db: Session, code: str, camera_update: CameraUpdate) -> Optional[CameraModel]:
        camera = CameraService.get_by_code(db, code)
        if not camera:
            return None
        
        update_data = camera_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(camera, key, value)

        db.commit()
        db.refresh(camera)
        return camera

    @staticmethod
    def update_status(db: Session, code: str, status: str) -> Optional[CameraModel]:
        camera = CameraService.get_by_code(db, code)
        if camera:
            camera.status = status
            db.commit()
            db.refresh(camera)
        return camera

camera_service = CameraService()
