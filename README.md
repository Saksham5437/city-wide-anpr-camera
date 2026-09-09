# City-Wide ANPR Camera Network & Intelligent Vehicle Monitoring Platform

[![Frontend: React 19](https://img.shields.io/badge/Frontend-React_19_+_TypeScript-blue.svg)](https://react.dev/)
[![Backend: FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![Database: MySQL 8.x](https://img.shields.io/badge/Database-MySQL_8.x-orange.svg)](https://www.mysql.com/)
[![Workbench: Compatible](https://img.shields.io/badge/MySQL_Workbench-Ready-blue.svg)](https://www.mysql.com/products/workbench/)
[![AI: Multi-Object Tracking](https://img.shields.io/badge/AI-Multi--Object_Tracking-purple.svg)](https://github.com/Saksham5437/city-wide-anpr-camera)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-grade, city-wide surveillance command and control system engineered for real-time **Multi-Object Tracking (MOT)**, **International Automatic Number Plate Recognition (ANPR)**, **Temporal OCR Fusion**, **Three-Tier Compliance Segregation**, and persistent **Local MySQL 8.x database** management via **MySQL Workbench**.

---

## 🏗️ Advanced Video & AI Processing Architecture

```
                      UPLOADED TRAFFIC-CAMERA VIDEO
                                   │
                                   ▼
                       Video Metadata Extraction
                         (FPS, Resolution, Time)
                                   │
                                   ▼
                            Frame Sampling
                                   │
                                   ▼
                       Vehicle Detection & MOT
                      (Persistent track_id per car)
                                   │
                                   ▼
                   License Plate Localization (ROI)
                                   │
                                   ▼
                       Multi-Frame OCR Engine
                                   │
                                   ▼
                         Temporal OCR Fusion
                 (Character Voting & Confidence Weight)
                                   │
                                   ▼
                 International Standard Classification
             (India IND, USA/NA, UK, EU, GCC, Australia, Universal)
                                   │
                                   ▼
                      Three-Tier Segregation
               ┌───────────────────┼───────────────────┐
               ▼                   ▼                   ▼
          COMPLIANT            VIOLATIONS       REVIEW REQUIRED
       (Clean Vehicle)     (Speed/Signal/Lane) (Unclear / Occluded)
               └───────────────────┬───────────────────┘
                                   ▼
                   Persistent Local MySQL 8.x Database
                      (city_anpr / MySQL Workbench)
```

---

## 🗄️ MySQL Database Schema (`city_anpr`)

All processed video intelligence, vehicle passages, violations, and telemetry are permanently stored in MySQL:

1. **`videos`**: Video job ingestion ledger with processing progress and structured breakdowns.
   - Fields: `id`, `filename`, `file_path`, `duration_seconds`, `fps`, `resolution`, `frame_count`, `status` (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`), `total_vehicles`, `plates_recognized`, `plates_unreadable`, `compliant_vehicles`, `violating_vehicles`, `review_required`, `total_violations`.
2. **`vehicle_passages`**: **Vehicle-Level Physical Passage Record**.
   - Fields: `id`, `video_id`, `track_id`, `camera_code`, `vehicle_id`, `plate_number`, `plate_country`, `plate_format`, `recognition_status` (`RECOGNIZED`, `UNCERTAIN`, `UNREADABLE`), `compliance_status` (`COMPLIANT`, `VIOLATION`, `REVIEW_REQUIRED`), `vehicle_type`, `vehicle_color`, `make`, `model`, `first_seen_timestamp`, `last_seen_timestamp`, `avg_speed`, `max_speed`, `direction`, `lane_number`, `vehicle_confidence`, `plate_confidence`, `ocr_confidence`, `final_confidence`, `raw_ocr_observations` (JSON).
3. **`vehicles`**: Unique vehicle identities (`plate`, `make_model`, `color`, `type`, `owner`, `state`, `fuel_type`, `sightings_count`, `violations_count`).
4. **`detections`**: Permanent historical detection records referencing camera and vehicle.
5. **`violations`**: Traffic rule violations (`Speeding`, `Red Light`, `Wrong-Way`, `Restricted Corridor`) with severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), confidence, and evidence.
6. **`cameras`**: City surveillance nodes with telemetry and streams.
7. **`alerts`**: Real-time dispatch watchlist matches.
8. **`audit_logs`**: Operator and system action tracking.
9. **`users`**: Role-based access control.

---

## 🔍 Useful SQL Queries in MySQL Workbench

### 1. View All Vehicle Passages with 3-Tier Classification
```sql
USE city_anpr;

SELECT 
    p.track_id AS 'Track #',
    p.plate_number AS 'Plate Number',
    p.plate_country AS 'Country / Standard',
    p.compliance_status AS 'Compliance',
    p.vehicle_type AS 'Type',
    p.vehicle_color AS 'Color',
    p.make AS 'Make',
    p.model AS 'Model',
    p.max_speed AS 'Max Speed (km/h)',
    p.final_confidence AS 'Conf %',
    p.first_seen_timestamp AS 'Time'
FROM vehicle_passages p
ORDER BY p.created_at DESC;
```

### 2. View Violations and Evidence Records
```sql
USE city_anpr;

SELECT 
    v.id,
    v.plate,
    v.type AS 'Violation Type',
    v.severity,
    v.speed_recorded AS 'Speed (km/h)',
    v.speed_limit AS 'Limit',
    v.fine_amount AS 'Fine (INR)',
    v.status,
    v.description,
    v.timestamp
FROM violations v
ORDER BY v.created_at DESC;
```

### 3. View Video Processing Summaries
```sql
USE city_anpr;

SELECT 
    v.filename,
    v.status,
    v.duration_seconds AS 'Duration (s)',
    v.total_vehicles AS 'Total Vehicles',
    v.plates_recognized AS 'Plates Read',
    v.compliant_vehicles AS 'Compliant',
    v.violating_vehicles AS 'Violations',
    v.review_required AS 'Review Required'
FROM videos v
ORDER BY v.created_at DESC;
```

---

## 🚀 Running the Full Stack

### 1. Start FastAPI Backend:
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 2. Start React Frontend:
```bash
cd frontend
npm run dev
```

### 3. Open MySQL Workbench:
- Connect to `127.0.0.1:3306` with user `root` (password: `Sakre5437`).
- Schema: `city_anpr`.

---

## 🛡️ License
MIT License. Built for the Smart India Hackathon (SIH) Intelligent City-Wide ANPR Surveillance Initiative.
