import re
from typing import Dict, Any

class PlateValidator:
    """
    Universal License Plate Sanitizer and Regional Standard Classifier.
    Supports Indian, US, European, Asian, and generic alphanumeric number plates.
    """
    @staticmethod
    def validate_and_classify(raw_text: str) -> Dict[str, Any]:
        if not raw_text:
            return {"is_valid": False, "plate": "", "standard": "Unknown", "confidence_boost": 0}

        cleaned = re.sub(r'[^A-Z0-9]', '', raw_text.upper().strip())
        if len(cleaned) < 3:
            return {"is_valid": False, "plate": "", "standard": "Invalid", "confidence_boost": 0}

        # 1. Indian Standard: 2 Letters (State) + 1-2 Digits (RTO) + 0-3 Letters + 4 Digits
        indian_pattern = r'^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})?([0-9]{4})$'
        if re.match(indian_pattern, cleaned):
            return {"is_valid": True, "plate": cleaned, "standard": "Indian Standard (IND)", "confidence_boost": 25}

        # 2. US Standard (e.g. 7XYZ890 or ABC1234 or 1ABC234)
        us_pattern = r'^([0-9]{1}[A-Z]{3}[0-9]{3}|[A-Z]{3}[0-9]{4}|[A-Z]{2}[0-9]{5}|[0-9]{3}[A-Z]{3})$'
        if re.match(us_pattern, cleaned):
            return {"is_valid": True, "plate": cleaned, "standard": "North America / US", "confidence_boost": 20}

        # 3. European Standard (e.g. BMW2024 or AB12CDE or 123ABC12)
        eu_pattern = r'^([A-Z]{1,3}[0-9]{1,4}[A-Z]{1,3}|[A-Z]{2}[0-9]{2}[A-Z]{3})$'
        if re.match(eu_pattern, cleaned):
            return {"is_valid": True, "plate": cleaned, "standard": "European Union (EU)", "confidence_boost": 20}

        # 4. Universal Alphanumeric (4-10 characters)
        if 4 <= len(cleaned) <= 10:
            return {"is_valid": True, "plate": cleaned, "standard": "Universal Alphanumeric", "confidence_boost": 15}

        return {"is_valid": True, "plate": cleaned[:10], "standard": "Universal Optical", "confidence_boost": 10}
