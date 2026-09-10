import os
import cv2
import time
import math
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.video import VideoModel
from app.models.passage import VehiclePassageModel
from app.models.vehicle import VehicleModel, WatchlistModel
from app.models.detection import DetectionModel
from app.models.violation import ViolationModel
from app.models.alert import AlertModel
from app.models.camera import CameraModel
from app.services.anpr.detector import VehicleDetector
from app.services.anpr.tracker import MultiObjectTracker, TrackedVehicle
from app.services.anpr.plate_detector import LicensePlateDetector
from app.services.anpr.ocr import PlateOCR
from app.services.anpr.temporal_fusion import temporal_fusion
from app.services.anpr.attribute_detector import attribute_detector
from app.services.anpr.violation_detector import violation_engine
from app.core.config import settings
from app.core.websocket import manager

class VideoProcessorService:
    def __init__(self):
        self.vehicle_detector = VehicleDetector()
        self.plate_detector = LicensePlateDetector()
        self.ocr_engine = PlateOCR()

    async def process_video_job_async(self, video_id: str):
        """Background worker executing systematic video-level ANPR and passage tracking."""
        db: Session = SessionLocal()
        try:
            video = db.query(VideoModel).filter(VideoModel.id == video_id).first()
            if not video:
                return

            video.status = "PROCESSING"
            video.processing_start = datetime.utcnow()
            db.commit()

            cap = cv2.VideoCapture(video.file_path)
            if not cap.isOpened():
                video.status = "FAILED"
                video.error_message = "Could not open video stream with OpenCV."
                db.commit()
                return

            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 100
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1920
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1080
            duration = total_frames / fps if fps > 0 else 10.0

            video.fps = round(fps, 2)
            video.frame_count = total_frames
            video.resolution = f"{width}x{height}"
            video.duration_seconds = round(duration, 2)
            db.commit()

            tracker = MultiObjectTracker(iou_threshold=0.3, max_missing_frames=20)
            
            # Frame sampling step (process every 2nd or 3rd frame for speed while tracker preserves identity)
            sample_step = max(1, int(settings.SPEED_LIMIT_THRESHOLD / 40))  # adaptive sampling
            frame_idx = 0
            processed_count = 0

            storage_dir = settings.STORAGE_PATH
            vehicles_dir = os.path.join(storage_dir, "vehicles")
            plates_dir = os.path.join(storage_dir, "plates")
            os.makedirs(vehicles_dir, exist_ok=True)
            os.makedirs(plates_dir, exist_ok=True)

            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                frame_idx += 1
                if frame_idx % sample_step != 0:
                    continue

                processed_count += 1
                timestamp_sec = frame_idx / fps

                # 1. Detect vehicles in actual frame
                raw_dets = self.vehicle_detector.detect_vehicles(frame)

                # 2. Multi-Object Tracking association
                active_tracks = tracker.process_frame_detections(raw_dets, frame_idx, timestamp_sec)

                # 3. For each active vehicle track, detect plate and perform real OCR
                for track in active_tracks:
                    bx1, by1, bx2, by2 = [int(c) for c in track.current_bbox]
                    bx1, by1 = max(0, bx1), max(0, by1)
                    bx2, by2 = min(width, bx2), min(height, by2)
                    
                    if bx2 > bx1 and by2 > by1:
                        veh_crop = frame[by1:by2, bx1:bx2]
                        if track.color == "Unknown":
                            track.color = attribute_detector.detect_color_from_crop(veh_crop)

                        # Plate localization within track crop
                        plates = self.plate_detector.locate_plates(veh_crop, [float(bx1), float(by1), float(bx2), float(by2)])
                        if plates:
                            p_box = plates[0]["bbox"]
                            px1, py1, px2, py2 = [int(c) for c in p_box]
                            px1, py1 = max(0, px1), max(0, py1)
                            px2, py2 = min(width, px2), min(height, py2)

                            if px2 > px1 and py2 > py1:
                                p_crop = frame[py1:py2, px1:px2]
                                ocr_res = self.ocr_engine.recognize_plate_text(p_crop)
                                raw_txt = ocr_res.get("raw_text") or ocr_res.get("plate")
                                if raw_txt and raw_txt != "UNREADABLE":
                                    track.ocr_candidates.append({
                                        "raw_text": raw_txt,
                                        "confidence": ocr_res.get("ocr_confidence", 80.0),
                                        "quality": 0.90,
                                        "frame_idx": frame_idx,
                                        "timestamp_sec": timestamp_sec
                                    })

                # Broadcast live processing progress via WebSocket every 15 frames
                if frame_idx % 15 == 0:
                    prog = min(99.0, round((frame_idx / total_frames) * 100.0, 1))
                    video.progress_percentage = prog
                    video.processed_frames = frame_idx
                    db.commit()

                    await manager.broadcast("VIDEO_PROGRESS", {
                        "video_id": video_id,
                        "filename": video.filename,
                        "status": "PROCESSING",
                        "progress_percentage": prog,
                        "processed_frames": frame_idx,
                        "total_frames": total_frames,
                        "active_vehicles": len(active_tracks)
                    })

            cap.release()

            # 4. Finalize all tracked passages
            completed_passages: List[TrackedVehicle] = tracker.finalize()

            total_vehs = len(completed_passages)
            plates_rec = 0
            plates_unread = 0
            compliant_cnt = 0
            viol_cnt = 0
            review_cnt = 0
            total_viols = 0

            for passage in completed_passages:
                # Temporal OCR Fusion
                fused = temporal_fusion.fuse_observations(passage.ocr_candidates)
                plate_str = fused["plate_number"]
                rec_status = fused["recognition_status"]
                country = fused["plate_country"]
                fmt_name = fused["plate_format"]
                final_conf = fused["final_plate_confidence"]

                if rec_status == "RECOGNIZED" and plate_str not in ["UNREADABLE", "UNKNOWN"]:
                    plates_rec += 1
                else:
                    plates_unread += 1

                # Make/Model Inference
                attrs = attribute_detector.infer_make_model(passage.vehicle_type, passage.color, plate_str)
                make = attrs["make"]
                model = attrs["model"]

                # Spatio-Temporal Metrics
                avg_speed = sum(passage.speeds_kmh) / len(passage.speeds_kmh) if passage.speeds_kmh else 45.0
                max_speed = max(passage.speeds_kmh) if passage.speeds_kmh else 45.0
                duration_sec = max(0.5, passage.last_seen_sec - passage.first_seen_sec)
                
                start_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
                end_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")

                # Violation Intelligence Evaluation
                compliance_status, detected_violations = violation_engine.evaluate_passage(
                    vehicle_type=passage.vehicle_type,
                    plate_number=plate_str,
                    avg_speed=avg_speed,
                    max_speed=max_speed,
                    trajectory=passage.trajectory,
                    recognition_status=rec_status,
                    speed_limit=60.0
                )

                if compliance_status == "COMPLIANT":
                    compliant_cnt += 1
                elif compliance_status == "VIOLATION":
                    viol_cnt += 1
                else:
                    review_cnt += 1

                # 5. Persist Vehicle Passage in MySQL
                passage_id = f"pas-{video_id[:8]}-{passage.track_id}"
                
                # Vehicle Table Lookup / Auto-Registration
                db_veh = None
                if plate_str not in ["UNREADABLE", "UNKNOWN"]:
                    db_veh = db.query(VehicleModel).filter(VehicleModel.plate == plate_str).first()
                    if not db_veh:
                        db_veh = VehicleModel(
                            id=f"veh-{plate_str}",
                            plate=plate_str,
                            type=passage.vehicle_type,
                            make_model=f"{make} {model}" if make != "Unknown" else f"{passage.vehicle_type} ({passage.color})",
                            color=passage.color,
                            first_seen=start_iso,
                            last_seen=end_iso,
                            sightings_count=1,
                            violations_count=len(detected_violations),
                            is_watchlisted=False,
                            risk_level="Critical" if detected_violations else "Low"
                        )
                        db.add(db_veh)
                        db.flush()
                    else:
                        db_veh.last_seen = end_iso
                        db_veh.sightings_count = (db_veh.sightings_count or 1) + 1
                        db_veh.violations_count = (db_veh.violations_count or 0) + len(detected_violations)

                # Ensure Camera exists for FK
                cam_code = video.camera_code or "CAM-V01"
                cam = db.query(CameraModel).filter(CameraModel.code == cam_code).first()
                if not cam:
                    cam = CameraModel(
                        id=cam_code,
                        code=cam_code,
                        name="Video ANPR Node",
                        location=video.location or "Video Feed",
                        lat=12.9716,
                        lng=77.5946,
                        zone="Active Video Analysis",
                        status="ONLINE",
                        camera_type="ANPR Video Stream"
                    )
                    db.add(cam)
                    db.flush()

                passage_record = VehiclePassageModel(
                    id=passage_id,
                    video_id=video_id,
                    track_id=passage.track_id,
                    camera_code=cam_code,
                    vehicle_id=db_veh.id if db_veh else None,
                    plate_number=plate_str,
                    plate_country=country,
                    plate_format=fmt_name,
                    recognition_status=rec_status,
                    compliance_status=compliance_status,
                    vehicle_type=passage.vehicle_type,
                    vehicle_color=passage.color,
                    make=make,
                    model=model,
                    first_seen_timestamp=start_iso,
                    last_seen_timestamp=end_iso,
                    duration_seconds=round(duration_sec, 2),
                    avg_speed=round(avg_speed, 1),
                    max_speed=round(max_speed, 1),
                    direction=passage.direction,
                    lane_number=passage.lane_number,
                    vehicle_confidence=round(passage.vehicle_confidence * 100, 1) if passage.vehicle_confidence <= 1.0 else passage.vehicle_confidence,
                    plate_confidence=92.0 if rec_status == "RECOGNIZED" else 40.0,
                    ocr_confidence=round(fused["ocr_confidence"], 1),
                    final_confidence=round(final_conf, 1),
                    raw_ocr_observations=fused["raw_observations"]
                )
                db.add(passage_record)

                # Create permanent Detection record in MySQL
                det_id = f"det-v-{video_id[:6]}-{passage.track_id}"
                det_record = DetectionModel(
                    id=det_id,
                    vehicle_id=db_veh.id if db_veh else f"veh-anon-{passage.track_id}",
                    plate=plate_str,
                    camera_code=cam_code,
                    camera_name=cam.name,
                    location=cam.location,
                    lat=cam.lat,
                    lng=cam.lng,
                    timestamp=start_iso,
                    direction=passage.direction,
                    speed=round(max_speed, 1),
                    confidence=round(final_conf, 1),
                    vehicle_type=passage.vehicle_type,
                    vehicle_color=passage.color,
                    lane_number=passage.lane_number
                )
                db.add(det_record)

                # Store Violations
                for idx, v in enumerate(detected_violations):
                    total_viols += 1
                    viol_id = f"viol-v-{video_id[:6]}-{passage.track_id}-{idx+1}"
                    viol_record = ViolationModel(
                        id=viol_id,
                        passage_id=passage_id,
                        vehicle_id=db_veh.id if db_veh else None,
                        plate=plate_str,
                        type=v["type"],
                        severity=v["severity"],
                        confidence=v.get("confidence", 95.0),
                        camera_code=cam_code,
                        location=cam.location,
                        timestamp=start_iso,
                        speed_recorded=v.get("speed_recorded"),
                        speed_limit=v.get("speed_limit"),
                        fine_amount=v.get("fine_amount", 1000.0),
                        description=v.get("description"),
                        status="PENDING",
                        challan_id=f"ECH-V-{int(time.time())}-{passage.track_id}"
                    )
                    db.add(viol_record)

                # Watchlist Alert Check
                if db_veh and plate_str not in ["UNREADABLE", "UNKNOWN"]:
                    wl = db.query(WatchlistModel).filter(WatchlistModel.plate == plate_str, WatchlistModel.is_active == True).first()
                    if wl:
                        db_veh.is_watchlisted = True
                        db_veh.risk_level = "Critical"
                        alt_record = AlertModel(
                            id=f"alt-v-{int(time.time()*1000)}-{passage.track_id}",
                            detection_id=det_id,
                            title=f"WATCHLIST DETECTED IN VIDEO: {plate_str}",
                            type="Critical",
                            category="WATCHLIST",
                            vehicle_plate=plate_str,
                            camera_code=cam_code,
                            location=cam.location,
                            timestamp=start_iso,
                            description=f"Watchlisted {passage.color} {passage.vehicle_type} ({plate_str}) identified in video feed {video.filename}. Reason: {wl.reason}",
                            status="ACTIVE",
                            action_required="Dispatch intercept unit."
                        )
                        db.add(alt_record)

            # 6. Complete Video Model Status & Summary
            video.status = "COMPLETED"
            video.progress_percentage = 100.0
            video.processed_frames = total_frames
            video.total_vehicles = total_vehs
            video.unique_vehicles = plates_rec + plates_unread
            video.plates_recognized = plates_rec
            video.plates_unreadable = plates_unread
            video.compliant_vehicles = compliant_cnt
            video.violating_vehicles = viol_cnt
            video.review_required = review_cnt
            video.total_violations = total_viols
            video.processing_end = datetime.utcnow()
            
            db.commit()

            # 7. Final WebSocket Notification
            await manager.broadcast("VIDEO_COMPLETED", {
                "video_id": video_id,
                "filename": video.filename,
                "status": "COMPLETED",
                "total_vehicles": total_vehs,
                "plates_recognized": plates_rec,
                "plates_unreadable": plates_unread,
                "compliant_vehicles": compliant_cnt,
                "violating_vehicles": viol_cnt,
                "review_required": review_cnt,
                "total_violations": total_viols
            })

        except Exception as e:
            if db:
                video = db.query(VideoModel).filter(VideoModel.id == video_id).first()
                if video:
                    video.status = "FAILED"
                    video.error_message = str(e)
                    db.commit()
            print(f"[X] Video processing failed for {video_id}: {e}")
        finally:
            db.close()

video_processor = VideoProcessorService()
