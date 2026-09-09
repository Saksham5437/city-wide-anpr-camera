from sqlalchemy import Column, String, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base
from datetime import datetime

class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    action = Column(String(64), nullable=False, index=True)  # LOGIN, LOGOUT, VEHICLE_UPDATE, CAMERA_UPDATE, ALERT_RESOLVE
    entity_type = Column(String(64), nullable=True, index=True)  # vehicle, camera, alert, user
    entity_id = Column(String(64), nullable=True, index=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("UserModel", backref="audit_logs")
