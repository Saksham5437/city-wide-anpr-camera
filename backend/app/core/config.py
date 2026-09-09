from typing import List, Union
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "City-Wide ANPR Command & Control Platform"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[Union[str, AnyHttpUrl]] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8080"
    ]

    # Database (MySQL 8.x local instance by default)
    DATABASE_URL: str = "mysql+pymysql://root:password@127.0.0.1:3306/city_anpr?charset=utf8mb4"
    
    # JWT
    SECRET_KEY: str = "supersecret-jwt-key-anpr-platform-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Storage
    STORAGE_PATH: str = "./storage"

    # ANPR Parameters
    SPEED_LIMIT_THRESHOLD: int = 80
    ANPR_CONFIDENCE_THRESHOLD: float = 85.0
    DUPLICATE_WINDOW_SECONDS: int = 5

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()

