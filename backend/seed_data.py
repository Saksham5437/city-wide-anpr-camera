import time
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.session import Base
from app.models.camera import CameraModel
from app.models.vehicle import VehicleModel, WatchlistModel
from app.models.detection import DetectionModel
from app.models.violation import ViolationModel
from app.models.alert import AlertModel
from app.models.user import UserModel
from app.models.audit_log import AuditLogModel
from app.core.config import settings

def seed():
    engine = create_engine(settings.DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Check if already seeded
    if db.query(CameraModel).count() > 0:
        print("[*] Database already contains records.")
        return

    print("[*] Seeding database with initial cameras, vehicles, detections, and alerts...")

    # 1. Cameras
    cameras = [
        CameraModel(
            id="CAM-001",
            code="CAM-001",
            name="MG Road Junction North",
            location="MG Road & Brigade Rd Junction",
            lat=12.9756,
            lng=77.6066,
            zone="Central Zone",
            status="ONLINE",
            camera_type="ANPR 4K Dual-Sensor",
            vehicles_per_min=54,
            traffic_level="Heavy",
            last_detected_plate="KA01MJ4421",
            violations_today=6,
            vehicles_today=4820,
            avg_speed=34.2,
            uptime=99.8,
            direction="Northbound",
            stream_url="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800",
            resolution="4K UHD (3840x2160)",
            fps=30,
            ip_address="10.24.1.101"
        ),
        CameraModel(
            id="CAM-002",
            code="CAM-002",
            name="Silk Board Flyover Ramp",
            location="Hosur Road & Outer Ring Rd",
            lat=12.9177,
            lng=77.6238,
            zone="South Zone",
            status="ONLINE",
            camera_type="High-Speed ANPR Radar",
            vehicles_per_min=68,
            traffic_level="Severe",
            last_detected_plate="KA05NB7712",
            violations_today=14,
            vehicles_today=6920,
            avg_speed=18.5,
            uptime=99.1,
            direction="Southbound",
            stream_url="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800",
            resolution="1080p Full HD",
            fps=60,
            ip_address="10.24.1.102"
        ),
        CameraModel(
            id="CAM-003",
            code="CAM-003",
            name="Hebbal Flyover Inbound",
            location="Bellary Road & Outer Ring Rd",
            lat=13.0358,
            lng=77.5970,
            zone="North Zone",
            status="ONLINE",
            camera_type="Speed Enforcement ANPR",
            vehicles_per_min=62,
            traffic_level="Moderate",
            last_detected_plate="DL01CA1001",
            violations_today=9,
            vehicles_today=5410,
            avg_speed=58.2,
            uptime=99.9,
            direction="Inbound City",
            stream_url="https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800",
            resolution="4K UHD (3840x2160)",
            fps=60,
            ip_address="10.24.1.103"
        )
    ]
    for c in cameras:
        db.add(c)

    # 2. Vehicles
    vehicles = [
        VehicleModel(
            id="veh-KA01MJ4421",
            plate="KA01MJ4421",
            type="Car",
            make_model="Hyundai Creta SX (White)",
            color="White",
            first_seen="2026-08-28T06:30:00.000Z",
            last_seen="2026-09-09T17:11:00.000Z",
            sightings_count=18,
            violations_count=2,
            is_watchlisted=False,
            risk_level="Low",
            registered_owner="Rajesh Kumar",
            registered_state="Karnataka",
            fuel_type="Diesel"
        ),
        VehicleModel(
            id="veh-DL01CA1001",
            plate="DL01CA1001",
            type="SUV",
            make_model="Toyota Fortuner 4x4 (Black)",
            color="Black",
            first_seen="2026-08-25T11:20:00.000Z",
            last_seen="2026-09-09T16:45:00.000Z",
            sightings_count=31,
            violations_count=4,
            is_watchlisted=True,
            watchlist_reason="Flagged in Inter-State Investigation / High Priority",
            risk_level="Critical",
            registered_owner="State Case Ref #8821",
            registered_state="Delhi",
            fuel_type="Diesel"
        )
    ]
    for v in vehicles:
        db.add(v)

    # 3. Watchlist
    wl = WatchlistModel(
        id="wl-001",
        plate="DL01CA1001",
        vehicle_type="SUV",
        color="Black",
        reason="Flagged in Inter-State Investigation / High Priority",
        priority="Critical",
        added_date="2026-08-25",
        added_by="TMC Command Inspector",
        notes="Intercept with caution. Inform TMC HQ immediately upon detection.",
        is_active=True,
        flagged_sightings=31
    )
    db.add(wl)

    # 4. Permanent Detections
    detections = [
        DetectionModel(
            id="det-1001",
            vehicle_id="veh-KA01MJ4421",
            plate="KA01MJ4421",
            camera_code="CAM-001",
            camera_name="MG Road Junction North",
            location="MG Road & Brigade Rd Junction",
            lat=12.9756,
            lng=77.6066,
            timestamp="2026-09-09T17:11:00.000Z",
            direction="Inbound",
            speed=42.5,
            confidence=98.6,
            vehicle_type="Car",
            vehicle_color="White",
            lane_number=2
        ),
        DetectionModel(
            id="det-1002",
            vehicle_id="veh-DL01CA1001",
            plate="DL01CA1001",
            camera_code="CAM-003",
            camera_name="Hebbal Flyover Inbound",
            location="Bellary Road & Outer Ring Rd",
            lat=13.0358,
            lng=77.5970,
            timestamp="2026-09-09T16:45:00.000Z",
            direction="Inbound City",
            speed=84.2,
            confidence=99.2,
            vehicle_type="SUV",
            vehicle_color="Black",
            lane_number=1,
            violation_id="viol-001"
        )
    ]
    for d in detections:
        db.add(d)

    # 5. Alert
    alert = AlertModel(
        id="alt-001",
        title="WATCHLIST VEHICLE DETECTED",
        type="Critical",
        category="WATCHLIST",
        vehicle_plate="DL01CA1001",
        camera_code="CAM-003",
        location="Hebbal Flyover Inbound",
        timestamp="2026-09-09T16:45:00.000Z",
        description="High-priority watchlisted SUV (DL01CA1001) recognized at Hebbal Flyover moving Inbound.",
        status="ACTIVE",
        action_required="Dispatch North Traffic Interceptor Unit immediately."
    )
    db.add(alert)

    # 6. User
    user = UserModel(
        id="usr-01",
        name="Officer Saksham",
        badge_number="BTP-CMD-4092",
        role="Command Supervisor",
        department="Bangalore Traffic Police Command & Control (TMC)",
        shift="Surveillance Desk 24/7",
        avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
    )
    db.add(user)

    db.commit()
    print("[+] Successfully seeded database with initial records.")

if __name__ == "__main__":
    seed()
