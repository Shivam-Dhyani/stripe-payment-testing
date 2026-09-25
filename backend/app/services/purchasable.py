"""Single source of truth for resolving a purchasable line (product or variant).

Variants are optional. A product with no active variants is bought directly and
uses its own price/stock. A product WITH active variants requires choosing one,
and that variant supplies price, MRP, stock and image.

Every place that validates stock, prices a line, or decrements inventory must
go through here so the two paths can never drift apart.
"""
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.product_variant import ProductVariant


@dataclass
class Purchasable:
    product: Product
    variant: Optional[ProductVariant]
    price: Decimal
    mrp: Optional[Decimal]
    stock: int
    label: str          # variant label ("500 g · Red") or "" for plain products
    image_url: Optional[str]

    @property
    def variant_id(self) -> Optional[str]:
        return self.variant.id if self.variant else None

    def decrement_stock(self, quantity: int) -> None:
        """Reduce inventory on whichever record actually holds it."""
        if self.variant:
            self.variant.stock -= quantity
        else:
            self.product.stock -= quantity


def resolve_purchasable(
    db: Session,
    product: Product,
    variant_id: Optional[str] = None,
    *,
    require_active: bool = True,
) -> Purchasable:
    """Resolve a product (+ optional variant) into a priced, stock-checked line.

    Raises 400 when a variant is required but missing, when the variant doesn't
    belong to the product, or when it is inactive.
    """
    active_variants = [v for v in (product.variants or []) if v.is_active]

    if variant_id:
        variant = next((v for v in (product.variants or []) if v.id == variant_id), None)
        if not variant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected option is not available for this product",
            )
        if require_active and not variant.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{variant.label}' is no longer available",
            )
        return Purchasable(
            product=product,
            variant=variant,
            price=variant.price,
            mrp=variant.mrp,
            stock=variant.stock,
            label=variant.label,
            image_url=variant.image_url or product.image_url,
        )

    if active_variants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please choose an option for this product",
        )

    return Purchasable(
        product=product,
        variant=None,
        price=product.price,
        mrp=product.mrp,
        stock=product.stock,
        label="",
        image_url=product.image_url,
    )
