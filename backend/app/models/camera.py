from sqlalchemy import Column, String, Float, Integer, JSON
from app.database.session import Base

class CameraModel(Base):
    __tablename__ = "cameras"

    id = Column(String(64), primary_key=True, index=True)
    code = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    location = Column(String(255), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    zone = Column(String(64), nullable=False)
    status = Column(String(32), default="ONLINE", index=True)
    camera_type = Column(String(64), default="ANPR Traffic Camera")
    ai_modules = Column(JSON, nullable=True)
    vehicles_per_min = Column(Integer, default=40)
    traffic_level = Column(String(32), default="Normal")
    last_detected_plate = Column(String(32), nullable=True)
    violations_today = Column(Integer, default=0)
    vehicles_today = Column(Integer, default=0)
    avg_speed = Column(Float, default=35.0)
    uptime = Column(Float, default=99.5)
    direction = Column(String(64), default="Northbound")
    stream_url = Column(String(512), nullable=True)
    resolution = Column(String(64), default="1080p")
    fps = Column(Integer, default=30)
    ip_address = Column(String(64), default="192.168.1.100")
    install_date = Column(String(64), nullable=True)
