from sqlalchemy import Column, String
from app.database.session import Base

class AlertModel(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    type = Column(String, default="Critical")
    category = Column(String, default="WATCHLIST")
    vehicle_plate = Column(String, nullable=True)
    camera_code = Column(String, nullable=True)
    location = Column(String, nullable=False)
    timestamp = Column(String, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, default="ACTIVE")
    action_required = Column(String, nullable=True)
