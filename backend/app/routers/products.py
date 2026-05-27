import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.product import PriceHistory, Product
from app.schemas.product import (
    PricePointOut,
    ProductCreate,
    ProductOut,
    ProductUpdate,
)
from app.services.finder import find_alternatives

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
async def list_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Product)
        .where(Product.group_id == None)  # noqa: E711 — only top-level products
        .order_by(Product.added_at.desc())
    )
    return [ProductOut.from_product(p) for p in result.scalars().all()]


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(body: ProductCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Product).where(Product.url == body.url))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Produto já está na lista")

    product = Product(
        name=body.name,
        url=body.url,
        image_url=body.image_url,
        store=body.store,
        current_price=body.current_price,
        original_price=body.original_price or body.current_price,
        priority=body.priority,
        category=body.category,
        alert_price=body.alert_price,
        alert_active=body.alert_price is not None,
        notes=body.notes,
    )
    db.add(product)
    await db.flush()

    db.add(PriceHistory(product_id=product.id, price=body.current_price))
    await db.commit()
    await db.refresh(product)
    return ProductOut.from_product(product)


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: uuid.UUID, body: ProductUpdate, db: AsyncSession = Depends(get_db)
):
    product = await _get_or_404(product_id, db)

    if body.priority is not None:
        product.priority = body.priority
    if body.alert_price is not None:
        product.alert_price = body.alert_price
        product.alert_active = True
    if body.alert_active is not None:
        product.alert_active = body.alert_active
    if body.notes is not None:
        product.notes = body.notes
    if body.category is not None:
        product.category = body.category

    await db.commit()
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one()
    return ProductOut.from_product(product)


@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    product = await _get_or_404(product_id, db)
    await db.delete(product)
    await db.commit()


@router.get("/{product_id}/history", response_model=list[PricePointOut])
async def price_history(
    product_id: uuid.UUID, days: int = 30, db: AsyncSession = Depends(get_db)
):
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(PriceHistory)
        .where(PriceHistory.product_id == product_id)
        .where(PriceHistory.checked_at >= since)
        .order_by(PriceHistory.checked_at)
    )
    return [
        PricePointOut(date=h.checked_at.strftime("%Y-%m-%d"), price=h.price)
        for h in result.scalars().all()
    ]


@router.get("/{product_id}/alternatives", response_model=list[ProductOut])
async def get_alternatives(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await _get_or_404(product_id, db)
    result = await db.execute(
        select(Product)
        .where(Product.group_id == product_id)
        .order_by(Product.current_price)
    )
    return [ProductOut.from_product(p) for p in result.scalars().all()]


@router.post("/{product_id}/find-alternatives", response_model=list[ProductOut])
async def find_product_alternatives(
    product_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    source = await _get_or_404(product_id, db)
    raw_alternatives = await find_alternatives(source.name, source.store)

    for alt in raw_alternatives:
        existing = await db.execute(select(Product).where(Product.url == alt["url"]))
        if existing.scalar_one_or_none():
            continue
        product = Product(
            name=alt["name"],
            url=alt["url"],
            image_url=alt.get("image_url", ""),
            store=alt["store"],
            current_price=alt["current_price"],
            original_price=alt["original_price"],
            group_id=source.id,
        )
        db.add(product)
        await db.flush()
        db.add(PriceHistory(product_id=product.id, price=alt["current_price"]))

    await db.commit()

    result = await db.execute(
        select(Product)
        .where(Product.group_id == source.id)
        .order_by(Product.current_price)
    )
    return [ProductOut.from_product(p) for p in result.scalars().all()]


async def _get_or_404(product_id: uuid.UUID, db: AsyncSession) -> Product:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return product
