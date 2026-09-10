import time
import os
import cv2
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.services.anpr.detector import VehicleDetector
from app.services.anpr.plate_detector import LicensePlateDetector
from app.services.anpr.ocr import PlateOCR
from app.services.anpr.validator import PlateValidator
from app.services.anpr.plate_classifier import plate_classifier
from app.services.anpr.attribute_detector import attribute_detector
from app.services.detection.detection_service import detection_service
from app.schemas.anpr import AnprProcessingRequest, AnprProcessingResult, DetectedVehicle, DetectedPlate
from app.core.config import settings

class AnprPipeline:
    """
    End-to-End Server-Side ANPR Pipeline for both Video Frames and Static Images:
    Image/Frame -> Vehicle Detection -> Plate Localization -> International OCR -> Attribute Inference -> DB Registration
    """
    def __init__(self):
        self.vehicle_detector = VehicleDetector()
        self.plate_detector = LicensePlateDetector()
        self.ocr_engine = PlateOCR()
        self.validator = PlateValidator()

    def process_frame(self, request: AnprProcessingRequest) -> AnprProcessingResult:
        start_time = time.time()

        # Step 1: Detect Vehicles
        raw_vehicles = self.vehicle_detector.detect_vehicles(request.image_base64 or request.image_url)
        
        detected_vehicles: List[DetectedVehicle] = []
        detected_plates: List[DetectedPlate] = []
        violations: List[str] = []

        for v in raw_vehicles:
            detected_vehicles.append(DetectedVehicle(
                bbox=v["bbox"],
                confidence=v["confidence"],
                vehicle_class=v["class_name"],
                color=v.get("color", "White")
            ))

            # Step 2: Detect Plate Region
            plates = self.plate_detector.locate_plates(None, v["bbox"])
            for p in plates:
                # Step 3: OCR
                ocr_res = self.ocr_engine.recognize_plate_text(None)
                classified = plate_classifier.classify_plate(ocr_res["plate"])
                
                detected_plates.append(DetectedPlate(
                    bbox=p["bbox"],
                    plate_text=classified["normalized_plate"],
                    ocr_confidence=classified["confidence_score"],
                    format_standard=classified["format_name"],
                    is_registered=classified["is_valid"]
                ))

        # Check Speeding Rule (> 80 km/h)
        if request.speed_estimate_kmh and request.speed_estimate_kmh > 80:
            violations.append(f"Speeding Violation ({request.speed_estimate_kmh} km/h > 80 km/h limit)")

        duration_ms = (time.time() - start_time) * 1000

        return AnprProcessingResult(
            success=True,
            vehicles=detected_vehicles,
            plates=detected_plates,
            violations_detected=violations,
            processing_time_ms=round(duration_ms, 2),
            timestamp=datetime.utcnow().isoformat()
        )

    async def process_image_file(
        self,
        image_bytes: bytes,
        filename: str,
        db: Session,
        camera_code: str = "CAM-003",
        camera_name: str = "Hebbal Flyover Main Deck",
        location: str = "Hebbal Flyover, Bengaluru"
    ) -> Dict[str, Any]:
        """
        Processes an uploaded static image through the External ANPR Engine (Plate Recognizer)
        with clean separation of Observed ANPR Data and Database Metadata.
        """
        from app.services.anpr.external_anpr_service import anpr_service
        return await anpr_service.recognize_image(
            image_bytes=image_bytes,
            filename=filename,
            camera_code=camera_code,
            camera_name=camera_name,
            location=location,
            db=db
        )

anpr_pipeline = AnprPipeline()
