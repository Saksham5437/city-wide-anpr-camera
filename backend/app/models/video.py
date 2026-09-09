from sqlalchemy import Column, String, Integer, Float, DateTime, JSON
from app.database.session import Base
from datetime import datetime

class VideoModel(Base):
    __tablename__ = "videos"

    id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    duration_seconds = Column(Float, default=0.0)
    fps = Column(Float, default=30.0)
    resolution = Column(String(64), default="1080p")
    frame_count = Column(Integer, default=0)
    codec = Column(String(32), default="H.264")
    camera_code = Column(String(64), nullable=True, index=True)
    location = Column(String(255), nullable=True)
    status = Column(String(32), default="QUEUED", index=True)  # QUEUED, PROCESSING, COMPLETED, FAILED, CANCELLED
    progress_percentage = Column(Float, default=0.0)
    processed_frames = Column(Integer, default=0)
    
    # Aggregated processing metrics
    total_vehicles = Column(Integer, default=0)
    unique_vehicles = Column(Integer, default=0)
    plates_recognized = Column(Integer, default=0)
    plates_unreadable = Column(Integer, default=0)
    compliant_vehicles = Column(Integer, default=0)
    violating_vehicles = Column(Integer, default=0)
    review_required = Column(Integer, default=0)
    total_violations = Column(Integer, default=0)
    
    processing_start = Column(DateTime, nullable=True)
    processing_end = Column(DateTime, nullable=True)
    error_message = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
