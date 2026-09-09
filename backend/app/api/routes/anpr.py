from fastapi import APIRouter, Depends, HTTPException
from app.schemas.anpr import AnprProcessingRequest, AnprProcessingResult
from app.services.anpr.pipeline import anpr_pipeline

router = APIRouter(prefix="/anpr", tags=["anpr"])

@router.post("/process", response_model=AnprProcessingResult)
def process_anpr_frame(request: AnprProcessingRequest):
    return anpr_pipeline.process_frame(request)
