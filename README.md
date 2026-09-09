# City-Wide ANPR Camera Network & Intelligent Vehicle Monitoring Platform

[![Frontend: React 19](https://img.shields.io/badge/Frontend-React_19_+_TypeScript-blue.svg)](https://react.dev/)
[![Backend: FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![Database: MySQL 8.x](https://img.shields.io/badge/Database-MySQL_8.x-orange.svg)](https://www.mysql.com/)
[![Workbench: Compatible](https://img.shields.io/badge/MySQL_Workbench-Ready-blue.svg)](https://www.mysql.com/products/workbench/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-grade, city-wide surveillance command and control system engineered for real-time Automatic Number Plate Recognition (ANPR), optical vehicle tracking, speed radar enforcement (>80 km/h), red-light violations, watchlist tracking, and traffic analytics with persistent **Local MySQL 8.x database** and **MySQL Workbench** management.

---

## 🏗️ System Architecture & Data Flow

```
USER
 │
 ▼
┌────────────────────────┐
│     REACT FRONTEND     │  (Port 5173)
│   React + TypeScript   │
└───────────┬────────────┘
            │ REST API / WebSocket
            ▼
┌────────────────────────┐
│    FASTAPI BACKEND     │  (Port 8000)
│   FastAPI + Services   │
└───────────┬────────────┘
            │
            ▼ SQLAlchemy + PyMySQL
┌────────────────────────┐
│    LOCAL MYSQL 8.x     │  (Port 3306)
│  Database: city_anpr   │
└───────────┬────────────┘
            │
            ▼ Direct Desktop GUI Connection
┌────────────────────────┐
│    MYSQL WORKBENCH     │  (Desktop App)
│ 127.0.0.1:3306/city_anpr│
└────────────────────────┘
```

---

## 🗄️ Local MySQL 8.x Schema & Tables

All data is permanently persisted in the local MySQL 8.x database `city_anpr` with strict foreign key constraints and composite indexes:

1. **`cameras`**: City surveillance camera network nodes.
   - Keys: `id` (PK, String), `code` (Unique Index, String).
   - Fields: `name`, `location`, `lat`, `lng`, `zone`, `status` (`ONLINE`, `OFFLINE`, `MAINTENANCE`), `stream_url`, `fps`, `ip_address`, `uptime`.
2. **`vehicles`**: Unique physical vehicles identified by normalized plate number.
   - Keys: `id` (PK, String), `plate` (Unique Index, String).
   - Fields: `type`, `make_model`, `color`, `first_seen`, `last_seen`, `sightings_count`, `violations_count`, `is_watchlisted`, `watchlist_reason`, `risk_level`, `registered_owner`, `registered_state`, `fuel_type`.
3. **`detections`**: **Core Permanent Historical Ledger**.
   - Keys: `id` (PK, String), `vehicle_id` (FK -> `vehicles.id`), `camera_code` (FK -> `cameras.code`).
   - Fields: `plate`, `camera_name`, `location`, `lat`, `lng`, `timestamp`, `direction`, `speed`, `confidence`, `vehicle_type`, `vehicle_color`, `lane_number`, `snapshot_url`, `plate_crop_url`.
   - **Composite Indexes**:
     - `ix_detections_cam_time`: `(camera_code, timestamp)`
     - `ix_detections_plate_time`: `(plate, timestamp)`
     - `ix_detections_veh_time`: `(vehicle_id, timestamp)`
4. **`alerts`**: Real-time dispatch alerts evaluated on backend ingestion.
   - Keys: `id` (PK, String), `detection_id` (FK -> `detections.id`).
   - Fields: `title`, `type`, `category`, `vehicle_plate`, `camera_code`, `location`, `timestamp`, `description`, `status`, `action_required`.
5. **`watchlist`**: High-priority vehicle surveillance registry.
   - Keys: `id` (PK, String), `plate` (Index, String).
   - Fields: `vehicle_type`, `color`, `reason`, `priority`, `added_date`, `added_by`, `is_active`, `flagged_sightings`.
6. **`violations`**: Automated speed & traffic violations / e-Challan records.
   - Keys: `id` (PK, String), `challan_id` (Unique Index, String).
7. **`audit_logs`**: Operator and administrator action tracking.
   - Keys: `id` (PK, String), `user_id` (FK -> `users.id`).
8. **`users`**: Role-based access control (Admin, Command Supervisor, Operator).

---

## 🛠️ Local MySQL + MySQL Workbench Setup

### Step 1: Start Local MySQL 8.x Server
Ensure MySQL Server 8.0 is running on your machine:
```powershell
# On Windows PowerShell:
Start-Service MySQL80
```

### Step 2: Create the Database `city_anpr`
Open MySQL Command Line or MySQL Workbench and run:
```sql
CREATE DATABASE IF NOT EXISTS city_anpr
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### Step 3: Configure Backend Environment
Create `backend/.env` (copy from `backend/.env.example`):
```ini
DATABASE_URL=mysql+pymysql://root:YOUR_MYSQL_PASSWORD@127.0.0.1:3306/city_anpr?charset=utf8mb4
```

### Step 4: Run Alembic Database Migrations
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Run migrations to build the complete MySQL schema:
alembic upgrade head
```

*(Optional: Run `python db_tool.py` to verify the connection or `python seed_data.py` to insert initial benchmark data).*

### Step 5: Start the FastAPI Backend
```bash
uvicorn app.main:app --reload --port 8000
```
- API Documentation: **`http://localhost:8000/api/docs`**
- Health Check: **`http://localhost:8000/api/health`**

### Step 6: Start the React Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🖥️ Viewing & Managing in MySQL Workbench

1. Launch **MySQL Workbench**.
2. Click **`+`** to open a new connection:
   - **Connection Name**: `City ANPR Local`
   - **Hostname**: `127.0.0.1`
   - **Port**: `3306`
   - **Username**: `root` (or your MySQL user)
   - **Default Schema**: `city_anpr`
3. Click **Test Connection** -> enter your password -> click **OK**.
4. Double-click the connection to open the SQL Query editor.

### 🔍 Useful SQL Queries in MySQL Workbench

#### 1. View Permanent Detection History
```sql
USE city_anpr;

SELECT 
    d.id,
    d.plate,
    c.name AS camera_name,
    d.location,
    d.speed,
    d.confidence,
    d.vehicle_type,
    d.timestamp
FROM detections d
JOIN cameras c ON d.camera_code = c.code
ORDER BY d.timestamp DESC;
```

#### 2. Search History of a Specific Number Plate
```sql
USE city_anpr;

SELECT * 
FROM detections 
WHERE plate = 'KA01MJ4421' 
ORDER BY timestamp DESC;
```

#### 3. View All Registered Vehicles & Sighting Counts
```sql
USE city_anpr;

SELECT 
    plate, 
    type, 
    make_model, 
    sightings_count, 
    is_watchlisted, 
    risk_level, 
    last_seen 
FROM vehicles 
ORDER BY sightings_count DESC;
```

#### 4. View Active Emergency Alerts
```sql
USE city_anpr;

SELECT 
    id, 
    title, 
    type, 
    vehicle_plate, 
    camera_code, 
    location, 
    status, 
    timestamp 
FROM alerts 
WHERE status = 'ACTIVE';
```

---

## 🛡️ License
MIT License. Built for the Smart India Hackathon (SIH) Intelligent City-Wide ANPR Surveillance Initiative.
