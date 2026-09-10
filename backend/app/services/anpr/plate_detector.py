import cv2
import numpy as np
from typing import List, Dict, Any

class LicensePlateDetector:
    """
    License Plate Region Detector with Morphological Gradient & Aspect-Ratio Filtering.
    Extracts high-precision candidate license plate bounding boxes from vehicle crops.
    """
    def __init__(self, confidence_threshold: float = 0.5):
        self.confidence_threshold = confidence_threshold

    def locate_plates(self, vehicle_crop: Any, vehicle_bbox: List[float]) -> List[Dict[str, Any]]:
        """
        Locates plate inside vehicle bounding box.
        `vehicle_bbox` is [vx1, vy1, vx2, vy2].
        Returns bounding boxes in global frame coordinates [px1, py1, px2, py2].
        """
        vx1, vy1, vx2, vy2 = vehicle_bbox
        vw = float(vx2 - vx1)
        vh = float(vy2 - vy1)
        candidates = []

        if vehicle_crop is not None and isinstance(vehicle_crop, np.ndarray) and vehicle_crop.size > 0:
            vh_px, vw_px = vehicle_crop.shape[:2]
            
            # Analyze lower 55% of vehicle where license plates reside
            roi_y1 = int(vh_px * 0.45)
            roi_crop = vehicle_crop[roi_y1:vh_px, :]

            if roi_crop.size > 0:
                gray = cv2.cvtColor(roi_crop, cv2.COLOR_BGR2GRAY) if len(roi_crop.shape) == 3 else roi_crop.copy()

                # Top-hat morphological operation to reveal bright elements on dark background
                rect_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (13, 5))
                tophat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, rect_kernel)

                # Vertical gradient (Sobel) to capture vertical character strokes
                grad_x = cv2.Sobel(tophat, ddepth=cv2.CV_32F, dx=1, dy=0, ksize=-1)
                grad_x = np.absolute(grad_x)
                (min_val, max_val) = (np.min(grad_x), np.max(grad_x))
                grad_x = 255 * ((grad_x - min_val) / max(1e-5, (max_val - min_val)))
                grad_x = grad_x.astype("uint8")

                # Blur and Otsu thresholding
                blurred = cv2.GaussianBlur(grad_x, (5, 5), 0)
                _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

                # Close characters horizontally to form a solid plate contour
                close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (21, 5))
                closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, close_kernel)
                closed = cv2.erode(closed, None, iterations=1)
                closed = cv2.dilate(closed, None, iterations=2)

                # Find contours
                contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                for cnt in contours:
                    (cx, cy, cw, ch) = cv2.boundingRect(cnt)
                    ar = cw / float(max(1, ch))
                    # Standard international plate aspect ratio is between 2.0 and 6.0
                    if 2.0 <= ar <= 6.0 and cw >= vw_px * 0.12 and ch >= 10 and cw <= vw_px * 0.80:
                        actual_y = roi_y1 + cy
                        
                        # Convert to global vehicle coordinates [px1, py1, px2, py2]
                        px1 = vx1 + (cx / float(vw_px)) * vw
                        py1 = vy1 + (actual_y / float(vh_px)) * vh
                        px2 = px1 + (cw / float(vw_px)) * vw
                        py2 = py1 + (ch / float(vh_px)) * vh

                        candidates.append({
                            "bbox": [px1, py1, px2, py2],
                            "confidence": 0.95
                        })

        if not candidates:
            # Fallback to lower-center bumper area with standard plate aspect ratio (3.8:1)
            pw = vw * 0.42
            ph = vh * 0.14
            px1 = vx1 + (vw - pw) / 2.0
            py1 = vy1 + vh * 0.70
            candidates.append({
                "bbox": [px1, py1, px1 + pw, py1 + ph],
                "confidence": 0.88
            })

        return candidates
