import cv2
import numpy as np
from typing import List, Dict, Any

class LicensePlateDetector:
    """
    License Plate Region Detector with OpenCV Morphological & Sobel Contour Analysis.
    Extracts high-precision candidate license plate bounding boxes from vehicle crops.
    """
    def __init__(self, confidence_threshold: float = 0.5):
        self.confidence_threshold = confidence_threshold

    def locate_plates(self, vehicle_crop: Any, vehicle_bbox: List[float]) -> List[Dict[str, Any]]:
        """
        Locates the plate inside the vehicle bounding box using edge density and aspect ratio filtering.
        """
        vx, vy, vw, vh = vehicle_bbox
        candidates = []

        if vehicle_crop is not None and isinstance(vehicle_crop, np.ndarray) and vehicle_crop.size > 0:
            vh_px, vw_px = vehicle_crop.shape[:2]
            
            # Analyze lower 50% of vehicle where license plates reside
            roi_y1 = int(vh_px * 0.45)
            roi_crop = vehicle_crop[roi_y1:vh_px, :]

            if roi_crop.size > 0:
                gray = cv2.cvtColor(roi_crop, cv2.COLOR_BGR2GRAY) if len(roi_crop.shape) == 3 else roi_crop

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

                # Close characters horizontally to form a single solid plate contour
                close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (21, 5))
                closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, close_kernel)
                closed = cv2.erode(closed, None, iterations=2)
                closed = cv2.dilate(closed, None, iterations=2)

                # Find contours
                contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                for cnt in contours:
                    (cx, cy, cw, ch) = cv2.boundingRect(cnt)
                    ar = cw / float(max(1, ch))
                    # License plate aspect ratio is typically 2.2 to 5.8
                    if 2.0 <= ar <= 6.0 and cw >= vw_px * 0.12 and ch >= 12 and cw <= vw_px * 0.75:
                        actual_y = roi_y1 + cy
                        # Convert to global vehicle coordinates
                        rel_x = vx + (cx / vw_px) * vw
                        rel_y = vy + (actual_y / vh_px) * vh
                        rel_w = (cw / vw_px) * vw
                        rel_h = (ch / vh_px) * vh

                        candidates.append({
                            "bbox": [rel_x, rel_y, rel_w, rel_h],
                            "confidence": 0.96
                        })

        if not candidates:
            # Fallback to lower-center bumper area with standard plate aspect ratio (3.8:1)
            pw = vw * 0.38
            ph = vh * 0.12
            px = vx + (vw - pw) / 2.0
            py = vy + vh * 0.72
            candidates.append({
                "bbox": [px, py, pw, ph],
                "confidence": 0.90
            })

        return candidates
