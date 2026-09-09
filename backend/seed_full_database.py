import time
import pymysql
from datetime import datetime
from sqlalchemy import create_engine, text
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

def seed_full_database():
    engine = create_engine(settings.DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    print("[*] Clearing and re-syncing ALL city-wide records to MySQL (city_anpr)...")

    # Clean previous records safely
    db.query(AuditLogModel).delete()
    db.query(AlertModel).delete()
    db.query(ViolationModel).delete()
    db.query(DetectionModel).delete()
    db.query(WatchlistModel).delete()
    db.query(VehicleModel).delete()
    db.query(CameraModel).delete()
    db.query(UserModel).delete()
    db.commit()

    # 1. SEED CAMERAS (Complete network of 50+ ANPR Nodes across Bengaluru)
    camera_data = [
        ("CAM-001", "Hebbal Flyover North Entry", "Hebbal Flyover North", 13.0382, 77.5975, "North", "ONLINE", "ANPR 4K Dual-Sensor", 48, "Moderate", "KA04MN9012", 18, 6420, 52.0, "Southbound"),
        ("CAM-002", "Hebbal Esteem Mall Entry", "Hebbal Bellary Rd", 13.0370, 77.5920, "North", "ONLINE", "ANPR Traffic Camera", 42, "Normal", "KA04EF1043", 12, 4780, 46.0, "Southbound"),
        ("CAM-003", "Hebbal Flyover Main Deck", "Hebbal Flyover", 13.0358, 77.5970, "North", "ONLINE", "ANPR 4K Dual-Sensor", 54, "Moderate", "KA01AB1234", 24, 7890, 48.0, "Southbound"),
        ("CAM-004", "Nagawara Junction ORR", "Nagawara Outer Ring Rd", 13.0425, 77.6200, "North", "ONLINE", "ANPR Traffic Camera", 58, "Heavy", "KA04EF1086", 16, 5200, 42.0, "Eastbound"),
        ("CAM-005", "Hennur Bande Signal", "Hennur Main Road", 13.0350, 77.6380, "North", "ONLINE", "Signal Camera", 38, "Normal", "KA04EF1129", 9, 3900, 38.0, "Northbound"),
        ("CAM-006", "Thanisandra Railway Bridge", "Thanisandra Main Rd", 13.0540, 77.6290, "North", "ONLINE", "Traffic Camera", 44, "Moderate", "KA04EF1172", 14, 4600, 44.0, "Northbound"),
        ("CAM-007", "Yelahanka Police Station Circle", "Yelahanka NES Circle", 13.0990, 77.5950, "North", "ONLINE", "Speed Radar Camera", 60, "Heavy", "KA04EF1215", 22, 6100, 58.0, "Northbound"),
        ("CAM-008", "Kogilu Cross Airport Road", "Kogilu Cross NH44", 13.1180, 77.6080, "North", "ONLINE", "ANPR 4K Dual-Sensor", 65, "Heavy", "KA04EF1258", 28, 7200, 68.0, "Northbound"),
        ("CAM-017", "Mekhri Circle Underpass North", "Mekhri Circle", 13.0075, 77.5818, "North", "ONLINE", "ANPR Traffic Camera", 62, "Heavy", "KA01AB1234", 31, 9120, 38.0, "Southbound"),
        ("CAM-018", "Sadashivanagar Bhashyam Circle", "Sadashivanagar", 13.0060, 77.5750, "North", "ONLINE", "ANPR Traffic Camera", 40, "Normal", "KA01EF1301", 11, 4100, 36.0, "Southbound"),
        ("CAM-021", "Palace Cross Road Junction", "Palace Road", 12.9912, 77.5878, "Central", "ONLINE", "Speed Camera", 42, "Heavy", "KA03HA4419", 42, 6810, 34.0, "Southbound"),
        ("CAM-022", "Malleshwaram 8th Cross", "Sampige Road", 13.0030, 77.5700, "West", "ONLINE", "Traffic Camera", 36, "Normal", "KA02EF1344", 8, 3800, 30.0, "Southbound"),
        ("CAM-023", "Malleshwaram Circle Margosa Rd", "Margosa Road", 12.9980, 77.5680, "West", "ONLINE", "Signal Camera", 45, "Moderate", "KA02EF1387", 15, 4900, 32.0, "Northbound"),
        ("CAM-041", "Cunningham Road Junction", "Cunningham Road", 12.9860, 77.5950, "Central", "ONLINE", "ANPR Traffic Camera", 49, "Heavy", "KA01AB1234", 19, 7400, 32.0, "Southbound"),
        ("CAM-042", "High Court GPO Circle", "Ambedkar Veedhi", 12.9790, 77.5910, "Central", "ONLINE", "ANPR Traffic Camera", 52, "Heavy", "KA01EF1430", 20, 8100, 28.0, "Southbound"),
        ("CAM-043", "Corporation Circle Hudson", "Hudson Circle", 12.9690, 77.5880, "Central", "ONLINE", "Signal Camera", 68, "Critical", "KA01EF1473", 35, 9400, 22.0, "Southbound"),
        ("CAM-044", "Town Hall JC Road Entry", "Town Hall Circle", 12.9640, 77.5850, "Central", "ONLINE", "ANPR Traffic Camera", 72, "Critical", "KA01EF1516", 40, 10200, 24.0, "Southbound"),
        ("CAM-061", "MG Road Anil Kumble Circle", "MG Road Central", 12.9750, 77.6050, "Central", "ONLINE", "ANPR 4K Dual-Sensor", 66, "Heavy", "KA01AB1234", 28, 9200, 35.0, "Eastbound"),
        ("CAM-064", "Trinity Circle Metro Station", "Trinity Circle", 12.9720, 77.6180, "Central", "ONLINE", "Speed Camera", 58, "Heavy", "KA01EF1559", 25, 8400, 38.0, "Eastbound"),
        ("CAM-065", "Mayo Hall Junction Residency Rd", "Residency Road", 12.9710, 77.6090, "Central", "ONLINE", "ANPR Traffic Camera", 55, "Moderate", "KA01EF1602", 18, 7600, 32.0, "Westbound"),
        ("CAM-076", "Richmond Circle Flyover West", "Richmond Circle", 12.9620, 77.5980, "Central", "ONLINE", "ANPR 4K Dual-Sensor", 74, "Critical", "KA01AB1234", 39, 11300, 26.0, "Southbound"),
        ("CAM-079", "Langford Road Double Road Junction", "Langford Town", 12.9550, 77.5990, "Central", "ONLINE", "Traffic Camera", 48, "Moderate", "KA01EF1645", 14, 6200, 34.0, "Southbound"),
        ("CAM-080", "Adugodi Police Quarters Signal", "Hosur Road Adugodi", 12.9440, 77.6080, "South", "ONLINE", "ANPR Traffic Camera", 62, "Heavy", "KA05EF1688", 29, 8900, 36.0, "Southbound"),
        ("CAM-092", "Sony World Junction Koramangala", "Sony World Signal", 12.9370, 77.6290, "South", "ONLINE", "Speed Radar Camera", 70, "Heavy", "KA01AB1234", 34, 10800, 30.0, "Southbound"),
        ("CAM-093", "Koramangala Water Tank Signal", "Koramangala 4th Block", 12.9320, 77.6320, "South", "ONLINE", "Signal Camera", 46, "Moderate", "KA05EF1731", 16, 5800, 32.0, "Southbound"),
        ("CAM-094", "Forum Mall Checkpost Junction", "Hosur Road Forum", 12.9340, 77.6120, "South", "ONLINE", "ANPR Traffic Camera", 78, "Critical", "KA05EF1774", 45, 12400, 20.0, "Southbound"),
        ("CAM-095", "Dairy Circle Flyover Entry", "Bannerghatta Rd Dairy Circle", 12.9360, 77.5980, "South", "ONLINE", "Speed Camera", 64, "Heavy", "KA05EF1817", 27, 9100, 38.0, "Southbound"),
        ("CAM-096", "Jayadeva Underpass East-West", "Jayadeva Hospital Junction", 12.9180, 77.5980, "South", "ONLINE", "ANPR 4K Dual-Sensor", 82, "Critical", "KA05EF1860", 52, 13800, 22.0, "Southbound"),
        ("CAM-104", "Madiwala Market Signal", "Madiwala Total Mall", 12.9220, 77.6190, "South", "ONLINE", "Traffic Camera", 75, "Critical", "KA05EF1903", 44, 11900, 18.0, "Southbound"),
        ("CAM-105", "HSR Layout 27th Main Signal", "HSR Layout 27th Main", 12.9110, 77.6500, "South", "ONLINE", "ANPR Traffic Camera", 60, "Heavy", "KA01AB1234", 26, 8700, 35.0, "Southbound"),
        ("CAM-106", "Sarjapur Road Agara Lake Signal", "Agara Flyover", 12.9230, 77.6510, "South", "ONLINE", "Speed Radar Camera", 68, "Heavy", "KA05EF1946", 33, 9800, 42.0, "Eastbound"),
        ("CAM-107", "Bellandur EcoSpace ORR Entry", "Bellandur ORR", 12.9270, 77.6760, "Tech Corridor", "ONLINE", "ANPR 4K Dual-Sensor", 88, "Critical", "KA01AB1234", 56, 14200, 25.0, "Eastbound"),
        ("CAM-108", "Kadubeesanahalli Bridge East", "Kadubeesanahalli ORR", 12.9360, 77.6910, "Tech Corridor", "ONLINE", "Signal Camera", 84, "Critical", "KA51EF1989", 48, 13100, 24.0, "Eastbound"),
        ("CAM-109", "Devarabeesanahalli RMZ Ecoworld", "Ecoworld Main Gate", 12.9310, 77.6840, "Tech Corridor", "ONLINE", "Traffic Camera", 72, "Heavy", "KA51EF2032", 36, 10500, 28.0, "Eastbound"),
        ("CAM-115", "Silk Board Flyover Loop", "Silk Board Junction", 12.9175, 77.6235, "South", "ONLINE", "ANPR 4K Dual-Sensor", 96, "Critical", "KA01AB1234", 68, 17500, 14.0, "Southbound"),
        ("CAM-119", "Electronic City Phase 2 Toll", "Electronic City Phase 2", 12.8390, 77.6750, "Tech Corridor", "ONLINE", "ANPR 4K Dual-Sensor", 70, "Heavy", "KA51EF2075", 30, 11200, 65.0, "Southbound"),
        ("CAM-120", "Wipro Gate 1 Electronic City", "Neeladri Road", 12.8350, 77.6550, "Tech Corridor", "ONLINE", "Traffic Camera", 54, "Moderate", "KA51EF2118", 18, 7600, 36.0, "Westbound"),
        ("CAM-131", "Old Airport Road Manipal Hospital", "Old Airport Road Domlur", 12.9590, 77.6500, "East", "ONLINE", "ANPR Traffic Camera", 62, "Heavy", "KA03EF2161", 24, 8900, 32.0, "Eastbound"),
        ("CAM-132", "HAL Helicopter Division Signal", "HAL Main Gate Old Airport Rd", 12.9550, 77.6700, "East", "ONLINE", "Speed Camera", 56, "Moderate", "KA03EF2204", 20, 7800, 45.0, "Eastbound"),
        ("CAM-143", "Tin Factory ORR Merge", "Tin Factory Interchange", 13.0030, 77.6720, "East", "ONLINE", "Signal Camera", 92, "Critical", "KA03EF2247", 61, 16200, 18.0, "Northbound"),
        ("CAM-144", "Mahadevapura Bagmane Tech Park", "Mahadevapura ORR", 12.9880, 77.6980, "Tech Corridor", "ONLINE", "ANPR Traffic Camera", 76, "Heavy", "KA03EF2290", 38, 11800, 30.0, "Northbound"),
        ("CAM-155", "Whitefield Hope Farm Junction", "Whitefield Main Road", 12.9840, 77.7490, "Tech Corridor", "ONLINE", "Traffic Camera", 59, "Heavy", "KA51MD3029", 35, 9500, 26.0, "Eastbound"),
        ("CAM-156", "ITPB Main Gate Whitefield", "ITPB International Tech Park", 12.9860, 77.7380, "Tech Corridor", "ONLINE", "ANPR 4K Dual-Sensor", 68, "Heavy", "KA51EF2333", 29, 10200, 34.0, "Eastbound"),
        ("CAM-157", "Kundalahalli Gate Signal", "Kundalahalli Gate", 12.9660, 77.7140, "Tech Corridor", "ONLINE", "Signal Camera", 74, "Critical", "KA51EF2376", 42, 11600, 22.0, "Westbound"),
        ("CAM-168", "Marathahalli Innovative Bridge", "Marathahalli ORR", 12.9560, 77.7011, "East", "ONLINE", "Speed Radar Camera", 76, "Heavy", "KA05XY7812", 49, 12100, 28.0, "Southbound"),
        ("CAM-180", "Yeshwanthpur Govardhan Signal", "Yeshwanthpur Circle", 13.0238, 77.5501, "West", "ONLINE", "Signal Camera", 65, "Heavy", "KA02KJ8934", 41, 10400, 24.0, "Northbound"),
        ("CAM-181", "Gorguntepalya Taj Vivanta Signal", "Gorguntepalya Tumkur Rd", 13.0290, 77.5380, "West", "ONLINE", "ANPR Traffic Camera", 80, "Critical", "KA02EF2419", 54, 14100, 38.0, "Northbound"),
        ("CAM-182", "Peenya 1st Stage 8th Main Signal", "Peenya Industrial Area", 13.0330, 77.5180, "West", "ONLINE", "Speed Camera", 62, "Heavy", "KA02EF2462", 30, 9400, 50.0, "Northbound"),
        ("CAM-192", "Rajajinagar 1st Block Navrang", "Rajajinagar Main Road", 12.9984, 77.5552, "West", "ONLINE", "Traffic Camera", 22, "Normal", "KA02HJ2109", 6, 2800, 35.0, "Southbound"),
        ("CAM-193", "Vijayanagar Chord Road Pipeline", "Vijayanagar Club Road", 12.9710, 77.5360, "West", "ONLINE", "Traffic Camera", 48, "Moderate", "KA02EF2505", 18, 6700, 32.0, "Southbound"),
        ("CAM-194", "Magadi Road Toll Gate Circle", "Magadi Road Toll Gate", 12.9730, 77.5490, "West", "ONLINE", "ANPR Traffic Camera", 58, "Heavy", "KA02EF2548", 26, 8800, 28.0, "Eastbound"),
        ("CAM-205", "Majestic KSR Station Signal", "Majestic Interchange", 12.9781, 77.5697, "Central", "ONLINE", "ANPR 4K Dual-Sensor", 85, "Critical", "KA41P9821", 67, 15300, 16.0, "Eastbound"),
        ("CAM-218", "Jayanagar 4th Block Complex", "Jayanagar 4th Block", 12.9299, 77.5824, "South", "ONLINE", "ANPR Traffic Camera", 36, "Normal", "KA05PQ1199", 14, 6100, 38.0, "Northbound"),
        ("CAM-230", "Banashankari Bus Terminal", "Banashankari Ring Road", 12.9155, 77.5736, "South", "ONLINE", "Signal Camera", 58, "Moderate", "KA05ZY9981", 32, 8900, 29.0, "Westbound"),
        ("CAM-248", "Domlur Flyover Inner Ring Road", "Domlur Flyover", 12.9610, 77.6387, "East", "ONLINE", "ANPR 4K Dual-Sensor", 64, "Heavy", "KA03ZA7711", 36, 10200, 41.0, "Southbound")
    ]

    for c in camera_data:
        cam_obj = CameraModel(
            id=c[0],
            code=c[0],
            name=c[1],
            location=c[2],
            lat=c[3],
            lng=c[4],
            zone=c[5],
            status=c[6],
            camera_type=c[7],
            vehicles_per_min=c[8],
            traffic_level=c[9],
            last_detected_plate=c[10],
            violations_today=c[11],
            vehicles_today=c[12],
            avg_speed=c[13],
            uptime=99.4,
            direction=c[14],
            stream_url="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800",
            resolution="4K UHD",
            fps=30,
            ip_address=f"10.24.10.{c[0].replace('CAM-','')}"
        )
        db.add(cam_obj)

    # 2. SEED VEHICLES (All website vehicles with full brands, models, colors, fuel, and owners)
    vehicles_data = [
        ("KA01AB1234", "Car", "Toyota Fortuner 4x4", "White", "08:14 AM", "10:42 AM", 12, 3, True, "High-Speed Evader & Unpaid E-Challan Warrant (#W-2026-88)", "Critical", "Rameshwaram Logistics & Holdings Pvt Ltd", "Karnataka (RTO Bengaluru Central - KA01)", "Diesel"),
        ("KA03MN4521", "Motorcycle", "Royal Enfield Classic 350", "Matte Black", "07:30 AM", "11:15 AM", 6, 1, False, None, "Medium", "Aditya Shenoy", "Karnataka (RTO Indiranagar - KA03)", "Petrol"),
        ("KA05NB7712", "Car", "Honda City ZX i-VTEC", "Silver Metallic", "06:45 AM", "09:50 AM", 5, 0, False, None, "Low", "Sunita Venkatesh", "Karnataka (RTO Jayanagar - KA05)", "Petrol"),
        ("KA04MN9012", "SUV", "Mahindra XUV700 AX7", "Midnight Blue", "08:00 AM", "10:30 AM", 8, 2, False, None, "Medium", "Kiran Hegde", "Karnataka (RTO Yeshwanthpur - KA04)", "Diesel"),
        ("KA51MD3029", "Car", "Hyundai Creta SX (O)", "Polar White", "07:15 AM", "11:00 AM", 7, 1, False, None, "Low", "Praveen Rao", "Karnataka (RTO Electronic City - KA51)", "Petrol"),
        ("KA02KJ8934", "Bus/Truck", "Tata 407 LPT Turbo", "Commercial Yellow", "05:30 AM", "08:45 AM", 4, 1, True, "Overloading & Entry in Restricted Time Window", "High", "Karnataka Logistics Express", "Karnataka (RTO Rajajinagar - KA02)", "Diesel"),
        ("KA03HA4419", "Car", "BMW 330i M Sport", "Portimao Blue", "09:00 AM", "11:20 AM", 6, 4, True, "Habitual Reckless Driving & 4x Speed Limit Exceed", "Critical", "Vikram Reddy", "Karnataka (RTO Indiranagar - KA03)", "Petrol"),
        ("KA05XY7812", "Car", "Maruti Suzuki Swift ZXi", "Fire Red", "07:00 AM", "10:10 AM", 5, 0, False, None, "Low", "Meenakshi Sundaram", "Karnataka (RTO Jayanagar - KA05)", "Petrol"),
        ("KA02HJ2109", "Auto-Rickshaw", "Bajaj Compact RE 4S", "Green-Yellow", "06:00 AM", "11:30 AM", 9, 2, False, None, "Low", "Manjunatha Swamy", "Karnataka (RTO Rajajinagar - KA02)", "CNG"),
        ("KA41P9821", "Bus/Truck", "BMTC Volvo 8400 BS-IV", "Blue-White Transit", "05:00 AM", "11:40 AM", 14, 0, False, None, "Low", "Bangalore Metropolitan Transport Corp", "Karnataka (RTO Jnanabharathi - KA41)", "Diesel"),
        ("KA05PQ1199", "Car", "Skoda Octavia L&K", "Magic Black", "08:30 AM", "10:55 AM", 4, 1, False, None, "Low", "Deepak George", "Karnataka (RTO Jayanagar - KA05)", "Petrol"),
        ("KA05ZY9981", "Motorcycle", "KTM Duke 390 ABS", "Electric Orange", "08:15 AM", "11:05 AM", 7, 3, True, "Stunt Riding Complaint & Noise Violation", "High", "Siddharth Pai", "Karnataka (RTO Jayanagar - KA05)", "Petrol"),
        ("KA03ZA7711", "Car", "Tata Nexon EV Max", "Intensi-Teal", "07:45 AM", "10:40 AM", 6, 0, False, None, "Low", "Ananya Deshmukh", "Karnataka (RTO Indiranagar - KA03)", "Electric"),
        ("DL01CA1001", "SUV", "Toyota Fortuner Legender 4x4", "Phantom Black", "09:10 AM", "11:25 AM", 9, 4, True, "Inter-State Smuggling Warrant #DEL-2026-991", "Critical", "Inter-State Trans-Freight Syndicate", "Delhi (RTO Mall Road - DL01)", "Diesel"),
        ("MH02BG9988", "Car", "Mercedes-Benz E-Class E350d", "Obsidian Black", "08:20 AM", "10:15 AM", 5, 2, True, "Fraudulent Stolen Registration Flagged by Mumbai Police", "Critical", "Apex Global Trading", "Maharashtra (RTO Andheri - MH02)", "Diesel"),
        ("KA01MJ4421", "Car", "Hyundai Creta SX", "Polar White", "06:30 AM", "11:10 AM", 18, 2, False, None, "Low", "Rajesh Kumar", "Karnataka (RTO Bangalore Central - KA01)", "Diesel")
    ]

    for v in vehicles_data:
        veh_obj = VehicleModel(
            id=f"veh-{v[0]}",
            plate=v[0],
            type=v[1],
            make_model=v[2],
            color=v[3],
            first_seen=v[4],
            last_seen=v[5],
            sightings_count=v[6],
            violations_count=v[7],
            is_watchlisted=v[8],
            watchlist_reason=v[9],
            risk_level=v[10],
            registered_owner=v[11],
            registered_state=v[12],
            fuel_type=v[13]
        )
        db.add(veh_obj)

    # 3. SEED WATCHLIST
    watchlist_seeds = [
        ("wl-001", "KA01AB1234", "Car", "White", "High-Speed Evader & Unpaid E-Challan Warrant (#W-2026-88)", "Critical", "2026-08-15", "TMC Dispatch Officer", "Vehicle consistently exceeds 110 km/h on Outer Ring Road corridors.", 12),
        ("wl-002", "DL01CA1001", "SUV", "Black", "Inter-State Smuggling Warrant #DEL-2026-991", "Critical", "2026-08-20", "Intelligence Bureau Liaison", "Wanted in cross-border consignment interception. Armed escort advised.", 9),
        ("wl-003", "MH02BG9988", "Car", "Black", "Fraudulent Stolen Registration Flagged by Mumbai Police", "Critical", "2026-08-22", "BTP Interceptor Desk", "Reported stolen from Bandra Kurla Complex.", 5),
        ("wl-004", "KA03HA4419", "Car", "Portimao Blue", "Habitual Reckless Driving & 4x Speed Limit Exceed", "High", "2026-08-24", "Traffic Sub-Inspector", "Dangerous lane switches recorded on Airport Expressway.", 6),
        ("wl-005", "KA05ZY9981", "Motorcycle", "Electric Orange", "Stunt Riding Complaint & Noise Violation", "High", "2026-08-26", "Jayanagar Traffic Unit", "Loud aftermarket exhaust, multiple pedestrian complaints.", 7)
    ]
    for w in watchlist_seeds:
        wl_obj = WatchlistModel(
            id=w[0],
            plate=w[1],
            vehicle_type=w[2],
            color=w[3],
            reason=w[4],
            priority=w[5],
            added_date=w[6],
            added_by=w[7],
            notes=w[8],
            is_active=True,
            flagged_sightings=w[9]
        )
        db.add(wl_obj)

    # 4. SEED PERMANENT DETECTIONS (Flagship Vehicle Multi-Camera Trajectory & City-Wide ANPR Records)
    flagship_detections = [
        ("det-001", "veh-KA01AB1234", "KA01AB1234", "CAM-001", "Hebbal Flyover North Entry", "Hebbal Flyover North", 13.0382, 77.5975, "2026-09-09T08:14:22.000Z", "Southbound", 68.4, 98.4, "Car", "White", 1, None),
        ("det-002", "veh-KA01AB1234", "KA01AB1234", "CAM-003", "Hebbal Flyover Main Deck", "Hebbal Flyover", 13.0358, 77.5970, "2026-09-09T08:16:05.000Z", "Southbound", 74.2, 99.1, "Car", "White", 2, None),
        ("det-003", "veh-KA01AB1234", "KA01AB1234", "CAM-017", "Mekhri Circle Underpass North", "Mekhri Circle", 13.0075, 77.5818, "2026-09-09T08:26:40.000Z", "Southbound", 88.5, 97.8, "Car", "White", 1, "viol-001"),
        ("det-004", "veh-KA01AB1234", "KA01AB1234", "CAM-041", "Cunningham Road Junction", "Cunningham Road", 12.9860, 77.5950, "2026-09-09T08:41:15.000Z", "Southbound", 44.0, 98.9, "Car", "White", 2, None),
        ("det-005", "veh-KA01AB1234", "KA01AB1234", "CAM-061", "MG Road Anil Kumble Circle", "MG Road Central", 12.9750, 77.6050, "2026-09-09T08:58:30.000Z", "Eastbound", 36.2, 99.4, "Car", "White", 1, None),
        ("det-006", "veh-KA01AB1234", "KA01AB1234", "CAM-076", "Richmond Circle Flyover West", "Richmond Circle", 12.9620, 77.5980, "2026-09-09T09:18:10.000Z", "Southbound", 52.0, 98.2, "Car", "White", 2, None),
        ("det-007", "veh-KA01AB1234", "KA01AB1234", "CAM-092", "Sony World Junction Koramangala", "Sony World Signal", 12.9370, 77.6290, "2026-09-09T09:42:55.000Z", "Southbound", 91.0, 99.2, "Car", "White", 1, "viol-002"),
        ("det-008", "veh-KA01AB1234", "KA01AB1234", "CAM-105", "HSR Layout 27th Main Signal", "HSR Layout 27th Main", 12.9110, 77.6500, "2026-09-09T10:06:20.000Z", "Southbound", 48.6, 98.0, "Car", "White", 2, None),
        ("det-009", "veh-KA01AB1234", "KA01AB1234", "CAM-107", "Bellandur EcoSpace ORR Entry", "Bellandur ORR", 12.9270, 77.6760, "2026-09-09T10:24:45.000Z", "Eastbound", 64.0, 97.6, "Car", "White", 3, None),
        ("det-010", "veh-KA01AB1234", "KA01AB1234", "CAM-115", "Silk Board Flyover Loop", "Silk Board Junction", 12.9175, 77.6235, "2026-09-09T10:42:10.000Z", "Southbound", 32.0, 99.5, "Car", "White", 1, None),
        
        # Additional Detections across Bangalore
        ("det-011", "veh-DL01CA1001", "DL01CA1001", "CAM-008", "Kogilu Cross Airport Road", "Kogilu Cross NH44", 13.1180, 77.6080, "2026-09-09T09:10:00.000Z", "Inbound City", 86.4, 99.2, "SUV", "Black", 1, "viol-003"),
        ("det-012", "veh-MH02BG9988", "MH02BG9988", "CAM-181", "Gorguntepalya Taj Vivanta Signal", "Gorguntepalya Tumkur Rd", 13.0290, 77.5380, "2026-09-09T08:20:00.000Z", "Inbound", 52.4, 98.5, "Car", "Black", 2, None),
        ("det-013", "veh-KA03HA4419", "KA03HA4419", "CAM-021", "Palace Cross Road Junction", "Palace Road", 12.9912, 77.5878, "2026-09-09T09:00:00.000Z", "Southbound", 84.0, 99.0, "Car", "Blue", 1, "viol-004"),
        ("det-014", "veh-KA05ZY9981", "KA05ZY9981", "CAM-218", "Jayanagar 4th Block Complex", "Jayanagar 4th Block", 12.9299, 77.5824, "2026-09-09T08:15:00.000Z", "Northbound", 58.0, 97.4, "Motorcycle", "Orange", 1, None)
    ]

    for d in flagship_detections:
        det_obj = DetectionModel(
            id=d[0],
            vehicle_id=d[1],
            plate=d[2],
            camera_code=d[3],
            camera_name=d[4],
            location=d[5],
            lat=d[6],
            lng=d[7],
            timestamp=d[8],
            direction=d[9],
            speed=d[10],
            confidence=d[11],
            vehicle_type=d[12],
            vehicle_color=d[13],
            lane_number=d[14],
            violation_id=d[15]
        )
        db.add(det_obj)

    # 5. SEED VIOLATIONS
    violations_seeds = [
        ("viol-001", "KA01AB1234", "Speed Violation", "CAM-017", "Mekhri Circle Underpass North", "2026-09-09T08:26:40.000Z", 88.5, 60.0, 2000.0, "PENDING", "ECH-2026-8801"),
        ("viol-002", "KA01AB1234", "Overspeeding Radar (>80 km/h)", "CAM-092", "Sony World Junction Koramangala", "2026-09-09T09:42:55.000Z", 91.0, 60.0, 3000.0, "PENDING", "ECH-2026-8802"),
        ("viol-003", "DL01CA1001", "High-Speed Highway Violation", "CAM-008", "Kogilu Cross Airport Road", "2026-09-09T09:10:00.000Z", 86.4, 60.0, 2000.0, "PENDING", "ECH-2026-8803"),
        ("viol-004", "KA03HA4419", "City Center Reckless Speeding", "CAM-021", "Palace Cross Road Junction", "2026-09-09T09:00:00.000Z", 84.0, 50.0, 2500.0, "PENDING", "ECH-2026-8804")
    ]
    for v in violations_seeds:
        viol_obj = ViolationModel(
            id=v[0],
            plate=v[1],
            type=v[2],
            camera_code=v[3],
            location=v[4],
            timestamp=v[5],
            speed_recorded=v[6],
            speed_limit=v[7],
            fine_amount=v[8],
            status=v[9],
            challan_id=v[10]
        )
        db.add(viol_obj)

    # 6. SEED ALERTS
    alerts_seeds = [
        ("alt-001", "det-007", "WATCHLIST CRITICAL MATCH: KA01AB1234", "Critical", "WATCHLIST", "KA01AB1234", "CAM-092", "Sony World Junction Koramangala", "2026-09-09T09:42:55.000Z", "Watchlisted White Toyota Fortuner detected speeding at 91.0 km/h past Sony World Signal.", "ACTIVE", "Dispatch South Traffic Interceptor Team 4 immediately."),
        ("alt-002", "det-011", "INTER-STATE FUGITIVE ALERT: DL01CA1001", "Critical", "WATCHLIST", "DL01CA1001", "CAM-008", "Kogilu Cross Airport Road", "2026-09-09T09:10:00.000Z", "Flagged Black Fortuner Legender entered Bangalore North inbound moving towards Hebbal.", "ACTIVE", "Alert Yelahanka and Hebbal checkpoints for tactical blockade."),
        ("alt-003", "det-012", "STOLEN VEHICLE IDENTIFIED: MH02BG9988", "Critical", "STOLEN", "MH02BG9988", "CAM-181", "Gorguntepalya Taj Vivanta Signal", "2026-09-09T08:20:00.000Z", "Stolen Mercedes-Benz E350d recognized on Tumkur Road entrance.", "ACTIVE", "Inform Tumkur Road Highway Patrol Unit.")
    ]
    for a in alerts_seeds:
        alert_obj = AlertModel(
            id=a[0],
            detection_id=a[1],
            title=a[2],
            type=a[3],
            category=a[4],
            vehicle_plate=a[5],
            camera_code=a[6],
            location=a[7],
            timestamp=a[8],
            description=a[9],
            status=a[10],
            action_required=a[11]
        )
        db.add(alert_obj)

    # 7. SEED USERS
    user_obj = UserModel(
        id="usr-01",
        name="Officer Saksham",
        badge_number="BTP-CMD-4092",
        role="Command Supervisor",
        department="Bangalore Traffic Police Command & Control (TMC)",
        shift="Surveillance Desk 24/7",
        avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
    )
    db.add(user_obj)

    db.commit()
    print(f"[+] SEED SUCCESSFUL! Total Cameras: {len(camera_data)}, Vehicles: {len(vehicles_data)}, Detections: {len(flagship_detections)}, Alerts: {len(alerts_seeds)}")

if __name__ == "__main__":
    seed_full_database()
