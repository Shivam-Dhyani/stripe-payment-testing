from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.warehouse import Warehouse
from app.models.order import Order
from app.schemas.warehouse import WarehouseCreate, WarehouseUpdate, WarehouseResponse
from app.middleware.auth import get_current_user, get_admin_user

router = APIRouter(prefix="/warehouses", tags=["Warehouses"], redirect_slashes=False)


@router.get("", response_model=List[WarehouseResponse])
def list_warehouses(
    active_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List warehouses (any authenticated staff/customer can read)."""
    query = db.query(Warehouse)
    if active_only:
        query = query.filter(Warehouse.is_active == True)
    return query.order_by(Warehouse.created_at).all()


@router.post("", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
def create_warehouse(
    data: WarehouseCreate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Admin creates a warehouse / dark store."""
    warehouse = Warehouse(**data.model_dump())
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.get("/{warehouse_id}", response_model=WarehouseResponse)
def get_warehouse(
    warehouse_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")
    return warehouse


@router.put("/{warehouse_id}", response_model=WarehouseResponse)
def update_warehouse(
    warehouse_id: str,
    data: WarehouseUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Admin updates a warehouse."""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(warehouse, field, value)

    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.delete("/{warehouse_id}", status_code=status.HTTP_200_OK)
def deactivate_warehouse(
    warehouse_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Admin deactivates a warehouse (soft delete). Blocked if it has orders."""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")

    has_orders = db.query(Order.id).filter(Order.warehouse_id == warehouse_id).first()
    if has_orders:
        warehouse.is_active = False
        db.commit()
        return {"status": "deactivated", "message": "Warehouse has orders; deactivated instead of deleted"}

    db.delete(warehouse)
    db.commit()
    return {"status": "deleted"}
