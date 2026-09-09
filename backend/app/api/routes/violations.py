from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.violation import Violation, ViolationCreate
from app.services.alerts.alert_service import alert_service

router = APIRouter(prefix="/violations", tags=["violations"])

@router.get("", response_model=List[Violation])
def get_violations(limit: int = 200, db: Session = Depends(get_db)):
    return alert_service.get_violations(db, limit)

@router.put("/{violation_id}/status", response_model=Violation)
def update_violation_status(violation_id: str, status_payload: dict, db: Session = Depends(get_db)):
    status = status_payload.get("status", "Confirmed")
    viol = alert_service.update_violation_status(db, violation_id, status)
    if not viol:
        raise HTTPException(status_code=404, detail="Violation not found")
    return viol
