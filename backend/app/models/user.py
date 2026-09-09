from sqlalchemy import Column, String
from app.database.session import Base

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    badge_number = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, default="Government Operator")
    department = Column(String, default="Bangalore Traffic Police Command & Control (TMC)")
    shift = Column(String, default="Surveillance Desk 24/7")
    avatar = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)
