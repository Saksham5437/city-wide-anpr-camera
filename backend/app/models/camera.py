from sqlalchemy import Column, String, Float, Integer, JSON
from app.database.session import Base

class CameraModel(Base):
    __tablename__ = "cameras"

    id = Column(String, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    zone = Column(String, nullable=False)
    status = Column(String, default="ONLINE")
    camera_type = Column(String, default="ANPR Traffic Camera")
    ai_modules = Column(JSON, nullable=True)
    vehicles_per_min = Column(Integer, default=40)
    traffic_level = Column(String, default="Normal")
    last_detected_plate = Column(String, nullable=True)
    violations_today = Column(Integer, default=0)
    vehicles_today = Column(Integer, default=0)
    avg_speed = Column(Float, default=35.0)
    uptime = Column(Float, default=99.5)
    direction = Column(String, default="Northbound")
    stream_url = Column(String, nullable=True)
    resolution = Column(String, default="1080p")
    fps = Column(Integer, default=30)
    ip_address = Column(String, default="192.168.1.100")
    install_date = Column(String, nullable=True)
