from fastapi import APIRouter, Depends
from app.schemas.auth import User
from app.api.dependencies import get_current_user_optional

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/me", response_model=User)
def get_me(user: dict = Depends(get_current_user_optional)):
    return user

@router.post("/switch-role", response_model=User)
def switch_role(payload: dict, user: dict = Depends(get_current_user_optional)):
    role = payload.get("role", "Government Operator")
    user["role"] = role
    return user
