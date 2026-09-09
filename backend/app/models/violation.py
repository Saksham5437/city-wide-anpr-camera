from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from app.database.session import Base
from datetime import datetime

class ViolationModel(Base):
    __tablename__ = "violations"

    id = Column(String(64), primary_key=True, index=True)
    passage_id = Column(String(64), ForeignKey("vehicle_passages.id", ondelete="SET NULL"), nullable=True, index=True)
    vehicle_id = Column(String(64), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True, index=True)
    plate = Column(String(32), index=True, nullable=False)
    type = Column(String(64), nullable=False, index=True)  # Speeding, Red Light, Stop Line, Wrong-Way, Illegal Lane, No Helmet
    severity = Column(String(32), default="MEDIUM", index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    confidence = Column(Float, default=95.0)
    camera_code = Column(String(64), ForeignKey("cameras.code", ondelete="CASCADE"), nullable=False, index=True)
    location = Column(String(255), nullable=False)
    timestamp = Column(String(64), nullable=False, index=True)
    speed_recorded = Column(Float, nullable=True)
    speed_limit = Column(Float, nullable=True)
    fine_amount = Column(Float, default=1000.0)
    description = Column(String(512), nullable=True)
    status = Column(String(32), default="PENDING", index=True)  # PENDING, VERIFIED, DISMISSED, PAID
    evidence_image_url = Column(String(512), nullable=True)
    evidence_scene_url = Column(String(512), nullable=True)
    challan_id = Column(String(64), unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    passage = relationship("VehiclePassageModel", backref="violations")
    vehicle = relationship("VehicleModel", backref="violations")
    camera = relationship("CameraModel", backref="violations")

    __table_args__ = (
        Index("ix_violations_type_time", "type", "timestamp"),
        Index("ix_violations_severity", "severity", "status"),
    )
