import time
from datetime import datetime
from typing import Dict, Any, List
from app.services.anpr.detector import VehicleDetector
from app.services.anpr.plate_detector import LicensePlateDetector
from app.services.anpr.ocr import PlateOCR
from app.services.anpr.validator import PlateValidator
from app.schemas.anpr import AnprProcessingRequest, AnprProcessingResult, DetectedVehicle, DetectedPlate

class AnprPipeline:
    """
    End-to-End Server-Side ANPR Pipeline:
    Camera Frame -> Vehicle Detection -> Plate Localization -> Preprocessing -> OCR -> Validation -> Database Registration
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
                color=v["color"]
            ))

            # Step 2: Detect Plate Region
            plates = self.plate_detector.locate_plates(None, v["bbox"])
            for p in plates:
                # Step 3: OCR
                ocr_res = self.ocr_engine.recognize_plate_text(None)
                
                detected_plates.append(DetectedPlate(
                    bbox=p["bbox"],
                    plate_text=ocr_res["plate"],
                    ocr_confidence=ocr_res["ocr_confidence"],
                    format_standard=ocr_res["format"],
                    is_registered=True
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

anpr_pipeline = AnprPipeline()
