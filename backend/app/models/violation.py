from sqlalchemy import Column, String, Float, Integer
from app.database.session import Base

class ViolationModel(Base):
    __tablename__ = "violations"

    id = Column(String, primary_key=True, index=True)
    challan_number = Column(String, unique=True, index=True, nullable=False)
    vehicle_id = Column(String, index=True, nullable=False)
    plate = Column(String, index=True, nullable=False)
    camera_code = Column(String, index=True, nullable=False)
    location = Column(String, nullable=False)
    timestamp = Column(String, nullable=False)
    violation_type = Column(String, nullable=False)
    speed_limit = Column(Integer, nullable=True)
    recorded_speed = Column(Float, nullable=True)
    fine_amount = Column(Integer, default=1000)
    confidence = Column(Float, default=95.0)
    status = Column(String, default="New")
    evidence_image = Column(String, nullable=True)
    vehicle_type = Column(String, default="Car")
    vehicle_color = Column(String, default="White")
    notes = Column(String, nullable=True)
    adjudicated_by = Column(String, nullable=True)
    adjudicated_at = Column(String, nullable=True)
    rejection_reason = Column(String, nullable=True)
