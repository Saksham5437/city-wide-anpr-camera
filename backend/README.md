# City-Wide ANPR Backend Service (FastAPI)

Production-ready backend API service for City-Wide Automatic Number Plate Recognition (ANPR) & Intelligent Traffic Management System.

## Features
- **RESTful Endpoints**: Complete CRUD for cameras, vehicle profiles, real-time ANPR detections, watchlist tracking, violations, and analytics.
- **WebSocket Gateway**: `/ws/live` connection manager for real-time detection telemetry and emergency alerts.
- **Modular ANPR Pipeline**: Clean interfaces for YOLO vehicle detection, plate localization, adaptive preprocessing, universal OCR, and validation.
- **SQLAlchemy ORM**: Configured for PostgreSQL in production and SQLite for zero-config local testing.

## Getting Started

### 1. Create Virtual Environment
```bash
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run FastAPI Server
```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Interactive API Documentation
- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`
- Health Check: `http://localhost:8000/health`
