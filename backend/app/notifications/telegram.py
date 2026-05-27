import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def send_telegram_alert(ctx: dict) -> None:
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        logger.debug("Telegram não configurado — pulando")
        return

    product = ctx["product"]
    new_price: float = ctx["new_price"]
    old_price: float = ctx["old_price"]
    pct: float = ctx["pct"]

    text = (
        f"💰 *Queda de preço detectada\\!*\n\n"
        f"*{_esc(product.name)}*\n"
        f"🏪 {_esc(product.store)}\n\n"
        f"~~R\\$ {old_price:,.2f}~~ → *R\\$ {new_price:,.2f}*\n"
        f"📉 {abs(pct):.1f}% de queda\n\n"
        f"🎯 Sua meta: R\\$ {product.alert_price:,.2f} ✅\n\n"
        f"[Ver produto]({product.url})"
    )

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
            json={
                "chat_id": settings.telegram_chat_id,
                "text": text,
                "parse_mode": "MarkdownV2",
                "disable_web_page_preview": False,
            },
        )
        resp.raise_for_status()
    logger.info(f"Alerta Telegram enviado para {product.name}")


def _esc(text: str) -> str:
    """Escapa caracteres especiais do MarkdownV2."""
    for ch in r"_*[]()~`>#+-=|{}.!":
        text = text.replace(ch, f"\\{ch}")
    return text
