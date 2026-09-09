from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.alert import Alert, AlertCreate
from app.services.alerts.alert_service import alert_service

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("", response_model=List[Alert])
def get_alerts(limit: int = 100, db: Session = Depends(get_db)):
    return alert_service.get_alerts(db, limit)

@router.put("/{alert_id}/acknowledge", response_model=Alert)
def acknowledge_alert(alert_id: str, db: Session = Depends(get_db)):
    alert = alert_service.acknowledge_alert(db, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

@router.put("/{alert_id}/resolve", response_model=Alert)
def resolve_alert(alert_id: str, db: Session = Depends(get_db)):
    alert = alert_service.resolve_alert(db, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
