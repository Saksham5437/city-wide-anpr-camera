from typing import List, Optional, Union, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.passage import VehiclePassageModel
from app.schemas.passage import VehiclePassage, PassagePaginatedResponse

router = APIRouter(prefix="/passages", tags=["passages"])

@router.get("", response_model=Union[List[VehiclePassage], PassagePaginatedResponse])
def get_passages(
    page: Optional[int] = None,
    limit: int = 50,
    compliance_status: Optional[str] = Query(None, description="COMPLIANT, VIOLATION, or REVIEW_REQUIRED"),
    vehicle_type: Optional[str] = None,
    plate: Optional[str] = None,
    country: Optional[str] = None,
    camera_code: Optional[str] = None,
    min_confidence: Optional[float] = None,
    db: Session = Depends(get_db)
):
    query = db.query(VehiclePassageModel)

    if compliance_status:
        query = query.filter(VehiclePassageModel.compliance_status == compliance_status.upper())

    if vehicle_type:
        query = query.filter(VehiclePassageModel.vehicle_type.ilike(vehicle_type))

    if plate:
        clean = plate.upper().replace(" ", "").replace("-", "")
        query = query.filter(VehiclePassageModel.plate_number.like(f"%{clean}%"))

    if country:
        query = query.filter(VehiclePassageModel.plate_country.ilike(f"%{country}%"))

    if camera_code:
        query = query.filter(VehiclePassageModel.camera_code == camera_code)

    if min_confidence is not None:
        query = query.filter(VehiclePassageModel.final_confidence >= min_confidence)

    if page is not None:
        total = query.count()
        offset = (page - 1) * limit
        items = query.order_by(VehiclePassageModel.created_at.desc()).offset(offset).limit(limit).all()
        return PassagePaginatedResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=(total + limit - 1) // limit if total > 0 else 1
        )

    return query.order_by(VehiclePassageModel.created_at.desc()).limit(limit).all()

@router.get("/{passage_id}", response_model=VehiclePassage)
def get_passage_by_id(passage_id: str, db: Session = Depends(get_db)):
    passage = db.query(VehiclePassageModel).filter(VehiclePassageModel.id == passage_id).first()
    if not passage:
        raise HTTPException(status_code=404, detail="Vehicle passage record not found")
    return passage
