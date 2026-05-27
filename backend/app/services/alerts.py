import asyncio
import logging

from app.models.product import Product
from app.notifications.email import send_email_alert
from app.notifications.obsidian import send_obsidian_note
from app.notifications.telegram import send_telegram_alert

logger = logging.getLogger(__name__)


async def dispatch_alerts(product: Product, new_price: float, old_price: float) -> None:
    pct = ((new_price - old_price) / old_price) * 100
    ctx = {
        "product": product,
        "new_price": new_price,
        "old_price": old_price,
        "pct": pct,
    }

    # Dispara todos os canais em paralelo; falhas individuais não bloqueiam os demais
    results = await asyncio.gather(
        send_telegram_alert(ctx),
        send_email_alert(ctx),
        send_obsidian_note(ctx),
        return_exceptions=True,
    )

    channels = ["Telegram", "Email", "Obsidian"]
    for channel, result in zip(channels, results):
        if isinstance(result, Exception):
            logger.warning(f"Canal {channel} falhou: {result}")
