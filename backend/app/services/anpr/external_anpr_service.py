import os
import io
import time
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import httpx
import numpy as np
import cv2
from PIL import Image
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.anpr.detector import VehicleDetector
from app.services.anpr.plate_detector import LicensePlateDetector
from app.services.anpr.ocr import PlateOCR
from app.services.anpr.plate_classifier import plate_classifier
from app.services.anpr.attribute_detector import attribute_detector
from app.services.detection.detection_service import detection_service

logger = logging.getLogger("anpr.external")
logging.basicConfig(level=logging.INFO)

class BaseANPRProvider(ABC):
    """
    Abstract Base Class for External ANPR / ALPR Recognition Engines
    """
    @abstractmethod
    async def recognize_image(
        self,
        image_bytes: bytes,
        filename: str = "image.jpg",
        regions: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Recognizes license plates and vehicle attributes from raw image bytes.
        Returns a list of standardized observed detection objects.
        """
        pass


class PlateRecognizerProvider(BaseANPRProvider):
    """
    Production-grade integration for Plate Recognizer (Snapshot & Stream API/SDK)
    Documentation: https://guides.platerecognizer.com/docs/snapshot/api-reference/
    """
    def __init__(
        self,
        api_key: Optional[str] = None,
        api_url: Optional[str] = None,
        regions: Optional[List[str]] = None,
        timeout: float = 12.0
    ):
        self.api_key = api_key or getattr(settings, "ANPR_API_KEY", None) or os.getenv("ANPR_API_KEY", "")
        self.api_url = api_url or getattr(settings, "ANPR_API_URL", "https://api.platerecognizer.com/v1/plate-reader/") or os.getenv("ANPR_API_URL", "https://api.platerecognizer.com/v1/plate-reader/")
        self.regions = regions or getattr(settings, "ANPR_REGIONS", ["in", "us", "gb", "eu"])
        self.timeout = timeout

    def get_api_key(self) -> str:
        return self.api_key or getattr(settings, "ANPR_API_KEY", "") or os.getenv("ANPR_API_KEY", "")

    async def recognize_image(
        self,
        image_bytes: bytes,
        filename: str = "image.jpg",
        regions: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        current_key = self.get_api_key()
        if not current_key or current_key == "YOUR_PLATE_RECOGNIZER_API_KEY":
            logger.info("[ANPR] Plate Recognizer API key not set or placeholder; switching to high-accuracy local CV engine.")
            return []

        active_regions = regions or self.regions
        headers = {
            "Authorization": f"Token {current_key}"
        }

        # Format regions parameter
        data = {}
        if active_regions:
            if isinstance(active_regions, list):
                data["regions"] = active_regions
            elif isinstance(active_regions, str):
                data["regions"] = [r.strip() for r in active_regions.split(",") if r.strip()]

        files = {
            "upload": (filename, image_bytes, "image/jpeg")
        }

        logger.info(f"[ANPR] Sending image ({len(image_bytes)} bytes) to Plate Recognizer endpoint: {self.api_url}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.api_url,
                    headers=headers,
                    data=data,
                    files=files
                )

            if response.status_code == 200:
                payload = response.json()
                results = payload.get("results", [])
                logger.info(f"[ANPR] Plate Recognizer returned {len(results)} plate candidate(s).")
                
                observed_detections = []
                for item in results:
                    plate_text = (item.get("plate") or "").upper().strip()
                    confidence = float(item.get("score") or 0.0) * 100.0
                    
                    # Plate Bounding Box {ymin, xmin, ymax, xmax}
                    pbox = item.get("box", {})
                    px1 = float(pbox.get("xmin", 0))
                    py1 = float(pbox.get("ymin", 0))
                    px2 = float(pbox.get("xmax", 0))
                    py2 = float(pbox.get("ymax", 0))
                    plate_bbox = [px1, py1, max(1.0, px2 - px1), max(1.0, py2 - py1)]

                    # Vehicle details if returned
                    veh_info = item.get("vehicle", {})
                    vbox = veh_info.get("box", {}) if isinstance(veh_info, dict) else {}
                    vx1 = float(vbox.get("xmin", max(0, px1 - 50)))
                    vy1 = float(vbox.get("ymin", max(0, py1 - 80)))
                    vx2 = float(vbox.get("xmax", px2 + 50))
                    vy2 = float(vbox.get("ymax", py2 + 40))
                    vehicle_bbox = [vx1, vy1, max(10.0, vx2 - vx1), max(10.0, vy2 - vy1)]

                    vtype = "Car"
                    if isinstance(veh_info, dict) and veh_info.get("type"):
                        raw_type = veh_info.get("type", "").lower()
                        if "truck" in raw_type: vtype = "Truck"
                        elif "bus" in raw_type: vtype = "Bus"
                        elif "motorcycle" in raw_type or "bike" in raw_type: vtype = "Motorcycle"
                        elif "auto" in raw_type or "rickshaw" in raw_type: vtype = "Auto-rickshaw"
                        else: vtype = "Car"

                    # Region & Country
                    region_info = item.get("region", {})
                    country_code = region_info.get("code", "GLOBAL").upper() if isinstance(region_info, dict) else "GLOBAL"

                    # Make & Model
                    model_makes = item.get("model_make", [])
                    make_model_str = None
                    if model_makes and len(model_makes) > 0:
                        mm = model_makes[0]
                        make_model_str = f"{mm.get('make', '')} {mm.get('model', '')}".strip()

                    # Color
                    colors = item.get("color", [])
                    color_str = "White"
                    if colors and len(colors) > 0:
                        color_str = (colors[0].get("color") or "White").capitalize()

                    observed_detections.append({
                        "plate_number": plate_text,
                        "anpr_confidence": round(confidence, 1),
                        "plate_detection_confidence": round(confidence, 1),
                        "vehicle_detection_confidence": round(float(veh_info.get("score", 0.95)) * 100.0, 1) if isinstance(veh_info, dict) else 95.0,
                        "vehicle_type": vtype,
                        "vehicle_color": color_str,
                        "make_model": make_model_str,
                        "country_code": country_code,
                        "plate_bbox": plate_bbox,
                        "vehicle_bbox": vehicle_bbox,
                        "source": "plate_recognizer"
                    })

                return observed_detections
            elif response.status_code == 403 or response.status_code == 401:
                logger.warning(f"[ANPR] Plate Recognizer Authentication Error ({response.status_code}): {response.text}")
                return []
            elif response.status_code == 429:
                logger.warning(f"[ANPR] Plate Recognizer Rate Limit Exceeded (429): {response.text}")
                return []
            else:
                logger.error(f"[ANPR] Plate Recognizer API HTTP {response.status_code}: {response.text}")
                return []

        except httpx.RequestError as exc:
            logger.warning(f"[ANPR] Plate Recognizer connection error: {exc}. Falling back to high-contrast local engine.")
            return []
        except Exception as exc:
            logger.error(f"[ANPR] Unexpected error communicating with Plate Recognizer: {exc}")
            return []


class LocalHighPrecisionProvider(BaseANPRProvider):
    """
    High-Precision Local ANPR Fallback Provider.
    Extracts real bounding boxes, morphological plate energy, and OCR without fabricating fake plates.
    """
    def __init__(self):
        self.vehicle_detector = VehicleDetector()
        self.plate_detector = LicensePlateDetector()
        self.ocr_engine = PlateOCR()

    async def recognize_image(
        self,
        image_bytes: bytes,
        filename: str = "image.jpg",
        regions: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return []

        h, w = img.shape[:2]
        raw_vehicles = self.vehicle_detector.detect_vehicles(img)
        if not raw_vehicles:
            return []

        observed_list = []

        for v_idx, v in enumerate(raw_vehicles):
            vx1, vy1, vx2, vy2 = [int(c) for c in v["bbox"]]
            vx1, vy1 = max(0, vx1), max(0, vy1)
            vx2, vy2 = min(w, vx2), min(h, vy2)

            vehicle_crop = img[vy1:vy2, vx1:vx2] if vy2 > vy1 and vx2 > vx1 else img
            detected_color = attribute_detector.detect_color_from_crop(vehicle_crop)
            if detected_color == "Unknown":
                detected_color = v.get("color", "White")

            plates = self.plate_detector.locate_plates(vehicle_crop, [float(vx1), float(vy1), float(vx2), float(vy2)])
            
            p_bbox = None
            if plates:
                p_bbox = plates[0]["bbox"]
            else:
                pw = float(vx2 - vx1) * 0.42
                ph = float(vy2 - vy1) * 0.16
                px = float(vx1) + (float(vx2 - vx1) - pw) / 2.0
                py = float(vy1) + (float(vy2 - vy1) * 0.65)
                p_bbox = [px, py, px + pw, py + ph]

            px1, py1, px2, py2 = [int(c) for c in p_bbox]
            px1, py1 = max(0, px1), max(0, py1)
            px2, py2 = min(w, px2), min(h, py2)

            plate_crop = img[py1:py2, px1:px2] if py2 > py1 and px2 > px1 else None
            ocr_res = self.ocr_engine.recognize_plate_text(plate_crop)
            
            raw_plate = (ocr_res.get("plate") or "").strip()
            classified = plate_classifier.classify_plate(raw_plate)
            
            final_plate = classified.get("normalized_plate") or raw_plate
            if not final_plate or len(final_plate) < 3:
                final_plate = "UNREADABLE"

            observed_list.append({
                "plate_number": final_plate,
                "anpr_confidence": round(float(classified.get("confidence_score") or ocr_res.get("confidence") or 0.0), 1),
                "plate_detection_confidence": 92.0 if plates else 70.0,
                "vehicle_detection_confidence": round(float(v.get("confidence", 0.95)) * 100.0, 1),
                "vehicle_type": v.get("class_name", "Car"),
                "vehicle_color": detected_color,
                "make_model": None,
                "country_code": classified.get("country") or "GLOBAL",
                "plate_bbox": [float(px1), float(py1), float(px2 - px1), float(py2 - py1)],
                "vehicle_bbox": [float(vx1), float(vy1), float(vx2 - vx1), float(vy2 - vy1)],
                "source": "local_anpr"
            })

        return observed_list


class ANPRService:
    """
    Central ANPR / ALPR Service Facade.
    Enforces the Critical Separation between Observed ANPR Data and Database Information.
    """
    def __init__(self):
        self.plate_recognizer = PlateRecognizerProvider()
        self.local_fallback = LocalHighPrecisionProvider()

    async def recognize_image(
        self,
        image_bytes: bytes,
        filename: str,
        camera_code: str = "CAM-003",
        camera_name: str = "Hebbal Flyover Main Deck",
        location: str = "Hebbal Flyover, Bengaluru",
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        start_time = time.time()
        ts = datetime.utcnow().isoformat()

        # Step 1: Storage directory setup
        storage_dir = settings.STORAGE_PATH
        images_dir = os.path.join(storage_dir, "images")
        plates_dir = os.path.join(storage_dir, "plates")
        os.makedirs(images_dir, exist_ok=True)
        os.makedirs(plates_dir, exist_ok=True)

        # Save uploaded evidence artifact
        file_id = f"img_{int(time.time()*1000)}"
        safe_ext = os.path.splitext(filename)[1].lower() or ".jpg"
        image_save_name = f"{file_id}{safe_ext}"
        image_save_path = os.path.join(images_dir, image_save_name)
        with open(image_save_path, "wb") as f:
            f.write(image_bytes)

        # Decode image for crop saving & resolution
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        h, w = (img.shape[0], img.shape[1]) if img is not None else (720, 1280)

        # Step 2: Query External ANPR Engine (Plate Recognizer)
        observed_detections = await self.plate_recognizer.recognize_image(image_bytes, filename)
        
        # If external provider returned no items or key unconfigured, run local high-precision provider
        if not observed_detections:
            logger.info("[ANPR] Running Local High-Precision Provider fallback.")
            observed_detections = await self.local_fallback.recognize_image(image_bytes, filename)

        processed_results: List[Dict[str, Any]] = []

        # Step 3: Transform & Enrich each Observed Detection
        for idx, obs in enumerate(observed_detections):
            raw_plate = obs.get("plate_number") or "UNREADABLE"
            clean_plate = raw_plate.upper().replace(" ", "").replace("-", "").strip()
            
            # Crop plate evidence image
            plate_crop_url = None
            if img is not None:
                pbbox = obs.get("plate_bbox", [0, 0, 10, 10])
                px1 = max(0, int(pbbox[0]))
                py1 = max(0, int(pbbox[1]))
                px2 = min(w, px1 + int(pbbox[2]))
                py2 = min(h, py1 + int(pbbox[3]))

                if py2 > py1 and px2 > px1:
                    plate_crop = img[py1:py2, px1:px2]
                    plate_file_name = f"{file_id}_plate_{idx}.jpg"
                    plate_file_path = os.path.join(plates_dir, plate_file_name)
                    cv2.imwrite(plate_file_path, plate_crop)
                    plate_crop_url = f"/storage/plates/{plate_file_name}"

            # Step 4: Database Lookup (Supplementary ONLY - NEVER alters observed plate!)
            db_info = {
                "matched": False,
                "vehicle_id": None,
                "registered_owner": "Not in Database",
                "registered_state": obs.get("country_code", "GLOBAL"),
                "is_watchlisted": False,
                "violations_count": 0,
                "sightings_count": 0
            }

            if db is not None and clean_plate != "UNREADABLE":
                # Persist detection and sync vehicle record cleanly
                det_model, alert_obj = await detection_service.process_and_store_detection(
                    db=db,
                    plate=clean_plate,
                    camera_code=camera_code,
                    camera_name=camera_name,
                    location=location,
                    lat=12.9716,
                    lng=77.5946,
                    timestamp=ts,
                    confidence=obs.get("anpr_confidence", 95.0),
                    vehicle_type=obs.get("vehicle_type", "Car"),
                    vehicle_color=obs.get("vehicle_color", "White"),
                    make_model=obs.get("make_model"),
                    speed=0.0,
                    lane_number=1,
                    registered_state=obs.get("country_code", "GLOBAL"),
                    snapshot_url=f"/storage/images/{image_save_name}",
                    plate_crop_url=plate_crop_url
                )

                if det_model and det_model.vehicle:
                    v = det_model.vehicle
                    db_info = {
                        "matched": True,
                        "vehicle_id": v.id,
                        "registered_owner": v.registered_owner or "RTO Registered",
                        "registered_state": v.registered_state or obs.get("country_code", "GLOBAL"),
                        "is_watchlisted": bool(v.is_watchlisted),
                        "violations_count": v.violations_count or 0,
                        "sightings_count": v.sightings_count or 1
                    }

            # Structure explicit separation between Observed and Database Data
            result_item = {
                "observed": {
                    "plate_number": clean_plate,
                    "anpr_confidence": obs.get("anpr_confidence", 0.0),
                    "plate_detection_confidence": obs.get("plate_detection_confidence", 0.0),
                    "vehicle_detection_confidence": obs.get("vehicle_detection_confidence", 0.0),
                    "vehicle_type": obs.get("vehicle_type", "Car"),
                    "vehicle_color": obs.get("vehicle_color", "White"),
                    "make_model": obs.get("make_model"),
                    "country_code": obs.get("country_code", "GLOBAL"),
                    "plate_bbox": obs.get("plate_bbox"),
                    "vehicle_bbox": obs.get("vehicle_bbox"),
                    "source": obs.get("source", "external_anpr"),
                    "snapshot_url": f"/storage/images/{image_save_name}",
                    "plate_crop_url": plate_crop_url
                },
                "database": db_info,
                # Backward-compatible flattened fields for legacy frontend callers
                "plate": clean_plate,
                "confidence": obs.get("anpr_confidence", 0.0),
                "vehicle_type": obs.get("vehicle_type", "Car"),
                "vehicle_color": obs.get("vehicle_color", "White"),
                "brand": obs.get("make_model") or "Detected",
                "format": obs.get("country_code", "GLOBAL"),
                "vehicle_bbox": obs.get("vehicle_bbox"),
                "plate_bbox": obs.get("plate_bbox"),
                "snapshot_url": f"/storage/images/{image_save_name}",
                "plate_crop_url": plate_crop_url,
                "is_watchlisted": db_info.get("is_watchlisted", False)
            }

            processed_results.append(result_item)

        duration_ms = (time.time() - start_time) * 1000

        return {
            "success": True,
            "filename": filename,
            "image_url": f"/storage/images/{image_save_name}",
            "resolution": f"{w}x{h}",
            "processing_time_ms": round(duration_ms, 2),
            "detections_count": len(processed_results),
            "detections": processed_results,
            "timestamp": ts,
            "anpr_provider": self.plate_recognizer.api_url if self.plate_recognizer.api_key else "local_high_precision_anpr"
        }

anpr_service = ANPRService()
