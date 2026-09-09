import re
from typing import Dict, Any, Optional

class InternationalPlateClassifier:
    """
    Universal International License Plate Classifier & Normalizer.
    Accurately classifies country of origin and regional standard without forcing non-Indian plates into Indian formats.
    """

    @staticmethod
    def classify_plate(raw_text: str) -> Dict[str, Any]:
        if not raw_text:
            return {
                "is_valid": False,
                "normalized_plate": "UNREADABLE",
                "country": "UNKNOWN",
                "format_name": "Unreadable Optical Crop",
                "confidence_score": 0.0,
                "recognition_status": "UNREADABLE"
            }

        # 1. Basic cleaning: remove special noise symbols, keep alphanumeric
        cleaned = re.sub(r'[^A-Za-z0-9]', '', raw_text).upper().strip()

        if len(cleaned) < 3:
            return {
                "is_valid": False,
                "normalized_plate": cleaned if cleaned else "UNREADABLE",
                "country": "UNKNOWN",
                "format_name": "Fragmentary / Occluded",
                "confidence_score": 30.0,
                "recognition_status": "REVIEW_REQUIRED"
            }

        # 2. Indian Standard (IND): 2 Letters (State) + 1-2 Digits (RTO) + 0-3 Letters + 4 Digits
        # e.g., KA01AB1234, DL3CAA1001, MH02BG9988
        indian_pattern = r'^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})?([0-9]{4})$'
        if re.match(indian_pattern, cleaned):
            return {
                "is_valid": True,
                "normalized_plate": cleaned,
                "country": "India",
                "region": cleaned[:2],
                "format_name": "Indian Standard (IND)",
                "confidence_score": 98.0,
                "recognition_status": "RECOGNIZED"
            }

        # 3. United States / Canada Standard: e.g. 7XYZ890, ABC1234, 1ABC234, ABC-123
        us_pattern = r'^([0-9]{1}[A-Z]{3}[0-9]{3}|[A-Z]{3}[0-9]{4}|[A-Z]{2}[0-9]{5}|[0-9]{3}[A-Z]{3}|[0-9]{1}[A-Z]{2}[0-9]{4})$'
        if re.match(us_pattern, cleaned):
            return {
                "is_valid": True,
                "normalized_plate": cleaned,
                "country": "United States / North America",
                "format_name": "US/Canada Standard (NA)",
                "confidence_score": 95.0,
                "recognition_status": "RECOGNIZED"
            }

        # 4. United Kingdom Standard: e.g. AB12CDE or A123BCD
        uk_pattern = r'^([A-Z]{2}[0-9]{2}[A-Z]{3}|[A-Z]{1}[0-9]{1,3}[A-Z]{3})$'
        if re.match(uk_pattern, cleaned):
            return {
                "is_valid": True,
                "normalized_plate": cleaned,
                "country": "United Kingdom",
                "format_name": "UK DVLA Standard",
                "confidence_score": 96.0,
                "recognition_status": "RECOGNIZED"
            }

        # 5. European Union Standard: e.g. BMW2024, AB123CD, 123ABC12
        eu_pattern = r'^([A-Z]{1,3}[0-9]{1,4}[A-Z]{1,3}|[A-Z]{2}[0-9]{3}[A-Z]{2}|[0-9]{3}[A-Z]{2,3}[0-9]{2})$'
        if re.match(eu_pattern, cleaned):
            return {
                "is_valid": True,
                "normalized_plate": cleaned,
                "country": "European Union",
                "format_name": "EU Standard (Europlate)",
                "confidence_score": 94.0,
                "recognition_status": "RECOGNIZED"
            }

        # 6. UAE / Middle East Standard: 1-2 Letters/Prefix + 3-5 Digits, or 4-5 Digits pure
        uae_pattern = r'^([A-Z]{1,2}[0-9]{3,5}|[0-9]{4,5})$'
        if re.match(uae_pattern, cleaned) and len(cleaned) <= 6:
            return {
                "is_valid": True,
                "normalized_plate": cleaned,
                "country": "United Arab Emirates / GCC",
                "format_name": "GCC Standard",
                "confidence_score": 92.0,
                "recognition_status": "RECOGNIZED"
            }

        # 7. Australia Standard: e.g. 1AB2CD, ABC123
        aus_pattern = r'^([0-9]{1}[A-Z]{2}[0-9]{1}[A-Z]{2}|[A-Z]{3}[0-9]{3})$'
        if re.match(aus_pattern, cleaned):
            return {
                "is_valid": True,
                "normalized_plate": cleaned,
                "country": "Australia",
                "format_name": "Australian Standard",
                "confidence_score": 94.0,
                "recognition_status": "RECOGNIZED"
            }

        # 8. Universal Alphanumeric (4-10 alphanumeric characters)
        if 4 <= len(cleaned) <= 10:
            return {
                "is_valid": True,
                "normalized_plate": cleaned,
                "country": "UNKNOWN",
                "format_name": "Universal Alphanumeric",
                "confidence_score": 85.0,
                "recognition_status": "RECOGNIZED"
            }

        # 9. Low-confidence / Uncertain Crop
        return {
            "is_valid": False,
            "normalized_plate": cleaned[:10],
            "country": "UNKNOWN",
            "format_name": "Uncertain Optical Signature",
            "confidence_score": 50.0,
            "recognition_status": "REVIEW_REQUIRED"
        }

plate_classifier = InternationalPlateClassifier()
