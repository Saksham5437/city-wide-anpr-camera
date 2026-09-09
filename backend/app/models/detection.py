from sqlalchemy import Column, String, Float, Integer, JSON
from app.database.session import Base

class DetectionModel(Base):
    __tablename__ = "detections"

    id = Column(String, primary_key=True, index=True)
    vehicle_id = Column(String, index=True, nullable=False)
    plate = Column(String, index=True, nullable=False)
    camera_code = Column(String, index=True, nullable=False)
    camera_name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    timestamp = Column(String, nullable=False)
    direction = Column(String, default="Inbound")
    speed = Column(Float, default=45.0)
    confidence = Column(Float, default=98.0)
    vehicle_type = Column(String, default="Car")
    vehicle_color = Column(String, default="White")
    lane_number = Column(Integer, default=1)
    bbox_vehicle = Column(JSON, nullable=True)
    bbox_plate = Column(JSON, nullable=True)
    violation_id = Column(String, nullable=True)
    re_id_score = Column(Float, default=95.0)
    snapshot_url = Column(String, nullable=True)
    plate_crop_url = Column(String, nullable=True)
