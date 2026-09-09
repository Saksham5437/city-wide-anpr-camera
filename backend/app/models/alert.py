from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base

class AlertModel(Base):
    __tablename__ = "alerts"

    id = Column(String(64), primary_key=True, index=True)
    detection_id = Column(String(64), ForeignKey("detections.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(128), nullable=False)
    type = Column(String(32), default="Critical", index=True)
    category = Column(String(32), default="WATCHLIST", index=True)
    vehicle_plate = Column(String(32), nullable=True, index=True)
    camera_code = Column(String(64), nullable=True, index=True)
    location = Column(String(255), nullable=False)
    timestamp = Column(String(64), nullable=False, index=True)
    description = Column(String(512), nullable=False)
    status = Column(String(32), default="ACTIVE", index=True)
    action_required = Column(String(255), nullable=True)

    detection = relationship("DetectionModel", backref="alerts")
