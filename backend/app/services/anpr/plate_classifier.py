import re
from typing import Dict, Any, Optional

INDIAN_STATES = {
    'KA': 'Karnataka', 'MH': 'Maharashtra', 'DL': 'Delhi', 'TN': 'Tamil Nadu',
    'KL': 'Kerala', 'AP': 'Andhra Pradesh', 'TS': 'Telangana', 'GJ': 'Gujarat',
    'UP': 'Uttar Pradesh', 'RJ': 'Rajasthan', 'WB': 'West Bengal', 'HR': 'Haryana',
    'PB': 'Punjab', 'CH': 'Chandigarh', 'UK': 'Uttarakhand', 'JH': 'Jharkhand',
    'BR': 'Bihar', 'OD': 'Odisha', 'GA': 'Goa', 'PY': 'Puducherry', 'MP': 'Madhya Pradesh',
    'AS': 'Assam', 'TR': 'Tripura', 'NL': 'Nagaland', 'MN': 'Manipur', 'MZ': 'Mizoram',
    'SK': 'Sikkim', 'AR': 'Arunachal Pradesh', 'HP': 'Himachal Pradesh', 'JK': 'Jammu & Kashmir'
}

CHAR_TO_DIGIT = {'O': '0', 'D': '0', 'Q': '0', 'I': '1', 'L': '1', 'Z': '2', 'E': '3', 'A': '4', 'S': '5', 'G': '6', 'T': '7', 'B': '8', 'P': '9'}
DIGIT_TO_CHAR = {'0': 'O', '1': 'I', '2': 'Z', '3': 'E', '4': 'A', '5': 'S', '6': 'G', '7': 'T', '8': 'B', '9': 'P'}

class InternationalPlateClassifier:
    """
    Universal International License Plate Classifier & Normalizer.
    Accurately classifies country of origin, regional standard, and executes OCR character confusion recovery.
    """

    @staticmethod
    def fix_indian_plate_ocr(raw_cleaned: str) -> Optional[str]:
        """
        Attempts to correct common OCR character swaps for Indian registration plates:
        Format: [State: 2 letters][RTO: 1-2 digits][Series: 0-3 letters][Number: 4 digits]
        Total length: 8 to 11 characters.
        """
        if len(raw_cleaned) < 8 or len(raw_cleaned) > 12:
            return None

        chars = list(raw_cleaned)

        # Fix State Code (First 2 chars) -> Must be letters
        for i in range(2):
            if chars[i].isdigit() and chars[i] in DIGIT_TO_CHAR:
                chars[i] = DIGIT_TO_CHAR[chars[i]]

        state = "".join(chars[:2])
        if state not in INDIAN_STATES:
            # Check near match (e.g. K0/KO/K4 -> KA, M0/MO -> MH, etc.)
            if state[0] == 'K' and state[1] in ['A', '0', '4', 'R', 'H', 'O']:
                chars[0], chars[1] = 'K', 'A'
            elif state[0] == 'M' and state[1] in ['H', '0', 'P', 'O']:
                chars[0], chars[1] = 'M', chars[1] if chars[1] in ['H', 'P'] else 'H'
            elif state[0] == 'D' and state[1] in ['L', '1', 'I', '0', 'O']:
                chars[0], chars[1] = 'D', 'L'
            elif state[0] == 'T' and state[1] in ['N', 'S', '0', 'O']:
                chars[0], chars[1] = 'T', chars[1] if chars[1] in ['N', 'S'] else 'N'

        # Fix Last 4 characters -> Must be Digits
        for i in range(len(chars) - 4, len(chars)):
            if chars[i].isalpha() and chars[i] in CHAR_TO_DIGIT:
                chars[i] = CHAR_TO_DIGIT[chars[i]]

        # Fix RTO Code (Chars index 2 and 3) -> Must be Digits
        if len(chars) >= 8:
            if chars[2].isalpha() and chars[2] in CHAR_TO_DIGIT:
                chars[2] = CHAR_TO_DIGIT[chars[2]]
            if chars[3].isalpha() and chars[3] in CHAR_TO_DIGIT and (len(chars) >= 9 or not chars[3].isdigit()):
                chars[3] = CHAR_TO_DIGIT[chars[3]]

        candidate = "".join(chars)
        indian_pattern = r'^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})?([0-9]{4})$'
        if re.match(indian_pattern, candidate):
            return candidate

        return None

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

        # Check direct Indian pattern match
        indian_pattern = r'^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})?([0-9]{4})$'
        if re.match(indian_pattern, cleaned):
            state = cleaned[:2]
            state_name = INDIAN_STATES.get(state, "India")
            return {
                "is_valid": True,
                "normalized_plate": cleaned,
                "country": "India",
                "region": f"{state} ({state_name})",
                "format_name": f"Indian Standard ({state})",
                "confidence_score": 98.4,
                "recognition_status": "RECOGNIZED"
            }

        # Try Indian OCR error recovery
        recovered = InternationalPlateClassifier.fix_indian_plate_ocr(cleaned)
        if recovered:
            state = recovered[:2]
            state_name = INDIAN_STATES.get(state, "India")
            return {
                "is_valid": True,
                "normalized_plate": recovered,
                "country": "India",
                "region": f"{state} ({state_name})",
                "format_name": f"Indian Standard ({state})",
                "confidence_score": 96.0,
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
