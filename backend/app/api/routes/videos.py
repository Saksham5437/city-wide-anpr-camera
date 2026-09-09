import os
import uuid
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.video import VideoModel
from app.models.passage import VehiclePassageModel
from app.models.violation import ViolationModel
from app.schemas.video import VideoJobResponse, VideoJobProgress, VideoSummaryBreakdown
from app.schemas.passage import VehiclePassage
from app.services.anpr.video_processor import video_processor
from app.core.config import settings

router = APIRouter(prefix="/videos", tags=["videos"])

@router.post("/upload", response_model=VideoJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_traffic_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    camera_code: Optional[str] = Form("CAM-V01"),
    location: Optional[str] = Form("Video ANPR Camera Stream"),
    db: Session = Depends(get_db)
):
    video_id = f"vid-{uuid.uuid4().hex[:12]}"
    videos_dir = os.path.join(settings.STORAGE_PATH, "videos")
    os.makedirs(videos_dir, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1] or ".mp4"
    saved_filename = f"{video_id}{file_extension}"
    saved_path = os.path.join(videos_dir, saved_filename)
    
    # Save video file
    content = await file.read()
    with open(saved_path, "wb") as f:
        f.write(content)

    video_record = VideoModel(
        id=video_id,
        filename=file.filename,
        file_path=saved_path,
        file_size_bytes=len(content),
        camera_code=camera_code,
        location=location,
        status="QUEUED",
        progress_percentage=0.0
    )
    db.add(video_record)
    db.commit()
    db.refresh(video_record)

    # Spawn background processing
    background_tasks.add_task(video_processor.process_video_job_async, video_id)

    return video_record

@router.get("", response_model=List[VideoJobResponse])
def get_all_videos(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(VideoModel).order_by(VideoModel.created_at.desc()).limit(limit).all()

@router.get("/jobs/{job_id}", response_model=VideoJobResponse)
def get_video_job(job_id: str, db: Session = Depends(get_db)):
    video = db.query(VideoModel).filter(VideoModel.id == job_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video job not found")
    return video

@router.get("/summary/{video_id}", response_model=VideoSummaryBreakdown)
def get_video_summary(video_id: str, db: Session = Depends(get_db)):
    video = db.query(VideoModel).filter(VideoModel.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    passages = db.query(VehiclePassageModel).filter(VehiclePassageModel.video_id == video_id).all()
    violations = db.query(ViolationModel).filter(ViolationModel.passage_id.in_([p.id for p in passages])).all()

    by_vtype = {}
    by_country = {}
    by_compliance = {"COMPLIANT": 0, "VIOLATION": 0, "REVIEW_REQUIRED": 0}

    for p in passages:
        by_vtype[p.vehicle_type] = by_vtype.get(p.vehicle_type, 0) + 1
        by_country[p.plate_country] = by_country.get(p.plate_country, 0) + 1
        by_compliance[p.compliance_status] = by_compliance.get(p.compliance_status, 0) + 1

    by_violation = {}
    for v in violations:
        by_violation[v.type] = by_violation.get(v.type, 0) + 1

    return VideoSummaryBreakdown(
        total_vehicles=video.total_vehicles,
        unique_vehicles=video.unique_vehicles,
        plates_recognized=video.plates_recognized,
        plates_unreadable=video.plates_unreadable,
        compliant_vehicles=video.compliant_vehicles,
        violating_vehicles=video.violating_vehicles,
        review_required=video.review_required,
        total_violations=video.total_violations,
        by_vehicle_type=by_vtype,
        by_violation_type=by_violation,
        by_country=by_country,
        by_compliance=by_compliance
    )

@router.get("/{video_id}/passages", response_model=List[VehiclePassage])
def get_video_passages(video_id: str, db: Session = Depends(get_db)):
    return db.query(VehiclePassageModel).filter(VehiclePassageModel.video_id == video_id).order_by(VehiclePassageModel.track_id.asc()).all()
