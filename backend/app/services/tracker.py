import logging
from datetime import datetime

from sqlalchemy import select

from app.database import SessionLocal
from app.models.product import PriceHistory, Product
from app.services.alerts import dispatch_alerts
from app.services.scraper import scrape_url

logger = logging.getLogger(__name__)


async def check_all_prices() -> None:
    logger.info("Price tracker: iniciando ciclo de verificação")
    checked = 0
    alerted = 0

    async with SessionLocal() as db:
        result = await db.execute(select(Product))
        products = result.scalars().all()

        for product in products:
            try:
                triggered = await _check_one(product, db)
                if triggered:
                    alerted += 1
                checked += 1
            except Exception as exc:
                logger.error(f"Erro ao verificar '{product.name}': {exc}")

    logger.info(f"Price tracker: {checked} produtos verificados, {alerted} alertas disparados")


async def _check_one(product: Product, db) -> bool:
    scraped = await scrape_url(product.url)
    new_price = scraped.price
    old_price = product.current_price

    product.current_price = new_price
    product.last_checked_at = datetime.utcnow()
    db.add(PriceHistory(product_id=product.id, price=new_price))
    await db.commit()

    should_alert = (
        product.alert_active
        and product.alert_price is not None
        and new_price <= product.alert_price
        and old_price > product.alert_price  # dispara só na primeira vez que cruza a meta
    )

    if should_alert:
        await dispatch_alerts(product, new_price, old_price)
        logger.info(f"Alerta disparado: '{product.name}' R$ {old_price:.2f} → R$ {new_price:.2f}")

    return should_alert
