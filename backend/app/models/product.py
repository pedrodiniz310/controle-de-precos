import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(500))
    url: Mapped[str] = mapped_column(Text, unique=True, index=True)
    image_url: Mapped[str] = mapped_column(Text, default="")
    store: Mapped[str] = mapped_column(String(100))
    current_price: Mapped[float] = mapped_column(Float)
    original_price: Mapped[float] = mapped_column(Float)
    priority: Mapped[str] = mapped_column(String(10), default="media")
    category: Mapped[str] = mapped_column(String(100), default="Outros")
    alert_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    alert_active: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str] = mapped_column(Text, default="")
    group_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    added_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_checked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    price_history: Mapped[list["PriceHistory"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="PriceHistory.checked_at",
    )


class PriceHistory(Base):
    __tablename__ = "price_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    price: Mapped[float] = mapped_column(Float)
    checked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    product: Mapped["Product"] = relationship(back_populates="price_history")

    __table_args__ = (Index("ix_price_history_product_checked", "product_id", "checked_at"),)
