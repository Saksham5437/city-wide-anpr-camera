from sqlalchemy import Column, String, Float, ForeignKey
from app.database.session import Base

class ViolationModel(Base):
    __tablename__ = "violations"

    id = Column(String(64), primary_key=True, index=True)
    plate = Column(String(32), index=True, nullable=False)
    type = Column(String(64), nullable=False, index=True)
    camera_code = Column(String(64), index=True, nullable=False)
    location = Column(String(255), nullable=False)
    timestamp = Column(String(64), nullable=False, index=True)
    speed_recorded = Column(Float, nullable=True)
    speed_limit = Column(Float, nullable=True)
    fine_amount = Column(Float, default=1000.0)
    status = Column(String(32), default="PENDING", index=True)
    evidence_image_url = Column(String(512), nullable=True)
    challan_id = Column(String(64), unique=True, index=True, nullable=True)
