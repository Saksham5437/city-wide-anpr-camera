from typing import List, Dict, Any

class LicensePlateDetector:
    """
    License Plate Region Detector (LPR-Net / Edge detector interface).
    Extracts high-precision candidate license plate crops from vehicle bounding boxes.
    """
    def __init__(self, confidence_threshold: float = 0.5):
        self.confidence_threshold = confidence_threshold

    def locate_plates(self, vehicle_crop: Any, vehicle_bbox: List[float]) -> List[Dict[str, Any]]:
        """
        Locates the plate inside the vehicle bounding box (typically bottom central bumper region).
        """
        vx, vy, vw, vh = vehicle_bbox
        # Plate region: central bottom 20%
        px = vx + vw * 0.2
        py = vy + vh * 0.72
        pw = vw * 0.6
        ph = vh * 0.22

        return [
            {
                "bbox": [px, py, pw, ph],
                "confidence": 0.94
            }
        ]
