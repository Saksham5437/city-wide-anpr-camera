from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.vehicle import Vehicle, VehicleCreate, VehicleUpdate, WatchlistItem, WatchlistItemCreate
from app.schemas.detection import TrajectoryRoute
from app.services.vehicle.vehicle_service import vehicle_service

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

@router.get("", response_model=List[Vehicle])
def get_vehicles(limit: int = 200, db: Session = Depends(get_db)):
    return vehicle_service.get_all(db, limit)

@router.get("/watchlist", response_model=List[WatchlistItem])
def get_watchlist(db: Session = Depends(get_db)):
    return vehicle_service.get_watchlist(db)

@router.post("/watchlist", response_model=WatchlistItem, status_code=status.HTTP_201_CREATED)
def add_to_watchlist(item: WatchlistItemCreate, db: Session = Depends(get_db)):
    return vehicle_service.add_to_watchlist(db, item)

@router.get("/{plate}", response_model=Vehicle)
def get_vehicle(plate: str, db: Session = Depends(get_db)):
    veh = vehicle_service.get_by_plate(db, plate)
    if not veh:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return veh

@router.put("/{plate}", response_model=Vehicle)
def update_vehicle(plate: str, updates: VehicleUpdate, db: Session = Depends(get_db)):
    veh = vehicle_service.update(db, plate, updates)
    if not veh:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return veh

@router.get("/{plate}/trajectory", response_model=TrajectoryRoute)
@router.get("/{plate}/history", response_model=TrajectoryRoute)
def get_trajectory(plate: str, db: Session = Depends(get_db)):
    traj = vehicle_service.get_trajectory(db, plate)
    if not traj:
        raise HTTPException(status_code=404, detail="Trajectory/history not found")
    return traj

