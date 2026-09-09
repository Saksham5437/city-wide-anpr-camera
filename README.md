# City-Wide ANPR Camera Network & Traffic Management Platform

[![Frontend: React 19](https://img.shields.io/badge/Frontend-React_19_+_TypeScript-blue.svg)](https://react.dev/)
[![Backend: FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-grade, city-wide surveillance command and control system engineered for real-time Automatic Number Plate Recognition (ANPR), optical vehicle tracking, speed radar enforcement (>80 km/h), red-light violations, watchlist tracking, and traffic analytics.

---

## Architecture Overview

```
city-wide-anpr-camera/
│
├── frontend/                     # React + TypeScript + Vite Client Application
│   ├── src/
│   │   ├── components/           # 100% UI preservation across all tabs & views
│   │   ├── services/
│   │   │   └── api/              # Centralized API service layer (cameras, vehicles, detections, alerts, analytics)
│   │   ├── context/              # Global application context (TrafficContext)
│   │   ├── hooks/                # Custom React hooks for data fetching & WebSocket streaming
│   │   ├── utils/                # Geo calculations (Haversine), formatters, CSV export
│   │   ├── constants/            # Configuration constants & environment endpoints
│   │   ├── types/                # Synchronized TypeScript data models
│   │   └── data/                 # Preserved benchmark dataset
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── backend/                      # Production Python FastAPI Server
│   ├── app/
│   │   ├── main.py               # Application entrypoint & CORS middleware
│   │   ├── api/
│   │   │   └── routes/           # REST endpoints (/cameras, /vehicles, /detections, /alerts, /analytics, /anpr)
│   │   ├── core/                 # Config (Pydantic), security, WebSocket manager
│   │   ├── database/             # SQLAlchemy engine & session factory
│   │   ├── models/               # Database ORM models (PostgreSQL / SQLite)
│   │   ├── schemas/              # Pydantic validation schemas
│   │   └── services/
│   │       ├── anpr/             # Modular ANPR pipeline (YOLO detector, plate locator, OCR, validation)
│   │       ├── camera/           # Camera telemetry & state management
│   │       ├── vehicle/          # Vehicle database & trajectory calculation
│   │       ├── alerts/           # Alert dispatch & violation adjudication
│   │       └── analytics/        # Hourly traffic histograms & KPI metrics
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker-compose.yml            # Multi-service stack (frontend, backend, postgres)
└── README.md
```

---

## Key Features

- **Universal Optical ANPR**: Client & server-side OCR supporting Indian, US, European, Asian, and generic alphanumeric number plates.
- **Automatic Database Auto-Registration**: Detected vehicle plates automatically persist into database with optical crops and telemetry.
- **Speed Radar Enforcement**: Flags overspeeding (>80 km/h) with automated e-Challan generation.
- **Live Video & Stream Analysis**: In-browser video player with customizable speed, frame stepping, interactive ROI plate scanning, and HUD scanlines.
- **Zero-Breakage Graceful Fallback**: Frontend automatically operates standalone with local mock store if the backend server is offline.

---

## Quick Start (Running Locally)

### 1. Run the Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 2. Run the Backend (FastAPI)
```bash
cd backend
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger API documentation is available at **`http://localhost:8000/api/docs`**.

---

## Running with Docker Compose

```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## API Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/cameras` | List all ANPR camera nodes with telemetry |
| `GET` | `/api/cameras/{code}` | Get specific camera telemetry & status |
| `PUT` | `/api/cameras/{code}/status` | Update camera operational status (ONLINE/OFFLINE/MAINTENANCE) |
| `GET` | `/api/vehicles` | Search and list vehicle database records |
| `GET` | `/api/vehicles/{plate}` | Get vehicle profile, sightings, and risk level |
| `GET` | `/api/vehicles/{plate}/trajectory`| Reconstruct multi-camera vehicle trajectory |
| `GET` | `/api/vehicles/watchlist` | Get active surveillance watchlist |
| `POST`| `/api/vehicles/watchlist` | Enlist vehicle in high-priority watchlist |
| `GET` | `/api/detections` | Retrieve recent ANPR optical detections |
| `POST`| `/api/detections` | Ingest new ANPR detection event |
| `GET` | `/api/violations` | List logged traffic violations & e-Challans |
| `GET` | `/api/alerts` | List live emergency alerts |
| `GET` | `/api/analytics/stats` | Retrieve city-wide traffic volume & KPI metrics |
| `GET` | `/api/analytics/volume/{code}` | Retrieve 24-hour hourly traffic histogram |
| `POST`| `/api/anpr/process` | Submit image frame to server-side ANPR pipeline |
| `WS`  | `/ws/live` | Real-time WebSocket feed for detections and alerts |
