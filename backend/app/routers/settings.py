from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_admin_user
from app.models.user import User
from app.services.fees import get_settings
from app.schemas.store_settings import StoreSettingsResponse, StoreSettingsUpdate

router = APIRouter(prefix="/settings", tags=["Store Settings"], redirect_slashes=False)


@router.get("", response_model=StoreSettingsResponse)
def read_settings(db: Session = Depends(get_db)):
    """Public: fees/threshold/tax so the cart & checkout can show a bill that
    matches what the backend charges."""
    return get_settings(db)


@router.put("", response_model=StoreSettingsResponse)
def update_settings(
    data: StoreSettingsUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Admin: update store fees, free-delivery threshold and tax."""
    s = get_settings(db)
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(s, field, Decimal(str(value)))
    db.commit()
    db.refresh(s)
    return s
