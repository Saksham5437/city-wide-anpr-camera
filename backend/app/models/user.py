from sqlalchemy import Column, String
from app.database.session import Base

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    badge_number = Column(String(64), unique=True, index=True, nullable=False)
    role = Column(String(64), default="Government Operator")
    department = Column(String(128), default="Bangalore Traffic Police Command & Control (TMC)")
    shift = Column(String(64), default="Surveillance Desk 24/7")
    avatar = Column(String(512), nullable=True)
    hashed_password = Column(String(255), nullable=True)
