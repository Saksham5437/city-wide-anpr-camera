from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.session import engine, Base
import app.models # Register all models

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc"
)

# CORS Configuration
origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS] + ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
from app.api.routes import (
    cameras,
    vehicles,
    detections,
    violations,
    alerts,
    analytics,
    auth,
    anpr,
    websocket
)

app.include_router(cameras.router, prefix=settings.API_V1_STR)
app.include_router(vehicles.router, prefix=settings.API_V1_STR)
app.include_router(detections.router, prefix=settings.API_V1_STR)
app.include_router(violations.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(anpr.router, prefix=settings.API_V1_STR)
app.include_router(websocket.router)

@app.get("/health", tags=["system"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }

@app.get("/", tags=["system"])
def root():
    return {
        "message": "Welcome to City-Wide ANPR Command & Control Platform API",
        "docs": f"{settings.API_V1_STR}/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
