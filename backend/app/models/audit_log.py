from sqlalchemy import Column, String, JSON, DateTime, text
from app.database.session import Base
from datetime import datetime

class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=True)
    action = Column(String, nullable=False, index=True)  # LOGIN, LOGOUT, VEHICLE_UPDATE, CAMERA_UPDATE, ALERT_RESOLVE, etc.
    entity_type = Column(String, nullable=True, index=True)  # vehicle, camera, alert, user
    entity_id = Column(String, nullable=True, index=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
