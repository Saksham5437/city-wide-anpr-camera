from collections import Counter
from typing import List, Dict, Any, Tuple
from app.services.anpr.plate_classifier import plate_classifier

class TemporalOcrFusion:
    """
    Temporal OCR Fusion Engine.
    Aggregates multi-frame license plate recognition observations for a tracked vehicle,
    using character consistency, confidence scoring, and frequency weighting to yield the most reliable plate.
    """

    @staticmethod
    def fuse_observations(ocr_candidates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Input: list of frame-level OCR observations:
        [{ 'raw_text': 'KA01AB1234', 'confidence': 98.2, 'frame_idx': 102, 'timestamp_sec': 3.4, 'quality': 0.95 }, ...]
        """
        if not ocr_candidates:
            return {
                "plate_number": "UNREADABLE",
                "plate_country": "UNKNOWN",
                "plate_format": "Unreadable",
                "ocr_confidence": 0.0,
                "final_plate_confidence": 0.0,
                "recognition_status": "UNREADABLE",
                "raw_observations": []
            }

        cleaned_observations = []
        plate_weighted_scores: Dict[str, float] = {}

        for obs in ocr_candidates:
            raw_text = obs.get("raw_text") or obs.get("plate", "")
            conf = float(obs.get("confidence", 80.0))
            quality = float(obs.get("quality", 1.0))
            frame_idx = int(obs.get("frame_idx", 0))
            timestamp_sec = float(obs.get("timestamp_sec", 0.0))

            classified = plate_classifier.classify_plate(raw_text)
            norm_plate = classified["normalized_plate"]

            cleaned_obs = {
                "frame_idx": frame_idx,
                "timestamp_sec": timestamp_sec,
                "raw_plate": raw_text,
                "cleaned_plate": norm_plate,
                "confidence": conf,
                "country_estimated": classified["country"],
                "image_quality": quality
            }
            cleaned_observations.append(cleaned_obs)

            if norm_plate != "UNREADABLE":
                weight = (conf / 100.0) * quality
                plate_weighted_scores[norm_plate] = plate_weighted_scores.get(norm_plate, 0.0) + weight

        if not plate_weighted_scores:
            return {
                "plate_number": "UNREADABLE",
                "plate_country": "UNKNOWN",
                "plate_format": "Unreadable Optical Signature",
                "ocr_confidence": 0.0,
                "final_plate_confidence": 0.0,
                "recognition_status": "UNREADABLE",
                "raw_observations": cleaned_observations
            }

        # Select highest scoring plate across temporal frames
        best_plate = max(plate_weighted_scores.items(), key=lambda x: x[1])[0]
        final_classification = plate_classifier.classify_plate(best_plate)

        # Calculate fused confidence: average of matching frame observations with frequency bonus
        matching_confs = [obs["confidence"] for obs in cleaned_observations if obs["cleaned_plate"] == best_plate]
        avg_conf = sum(matching_confs) / len(matching_confs) if matching_confs else 75.0
        frequency_boost = min(10.0, (len(matching_confs) - 1) * 2.5)
        fused_conf = min(99.5, round(avg_conf + frequency_boost, 1))

        # Check for uncertainty (e.g. conflicting readings or very low confidence)
        status = final_classification["recognition_status"]
        if fused_conf < 70.0 or len(best_plate) < 4:
            status = "REVIEW_REQUIRED"

        return {
            "plate_number": best_plate,
            "plate_country": final_classification["country"],
            "plate_format": final_classification["format_name"],
            "ocr_confidence": avg_conf,
            "final_plate_confidence": fused_conf,
            "recognition_status": status,
            "raw_observations": cleaned_observations
        }

temporal_fusion = TemporalOcrFusion()
