from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.alert import AlertModel
from app.models.violation import ViolationModel
from app.schemas.alert import AlertCreate
from app.schemas.violation import ViolationCreate

class AlertService:
    @staticmethod
    def get_alerts(db: Session, limit: int = 100) -> List[AlertModel]:
        return db.query(AlertModel).limit(limit).all()

    @staticmethod
    def create_alert(db: Session, alert_in: AlertCreate) -> AlertModel:
        db_alert = AlertModel(
            id=f"alt-{int(time.time()*1000)}",
            **alert_in.model_dump()
        )
        db.add(db_alert)
        db.commit()
        db.refresh(db_alert)
        return db_alert

    @staticmethod
    def acknowledge_alert(db: Session, alert_id: str) -> Optional[AlertModel]:
        alert = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
        if alert:
            alert.status = "ACKNOWLEDGED"
            db.commit()
            db.refresh(alert)
        return alert

    @staticmethod
    def resolve_alert(db: Session, alert_id: str) -> Optional[AlertModel]:
        alert = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
        if alert:
            alert.status = "RESOLVED"
            db.commit()
            db.refresh(alert)
        return alert

    @staticmethod
    def get_violations(db: Session, limit: int = 200) -> List[ViolationModel]:
        return db.query(ViolationModel).limit(limit).all()

    @staticmethod
    def update_violation_status(db: Session, viol_id: str, status: str) -> Optional[ViolationModel]:
        viol = db.query(ViolationModel).filter(ViolationModel.id == viol_id).first()
        if viol:
            viol.status = status
            db.commit()
            db.refresh(viol)
        return viol

alert_service = AlertService()
