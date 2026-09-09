from sqlalchemy import Column, String, Float, Integer, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.session import Base

class DetectionModel(Base):
    __tablename__ = "detections"

    id = Column(String(64), primary_key=True, index=True)
    vehicle_id = Column(String(64), ForeignKey("vehicles.id", ondelete="CASCADE"), index=True, nullable=False)
    plate = Column(String(32), index=True, nullable=False)
    camera_code = Column(String(64), ForeignKey("cameras.code", ondelete="CASCADE"), index=True, nullable=False)
    camera_name = Column(String(128), nullable=False)
    location = Column(String(255), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    timestamp = Column(String(64), index=True, nullable=False)
    direction = Column(String(64), default="Inbound")
    speed = Column(Float, default=45.0)
    confidence = Column(Float, default=98.0, index=True)
    vehicle_type = Column(String(64), default="Car", index=True)
    vehicle_color = Column(String(64), default="White")
    lane_number = Column(Integer, default=1)
    bbox_vehicle = Column(JSON, nullable=True)
    bbox_plate = Column(JSON, nullable=True)
    violation_id = Column(String(64), nullable=True)
    re_id_score = Column(Float, default=95.0)
    snapshot_url = Column(String(512), nullable=True)
    plate_crop_url = Column(String(512), nullable=True)

    # Relationships visible in Workbench / ORM
    vehicle = relationship("VehicleModel", backref="detections")
    camera = relationship("CameraModel", backref="detections")

    # Composite Indexes for high-speed city-wide ANPR querying
    __table_args__ = (
        Index("ix_detections_cam_time", "camera_code", "timestamp"),
        Index("ix_detections_plate_time", "plate", "timestamp"),
        Index("ix_detections_veh_time", "vehicle_id", "timestamp"),
    )
