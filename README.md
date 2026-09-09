# City-Wide ANPR Camera Network & Intelligent Vehicle Monitoring Platform

[![Frontend: React 19](https://img.shields.io/badge/Frontend-React_19_+_TypeScript-blue.svg)](https://react.dev/)
[![Backend: FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![Database: MySQL 8.x](https://img.shields.io/badge/Database-MySQL_8.x-orange.svg)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-grade, city-wide surveillance command and control system engineered for real-time Automatic Number Plate Recognition (ANPR), optical vehicle tracking, speed radar enforcement (>80 km/h), red-light violations, watchlist tracking, and traffic analytics.

---

## 🏗️ Target Full-Stack Architecture

```
USER
 │
 ▼
┌────────────────────┐
│      FRONTEND      │
│ React + TypeScript │
│      + Vite        │
└─────────┬──────────┘
          │ REST API / WebSocket
          ▼
┌────────────────────┐
│      BACKEND       │
│      FastAPI       │
└─────────┬──────────┘
          │
 ┌────────┼────────────────┐
 │        │                │
 ▼        ▼                ▼
Business  ANPR Services    Authentication
Logic     ┌────┴────┐
          ▼         ▼
        YOLO       OCR
          └─────────┴────┬────┘
                         ▼
                  Detection Engine
                         │
                         ▼ SQLAlchemy + PyMySQL
                  ┌──────────────┐
                  │  MySQL 8.x   │
                  │ (city_anpr)  │
                  └──────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       Vehicles      Detections       Alerts
                         │
                         ▼
                 Permanent History
```

---

## 📁 Repository Structure

```
city-wide-anpr-camera/
│
├── frontend/                     # React + TypeScript + Vite Client
│   ├── src/
│   │   ├── components/           # 100% UI preservation across all tabs & views
│   │   ├── services/
│   │   │   └── api/              # Centralized API service layer (auth, cameras, vehicles, detections, alerts, analytics)
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
│   ├── alembic/                  # Alembic database migration scripts
│   ├── alembic.ini               # Alembic configuration
│   ├── storage/                  # Evidence & vehicle image file storage
│   │   ├── vehicles/             # Full vehicle capture snapshots
│   │   ├── plates/               # Cropped license plate images
│   │   └── evidence/             # Violation evidence packages
│   ├── app/
│   │   ├── main.py               # Application entrypoint, CORS, static storage mounting
│   │   ├── api/
│   │   │   └── routes/           # REST & WebSocket endpoints
│   │   │       ├── auth.py       # Authentication & role management (/api/auth)
│   │   │       ├── cameras.py    # Camera management (/api/cameras)
│   │   │       ├── vehicles.py   # Vehicle registry & history (/api/vehicles)
│   │   │       ├── detections.py # Permanent detection ingestion & pagination (/api/detections)
│   │   │       ├── violations.py # Traffic violations & challans (/api/violations)
│   │   │       ├── alerts.py     # Real-time alert dispatch (/api/alerts)
│   │   │       ├── analytics.py  # Aggregated metrics & traffic volume (/api/analytics)
│   │   │       ├── anpr.py       # Server-side ANPR frame processing (/api/anpr)
│   │   │       └── websocket.py  # Real-time WebSockets (/ws/live, /ws/detections, /ws/alerts, /ws/cameras)
│   │   ├── core/                 # Config (Pydantic), security, WebSocket manager
│   │   ├── database/             # SQLAlchemy engine, session factory, base model
│   │   ├── models/               # SQLAlchemy ORM models (users, cameras, vehicles, detections, alerts, audit_logs)
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── anpr/             # Modular ANPR pipeline (detector, plate locator, OCR, validation)
│   │   │   ├── camera/           # Camera telemetry & state management
│   │   │   ├── vehicle/          # Vehicle database & trajectory calculation
│   │   │   ├── detection/        # Permanent detection storage & duplicate suppression
│   │   │   ├── alerts/           # Alert evaluation & dispatch
│   │   │   └── analytics/        # Database aggregation queries & traffic charts
│   │   └── utils/
│   │       └── storage.py        # File storage abstraction
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
│
├── docker-compose.yml            # Multi-service stack (frontend, backend, MySQL 8.x)
└── README.md
```

---

## 🗄️ Database Design (MySQL 8.x)

The database schema is designed with proper normalization, foreign keys, and indexing:

1. **`vehicles`**: Unique physical vehicles identified by normalized number plate (`KA01AB1234`).
   - Fields: `id`, `plate` (unique, indexed), `type`, `make_model`, `color`, `first_seen`, `last_seen`, `sightings_count`, `violations_count`, `is_watchlisted`, `watchlist_reason`, `risk_level`, `registered_owner`, `registered_state`, `fuel_type`.
2. **`cameras`**: City surveillance camera network nodes.
   - Fields: `id`, `code` (unique, indexed), `name`, `location`, `lat`, `lng`, `zone`, `status` (`ONLINE`, `OFFLINE`, `MAINTENANCE`), `camera_type`, `ai_modules`, `vehicles_per_min`, `traffic_level`, `stream_url`, `resolution`, `fps`, `ip_address`, `uptime`.
3. **`detections`**: **Core Historical Ledger** — every valid recognition is stored permanently.
   - Fields: `id`, `vehicle_id`, `plate`, `camera_code`, `camera_name`, `location`, `lat`, `lng`, `timestamp`, `direction`, `speed`, `confidence`, `vehicle_type`, `vehicle_color`, `lane_number`, `snapshot_url`, `plate_crop_url`.
   - **Important Principle**: A Vehicle and a Detection are separate entities. Multiple detections never overwrite past sightings.
4. **`alerts`**: Real-time dispatch alerts generated by backend business rules.
   - Fields: `id`, `title`, `type`, `category`, `vehicle_plate`, `camera_code`, `location`, `timestamp`, `description`, `status`, `action_required`.
5. **`audit_logs`**: Tamper-evident operator action trail.
   - Fields: `id`, `user_id`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`, `created_at`.
6. **`users`**: Role-based access control (Admin, Operator, Viewer).

---

## 🧠 ANPR Engine: Implemented vs Future AI Integration

### Currently Implemented
- **Universal Plate Normalizer & Validator**: Cleans whitespace, hyphens, and classifies format standards (Indian IND, US, EU, Universal Alphanumeric).
- **Client & Server-side OCR Engine**: Optical character extraction on localized ROIs with confidence scoring.
- **Permanent Detection Transaction Lifecycle**: `Detection -> Normalize -> Vehicle Lookup/Create -> Update Sightings -> Insert Permanent Detection Record -> Evaluate Alerts -> Broadcast WebSocket`.
- **Duplicate Suppression**: Configurable time-window suppression (`DUPLICATE_WINDOW_SECONDS`) to prevent duplicate live alert spamming while preserving complete historical records.
- **Evidence Storage**: Base64 image ingestion saving full vehicle captures and plate crops to filesystem/storage abstraction (`/storage/`).

### Future AI Integration (Interfaces Ready)
- `detector.py`: Clean interface ready for YOLOv8/v10 PyTorch / ONNX model weight integration.
- `plate_detector.py`: Specialized bounding box locator for small-object license plate detection.
- `ocr.py`: Pluggable backend for EasyOCR, PaddleOCR, or CRNN TensorRT inference.

---

## 🚀 Quick Start (Running Locally)

### Prerequisites
- **Node.js**: v18+
- **Python**: v3.10+
- **MySQL**: 8.x (or fallback SQLite for zero-config testing)

### 1. Frontend Setup (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 2. Backend Setup (FastAPI + MySQL)
```bash
cd backend
python -m venv venv

# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Run database migrations (optional, tables also auto-create on startup):
alembic upgrade head

# Launch FastAPI server:
uvicorn app.main:app --reload --port 8000
```
- Interactive Swagger API: **`http://localhost:8000/api/docs`**
- Health Check: **`http://localhost:8000/api/health`**

---

## 🐳 Running with Docker Compose

```bash
docker-compose up --build
```
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **MySQL 8.x**: `localhost:3306` (with persistent volume `mysqldata`)

---

## 📡 REST & WebSocket API Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service and database connectivity health check |
| `POST`| `/api/auth/login` | Operator / Admin login |
| `POST`| `/api/auth/logout` | Session logout |
| `GET` | `/api/auth/me` | Current authenticated user profile |
| `GET` | `/api/cameras` | List all ANPR camera nodes with telemetry |
| `GET` | `/api/cameras/{code}` | Get specific camera telemetry & status |
| `PUT` | `/api/cameras/{code}/status` | Update camera operational status |
| `GET` | `/api/vehicles` | Search and list vehicle database records |
| `GET` | `/api/vehicles/{plate}` | Get vehicle profile, sightings, and risk level |
| `GET` | `/api/vehicles/{plate}/history` | Reconstruct multi-camera vehicle movement history |
| `GET` | `/api/vehicles/watchlist` | Get active surveillance watchlist |
| `POST`| `/api/vehicles/watchlist` | Enlist vehicle in high-priority watchlist |
| `GET` | `/api/detections` | Paginated search (`?page=1&limit=50&plate=...&camera_code=...`) |
| `POST`| `/api/detections` | Ingest new ANPR detection (permanently stored in MySQL) |
| `GET` | `/api/alerts` | List live emergency alerts |
| `PUT` | `/api/alerts/{id}/resolve` | Resolve emergency alert |
| `GET` | `/api/analytics/overview` | Aggregated city ANPR KPI overview |
| `GET` | `/api/analytics/detections` | Vehicle type & top camera distributions |
| `GET` | `/api/analytics/traffic` | 24-hour hourly traffic histogram |
| `POST`| `/api/anpr/process` | Submit image frame to server-side ANPR pipeline |
| `WS`  | `/ws/live` | Real-time WebSocket feed for detections and alerts |

---

## 🛡️ License
MIT License. Built for the Smart India Hackathon (SIH) Intelligent Traffic Management & ANPR Surveillance Initiative.
