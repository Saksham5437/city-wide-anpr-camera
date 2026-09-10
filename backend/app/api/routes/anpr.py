from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.anpr import AnprProcessingRequest, AnprProcessingResult
from app.services.anpr.pipeline import anpr_pipeline

router = APIRouter(prefix="/anpr", tags=["anpr"])

@router.post("/process", response_model=AnprProcessingResult)
def process_anpr_frame(request: AnprProcessingRequest):
    return anpr_pipeline.process_frame(request)

@router.post("/upload-image", status_code=status.HTTP_201_CREATED)
async def upload_anpr_image(
    file: UploadFile = File(...),
    camera_code: Optional[str] = Form("CAM-003"),
    camera_name: Optional[str] = Form("Hebbal Flyover Main Deck"),
    location: Optional[str] = Form("Hebbal Flyover, Bengaluru"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Direct Static Image Ingestion & ANPR Pipeline:
    Upload a vehicle/traffic image (.jpg, .jpeg, .png, .webp) to detect vehicles,
    recognize plates (international formats), extract color/make/model attributes,
    and persist permanently into MySQL 8.x database.
    """
    valid_extensions = (".jpg", ".jpeg", ".png", ".webp", ".bmp")
    if not any(file.filename.lower().endswith(ext) for ext in valid_extensions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file.filename}'. Allowed formats: JPG, JPEG, PNG, WEBP, BMP."
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    result = await anpr_pipeline.process_image_file(
        image_bytes=image_bytes,
        filename=file.filename,
        db=db,
        camera_code=camera_code or "CAM-003",
        camera_name=camera_name or "Hebbal Flyover Main Deck",
        location=location or "Hebbal Flyover, Bengaluru"
    )

    return result
