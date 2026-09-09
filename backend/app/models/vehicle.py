from sqlalchemy import Column, String, Integer, Boolean, DateTime
from app.database.session import Base

class VehicleModel(Base):
    __tablename__ = "vehicles"

    id = Column(String, primary_key=True, index=True)
    plate = Column(String, unique=True, index=True, nullable=False)
    type = Column(String, default="Car")
    make_model = Column(String, default="Standard Vehicle")
    color = Column(String, default="White")
    first_seen = Column(String, nullable=True)
    last_seen = Column(String, nullable=True)
    sightings_count = Column(Integer, default=1)
    violations_count = Column(Integer, default=0)
    is_watchlisted = Column(Boolean, default=False)
    watchlist_reason = Column(String, nullable=True)
    risk_level = Column(String, default="Low")
    registered_owner = Column(String, nullable=True)
    registered_state = Column(String, nullable=True)
    fuel_type = Column(String, default="Petrol")

class WatchlistModel(Base):
    __tablename__ = "watchlist"

    id = Column(String, primary_key=True, index=True)
    plate = Column(String, index=True, nullable=False)
    vehicle_type = Column(String, default="Car")
    color = Column(String, default="White")
    reason = Column(String, nullable=False)
    priority = Column(String, default="High")
    added_date = Column(String, nullable=True)
    added_by = Column(String, default="Operator")
    notes = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    flagged_sightings = Column(Integer, default=0)
