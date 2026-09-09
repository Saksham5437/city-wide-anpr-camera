from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.session import Base
from datetime import datetime

class VehiclePassageModel(Base):
    __tablename__ = "vehicle_passages"

    id = Column(String(64), primary_key=True, index=True)
    video_id = Column(String(64), ForeignKey("videos.id", ondelete="CASCADE"), nullable=True, index=True)
    track_id = Column(Integer, nullable=False, index=True)
    camera_code = Column(String(64), ForeignKey("cameras.code", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_id = Column(String(64), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # License Plate Intelligence
    plate_number = Column(String(32), nullable=False, index=True)
    plate_country = Column(String(64), default="UNKNOWN", index=True)
    plate_format = Column(String(64), default="Universal Alphanumeric")
    recognition_status = Column(String(32), default="RECOGNIZED", index=True)  # RECOGNIZED, UNCERTAIN, UNREADABLE
    
    # Systematic 3-Tier Classification
    compliance_status = Column(String(32), default="COMPLIANT", index=True)  # COMPLIANT, VIOLATION, REVIEW_REQUIRED
    
    # Vehicle Attributes
    vehicle_type = Column(String(64), default="Car", index=True)
    vehicle_color = Column(String(64), default="Unknown")
    make = Column(String(64), default="Unknown")
    model = Column(String(64), default="Unknown")
    
    # Spatio-Temporal Metrics
    first_seen_timestamp = Column(String(64), nullable=False, index=True)
    last_seen_timestamp = Column(String(64), nullable=False)
    duration_seconds = Column(Float, default=0.0)
    avg_speed = Column(Float, default=45.0)
    max_speed = Column(Float, default=45.0)
    direction = Column(String(64), default="Inbound")
    lane_number = Column(Integer, default=1)
    
    # Multi-Confidence Metrics
    vehicle_confidence = Column(Float, default=95.0)
    plate_confidence = Column(Float, default=90.0)
    ocr_confidence = Column(Float, default=90.0)
    final_confidence = Column(Float, default=92.0)
    
    # Visual Evidence
    best_vehicle_image_path = Column(String(512), nullable=True)
    best_plate_image_path = Column(String(512), nullable=True)
    raw_ocr_observations = Column(JSON, nullable=True)  # Full temporal OCR candidates list
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    video = relationship("VideoModel", backref="passages")
    vehicle = relationship("VehicleModel", backref="passages")
    camera = relationship("CameraModel", backref="passages")

    # Composite Indexes for high performance multi-criteria querying
    __table_args__ = (
        Index("ix_passages_video_track", "video_id", "track_id"),
        Index("ix_passages_plate_time", "plate_number", "first_seen_timestamp"),
        Index("ix_passages_compliance", "compliance_status", "created_at"),
        Index("ix_passages_cam_time", "camera_code", "first_seen_timestamp"),
    )
