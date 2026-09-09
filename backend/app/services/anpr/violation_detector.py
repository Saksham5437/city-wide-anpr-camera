from typing import List, Dict, Any, Tuple

class ViolationRuleEngine:
    """
    Traffic Scene Violation Intelligence Engine.
    Evaluates multi-factor traffic rules on vehicle passage trajectories.
    Classifies severity (LOW, MEDIUM, HIGH, CRITICAL) and generates verifiable evidence metadata.
    """
    def __init__(self, default_speed_limit_kmh: float = 60.0):
        self.default_speed_limit = default_speed_limit_kmh

    def evaluate_passage(
        self,
        vehicle_type: str,
        plate_number: str,
        avg_speed: float,
        max_speed: float,
        trajectory: List[Tuple[float, float, float]],
        recognition_status: str,
        speed_limit: float = None
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Evaluates a vehicle passage.
        Returns: (compliance_status, list_of_violations)
        compliance_status in ['COMPLIANT', 'VIOLATION', 'REVIEW_REQUIRED']
        """
        limit = speed_limit or self.default_speed_limit
        violations: List[Dict[str, Any]] = []

        # Rule 1: Speeding Violation (> Speed Limit)
        if max_speed > (limit + 5.0):
            excess = max_speed - limit
            severity = "CRITICAL" if excess >= 25.0 else ("HIGH" if excess >= 15.0 else "MEDIUM")
            fine = 3000.0 if severity == "CRITICAL" else (2000.0 if severity == "HIGH" else 1000.0)
            
            violations.append({
                "type": f"Speeding Violation ({round(max_speed, 1)} km/h in {int(limit)} km/h zone)",
                "severity": severity,
                "confidence": 98.5,
                "speed_recorded": round(max_speed, 1),
                "speed_limit": limit,
                "fine_amount": fine,
                "description": f"Vehicle recorded traveling at {round(max_speed, 1)} km/h, exceeding the posted {int(limit)} km/h corridor speed limit by {round(excess, 1)} km/h."
            })

        # Rule 2: Wrong-Way Travel (detect reverse vertical displacement in calibrated lane)
        if len(trajectory) >= 3:
            y_start = trajectory[0][1]
            y_end = trajectory[-1][1]
            # If standard direction is top-to-bottom (y increasing), reverse motion indicates wrong-way
            if (y_start - y_end) > 120:  # significant upward motion against southbound flow
                violations.append({
                    "type": "Wrong-Way Driving",
                    "severity": "CRITICAL",
                    "confidence": 94.0,
                    "fine_amount": 5000.0,
                    "description": "Vehicle detected maneuvering in opposite direction against oncoming traffic stream."
                })

        # Rule 3: Heavy Vehicle Corridor Restriction
        if vehicle_type in ["Bus/Truck", "Truck"] and max_speed > 50.0:
            violations.append({
                "type": "Commercial Heavy Vehicle Corridor Speeding",
                "severity": "HIGH",
                "confidence": 96.0,
                "speed_recorded": round(max_speed, 1),
                "speed_limit": 50.0,
                "fine_amount": 2500.0,
                "description": "Heavy commercial transport exceeded 50 km/h urban restriction."
            })

        # Determine Systematic 3-Tier Classification
        if violations:
            compliance_status = "VIOLATION"
        elif recognition_status in ["UNCERTAIN", "REVIEW_REQUIRED"] or plate_number in ["UNREADABLE", "UNKNOWN"]:
            compliance_status = "REVIEW_REQUIRED"
        else:
            compliance_status = "COMPLIANT"

        return compliance_status, violations

violation_engine = ViolationRuleEngine()
