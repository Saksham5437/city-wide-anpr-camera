from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_current_user_optional(token: str = Depends(oauth2_scheme)):
    # Returns dummy or decoded user context
    return {
        "id": "usr-001",
        "name": "Government Operator",
        "badge_number": "BTP-GOV-01",
        "role": "Government Operator",
        "department": "Bangalore Traffic Police Command & Control (TMC)",
        "shift": "Surveillance Desk 24/7"
    }
