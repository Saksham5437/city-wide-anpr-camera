import math
from typing import List, Dict, Any, Optional

def calculate_iou(bbox1: List[float], bbox2: List[float]) -> float:
    """Calculates Intersection over Union between two bounding boxes [x1, y1, x2, y2]."""
    x1 = max(bbox1[0], bbox2[0])
    y1 = max(bbox1[1], bbox2[1])
    x2 = min(bbox1[2], bbox2[2])
    y2 = min(bbox1[3], bbox2[3])

    inter_w = max(0.0, x2 - x1)
    inter_h = max(0.0, y2 - y1)
    inter_area = inter_w * inter_h

    area1 = (bbox1[2] - bbox1[0]) * (bbox1[3] - bbox1[1])
    area2 = (bbox2[2] - bbox2[0]) * (bbox2[3] - bbox2[1])
    union_area = area1 + area2 - inter_area

    if union_area <= 0:
        return 0.0
    return inter_area / union_area

class TrackedVehicle:
    def __init__(self, track_id: int, initial_bbox: List[float], vehicle_type: str, confidence: float, frame_idx: int, timestamp_sec: float):
        self.track_id = track_id
        self.current_bbox = initial_bbox
        self.vehicle_type = vehicle_type
        self.vehicle_confidence = confidence
        self.first_frame = frame_idx
        self.last_frame = frame_idx
        self.first_seen_sec = timestamp_sec
        self.last_seen_sec = timestamp_sec
        self.missing_frames = 0
        
        # Trajectory history: list of (x_center, y_center, timestamp_sec)
        cx = (initial_bbox[0] + initial_bbox[2]) / 2.0
        cy = (initial_bbox[1] + initial_bbox[3]) / 2.0
        self.trajectory = [(cx, cy, timestamp_sec)]
        
        # Speeds recorded across track
        self.speeds_kmh = [45.0]
        self.color = "Unknown"
        self.make = "Unknown"
        self.model = "Unknown"
        self.lane_number = 1
        self.direction = "Inbound"
        
        # OCR candidates collected across frames
        self.ocr_candidates: List[Dict[str, Any]] = []
        self.best_vehicle_crop: Optional[Any] = None
        self.best_plate_crop: Optional[Any] = None
        self.best_crop_quality: float = 0.0

    def update(self, bbox: List[float], vehicle_type: str, confidence: float, frame_idx: int, timestamp_sec: float):
        self.current_bbox = bbox
        self.last_frame = frame_idx
        self.last_seen_sec = timestamp_sec
        self.missing_frames = 0
        
        if confidence > self.vehicle_confidence:
            self.vehicle_confidence = confidence
            if vehicle_type != "Car":
                self.vehicle_type = vehicle_type

        cx = (bbox[0] + bbox[2]) / 2.0
        cy = (bbox[1] + bbox[3]) / 2.0
        
        # Calculate velocity from previous position
        if self.trajectory:
            prev_cx, prev_cy, prev_t = self.trajectory[-1]
            dt = max(0.01, timestamp_sec - prev_t)
            pixel_dist = math.sqrt((cx - prev_cx)**2 + (cy - prev_cy)**2)
            # Calibration factor: convert pixel speed to estimated km/h
            speed_estimate = min(140.0, max(15.0, (pixel_dist / dt) * 0.45))
            self.speeds_kmh.append(speed_estimate)

        self.trajectory.append((cx, cy, timestamp_sec))

class MultiObjectTracker:
    """
    Multi-Object Tracker (MOT) for persistent vehicle passage tracking across video frames.
    Maintains unique track_id and spatial-temporal continuity.
    """
    def __init__(self, iou_threshold: float = 0.3, max_missing_frames: int = 15):
        self.iou_threshold = iou_threshold
        self.max_missing_frames = max_missing_frames
        self.next_track_id = 1
        self.active_tracks: Dict[int, TrackedVehicle] = {}
        self.completed_tracks: List[TrackedVehicle] = []

    def process_frame_detections(self, detections: List[Dict[str, Any]], frame_idx: int, timestamp_sec: float) -> List[TrackedVehicle]:
        """
        Associates frame detections to active tracks using IoU cost matrix.
        Returns list of updated active tracked vehicles.
        """
        matched_track_ids = set()
        unmatched_detections = []

        for det in detections:
            bbox = det["bbox"]
            v_type = det.get("class_name", "Car")
            conf = det.get("confidence", 0.9)

            best_match_id = None
            best_iou = 0.0

            for t_id, track in self.active_tracks.items():
                if t_id in matched_track_ids:
                    continue
                iou = calculate_iou(bbox, track.current_bbox)
                if iou > best_iou and iou >= self.iou_threshold:
                    best_iou = iou
                    best_match_id = t_id

            if best_match_id is not None:
                self.active_tracks[best_match_id].update(bbox, v_type, conf, frame_idx, timestamp_sec)
                matched_track_ids.add(best_match_id)
            else:
                unmatched_detections.append(det)

        # Increment missing counter for unmatched active tracks
        to_retire = []
        for t_id, track in self.active_tracks.items():
            if t_id not in matched_track_ids:
                track.missing_frames += 1
                if track.missing_frames > self.max_missing_frames:
                    to_retire.append(t_id)

        for t_id in to_retire:
            retired = self.active_tracks.pop(t_id)
            # Only keep passages with at least 3 sightings to reject single-frame false noise
            if len(retired.trajectory) >= 2 or len(retired.ocr_candidates) > 0:
                self.completed_tracks.append(retired)

        # Create new tracks for unmatched detections
        for det in unmatched_detections:
            new_t = TrackedVehicle(
                track_id=self.next_track_id,
                initial_bbox=det["bbox"],
                vehicle_type=det.get("class_name", "Car"),
                confidence=det.get("confidence", 0.9),
                frame_idx=frame_idx,
                timestamp_sec=timestamp_sec
            )
            self.active_tracks[self.next_track_id] = new_t
            self.next_track_id += 1

        return list(self.active_tracks.values())

    def finalize(self) -> List[TrackedVehicle]:
        """Flushes all remaining active tracks into completed passages."""
        for t_id, track in self.active_tracks.items():
            if len(track.trajectory) >= 2 or len(track.ocr_candidates) > 0:
                self.completed_tracks.append(track)
        self.active_tracks.clear()
        return self.completed_tracks
