from sqlalchemy import Column, String, Integer, Boolean
from app.database.session import Base

class VehicleModel(Base):
    __tablename__ = "vehicles"

    id = Column(String(64), primary_key=True, index=True)
    plate = Column(String(32), unique=True, index=True, nullable=False)
    type = Column(String(64), default="Car", index=True)
    make_model = Column(String(128), default="Standard Vehicle")
    color = Column(String(64), default="White")
    first_seen = Column(String(64), nullable=True)
    last_seen = Column(String(64), nullable=True, index=True)
    sightings_count = Column(Integer, default=1)
    violations_count = Column(Integer, default=0)
    is_watchlisted = Column(Boolean, default=False, index=True)
    watchlist_reason = Column(String(255), nullable=True)
    risk_level = Column(String(32), default="Low")
    registered_owner = Column(String(128), nullable=True)
    registered_state = Column(String(64), nullable=True)
    fuel_type = Column(String(32), default="Petrol")

class WatchlistModel(Base):
    __tablename__ = "watchlist"

    id = Column(String(64), primary_key=True, index=True)
    plate = Column(String(32), index=True, nullable=False)
    vehicle_type = Column(String(64), default="Car")
    color = Column(String(64), default="White")
    reason = Column(String(255), nullable=False)
    priority = Column(String(32), default="High")
    added_date = Column(String(64), nullable=True)
    added_by = Column(String(64), default="Operator")
    notes = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    flagged_sightings = Column(Integer, default=0)
