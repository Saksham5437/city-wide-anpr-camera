import os
import cv2
import numpy as np
import asyncio
from app.database.session import engine, Base, SessionLocal
from app.models.video import VideoModel
from app.models.passage import VehiclePassageModel
from app.models.detection import DetectionModel
from app.models.vehicle import VehicleModel
from app.models.violation import ViolationModel
from app.models.camera import CameraModel
from app.services.anpr.video_processor import video_processor
from app.core.config import settings

async def test_pipeline():
    print("==================================================================")
    print("   TESTING ADVANCED MULTI-OBJECT TRACKING, ANPR & VIOLATIONS     ")
    print("==================================================================")

    # Ensure tables exist in MySQL
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Create a synthetic 5-second test video with OpenCV
    test_video_dir = os.path.join(settings.STORAGE_PATH, "videos")
    os.makedirs(test_video_dir, exist_ok=True)
    test_video_path = os.path.join(test_video_dir, "traffic_camera_sample.mp4")

    print("[*] Generating test traffic-camera video (5 seconds, 1080p, 30 fps)...")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(test_video_path, fourcc, 30.0, (1920, 1080))

    # Draw moving vehicles with license plates
    for f in range(90):  # 3 seconds of video
        frame = np.zeros((1080, 1920, 3), dtype=np.uint8)
        # Background road lanes
        cv2.rectangle(frame, (200, 0), (1720, 1080), (45, 45, 48), -1)
        cv2.line(frame, (700, 0), (700, 1080), (255, 255, 255), 4)
        cv2.line(frame, (1220, 0), (1220, 1080), (255, 255, 255), 4)

        # Vehicle 1: White Toyota Fortuner (Speeding)
        y1 = int(100 + f * 10.5)
        cv2.rectangle(frame, (350, y1), (620, y1 + 220), (240, 240, 245), -1)
        cv2.rectangle(frame, (420, y1 + 170), (550, y1 + 210), (255, 255, 255), -1)
        cv2.putText(frame, "KA01AB1234", (430, y1 + 198), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)

        # Vehicle 2: Black SUV (International Plate - California 7XYZ890)
        y2 = int(50 + f * 6.5)
        cv2.rectangle(frame, (800, y2), (1050, y2 + 200), (25, 25, 30), -1)
        cv2.rectangle(frame, (860, y2 + 155), (990, y2 + 195), (255, 255, 255), -1)
        cv2.putText(frame, "7XYZ890", (875, y2 + 185), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)

        out.write(frame)

    out.release()
    print(f"[+] Video created: {test_video_path}")

    # Register video job
    video_id = "vid-test-sample-01"
    existing = db.query(VideoModel).filter(VideoModel.id == video_id).first()
    if existing:
        db.delete(existing)
        db.commit()

    video_record = VideoModel(
        id=video_id,
        filename="traffic_camera_sample.mp4",
        file_path=test_video_path,
        file_size_bytes=os.path.getsize(test_video_path),
        camera_code="CAM-001",
        location="MG Road & Brigade Rd Junction",
        status="QUEUED"
    )
    db.add(video_record)
    db.commit()

    print("[*] Launching async Video Processor Service...")
    await video_processor.process_video_job_async(video_id)

    # Verify results in MySQL
    db.refresh(video_record)
    print(f"\n==================================================================")
    print(f"[*] Video Job Status:        {video_record.status}")
    print(f"[*] Total Tracked Passages:  {video_record.total_vehicles}")
    print(f"[*] Plates Recognized:       {video_record.plates_recognized}")
    print(f"[*] Compliant Vehicles:      {video_record.compliant_vehicles}")
    print(f"[*] Violating Vehicles:      {video_record.violating_vehicles}")
    print(f"[*] Review Required:         {video_record.review_required}")
    print(f"[*] Total Violations:        {video_record.total_violations}")
    print(f"==================================================================")

    passages = db.query(VehiclePassageModel).filter(VehiclePassageModel.video_id == video_id).all()
    print(f"\n[+] Stored Vehicle Passages in MySQL ({len(passages)}):")
    for p in passages:
        print(f"  -> Track #{p.track_id} | Plate: {p.plate_number:<12} | Country: {p.plate_country:<18} | Compliance: {p.compliance_status:<15} | Speed: {p.max_speed} km/h")

    db.close()

if __name__ == "__main__":
    asyncio.run(test_pipeline())
