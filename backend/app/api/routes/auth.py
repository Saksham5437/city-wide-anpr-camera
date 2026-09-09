from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.schemas.auth import User
from app.api.dependencies import get_current_user_optional

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(creds: LoginRequest):
    # SIH Demo authentication / Admin operator login
    if creds.username and creds.password:
        return {
            "access_token": f"token-{creds.username}-demo",
            "token_type": "bearer",
            "user": {
                "id": "usr-01",
                "name": creds.username,
                "badge_number": "BTP-CMD-4092",
                "role": "Government Operator" if creds.username != "admin" else "Command Supervisor",
                "department": "Bangalore Traffic Police Command & Control (TMC)",
                "shift": "Surveillance Desk 24/7",
                "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
            }
        }
    raise HTTPException(status_code=400, detail="Invalid credentials")

@router.post("/logout")
def logout():
    return {"status": "logged_out", "message": "Successfully logged out"}

@router.get("/me", response_model=User)
def get_me(user: dict = Depends(get_current_user_optional)):
    return user

@router.post("/switch-role", response_model=User)
def switch_role(payload: dict, user: dict = Depends(get_current_user_optional)):
    role = payload.get("role", "Government Operator")
    user["role"] = role
    return user

