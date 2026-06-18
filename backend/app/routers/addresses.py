from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.address import Address
from app.models.user import User
from app.schemas.address import AddressCreate, AddressUpdate, AddressResponse
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/addresses", tags=["Addresses"])


@router.get("/", response_model=List[AddressResponse])
def list_addresses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all addresses for the current user."""
    return db.query(Address).filter(Address.user_id == current_user.id).all()


@router.post("/", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
def create_address(
    data: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new address for the current user."""
    if data.is_default:
        db.query(Address).filter(
            Address.user_id == current_user.id, Address.is_default == True
        ).update({"is_default": False})
    address = Address(user_id=current_user.id, **data.model_dump())
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


@router.put("/{address_id}", response_model=AddressResponse)
def update_address(
    address_id: str,
    data: AddressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an address."""
    address = db.query(Address).filter(
        Address.id == address_id, Address.user_id == current_user.id
    ).first()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    update_data = data.model_dump(exclude_unset=True)
    if update_data.get("is_default"):
        db.query(Address).filter(
            Address.user_id == current_user.id, Address.is_default == True
        ).update({"is_default": False})
    for key, value in update_data.items():
        setattr(address, key, value)
    db.commit()
    db.refresh(address)
    return address


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(
    address_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an address."""
    address = db.query(Address).filter(
        Address.id == address_id, Address.user_id == current_user.id
    ).first()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    db.delete(address)
    db.commit()


@router.patch("/{address_id}/default", response_model=AddressResponse)
def set_default_address(
    address_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set an address as the default."""
    address = db.query(Address).filter(
        Address.id == address_id, Address.user_id == current_user.id
    ).first()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    db.query(Address).filter(
        Address.user_id == current_user.id, Address.is_default == True
    ).update({"is_default": False})
    address.is_default = True
    db.commit()
    db.refresh(address)
    return address
