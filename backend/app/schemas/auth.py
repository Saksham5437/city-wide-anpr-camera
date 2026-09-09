from typing import Optional
from pydantic import BaseModel

class UserBase(BaseModel):
    name: str
    badge_number: str
    role: str = "Government Operator"
    department: str = "Bangalore Traffic Police Command & Control (TMC)"
    shift: str = "Surveillance Desk 24/7"
    avatar: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
