import uuid
from datetime import datetime, timedelta

from pydantic import BaseModel, field_validator


class ScrapeRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL deve começar com http:// ou https://")
        return v.strip()


class ScrapeResponse(BaseModel):
    name: str
    price: float
    image_url: str
    store: str
    currency: str = "BRL"


class ProductCreate(BaseModel):
    name: str
    url: str
    image_url: str = ""
    store: str
    current_price: float
    original_price: float | None = None
    priority: str = "media"
    category: str = "Outros"
    alert_price: float | None = None
    notes: str = ""
    group_id: uuid.UUID | None = None


class ProductUpdate(BaseModel):
    priority: str | None = None
    alert_price: float | None = None
    alert_active: bool | None = None
    notes: str | None = None
    category: str | None = None


class PricePointOut(BaseModel):
    date: str
    price: float


class ProductOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    url: str
    image_url: str
    store: str
    current_price: float
    original_price: float
    price_change_pct: float
    price_trend: str
    priority: str
    category: str
    alert_price: float | None
    alert_active: bool
    notes: str
    group_id: uuid.UUID | None
    added_at: datetime
    last_checked_at: datetime
    price_history: list[PricePointOut] = []

    @classmethod
    def from_product(cls, product, history_limit: int = 30) -> "ProductOut":
        history = sorted(product.price_history, key=lambda h: h.checked_at)
        history_out = [
            PricePointOut(date=h.checked_at.strftime("%Y-%m-%d"), price=h.price)
            for h in history[-history_limit:]
        ]

        pct, trend = _compute_change(product)

        return cls(
            id=product.id,
            name=product.name,
            url=product.url,
            image_url=product.image_url,
            store=product.store,
            current_price=product.current_price,
            original_price=product.original_price,
            price_change_pct=pct,
            price_trend=trend,
            priority=product.priority,
            category=product.category,
            alert_price=product.alert_price,
            alert_active=product.alert_active,
            notes=product.notes,
            group_id=product.group_id,
            added_at=product.added_at,
            last_checked_at=product.last_checked_at,
            price_history=history_out,
        )


def _compute_change(product) -> tuple[float, str]:
    history = sorted(product.price_history, key=lambda h: h.checked_at)
    if len(history) < 2:
        return 0.0, "stable"

    # Compare current price to the most recent entry that is at least 24h old.
    # Falls back to the earliest entry if all history is within the last 24h.
    cutoff = datetime.utcnow() - timedelta(hours=24)
    reference = history[0]
    for h in history[:-1]:
        if h.checked_at <= cutoff:
            reference = h

    if reference.price == 0:
        return 0.0, "stable"
    pct = ((product.current_price - reference.price) / reference.price) * 100
    trend = "down" if pct < -0.5 else "up" if pct > 0.5 else "stable"
    return round(pct, 2), trend
