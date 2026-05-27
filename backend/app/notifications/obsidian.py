import logging
import ssl
from datetime import datetime

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

VAULT_PATH = "02 - Areas/Pricewatch/alertas.md"


async def send_obsidian_note(ctx: dict) -> None:
    if not settings.obsidian_api_key:
        logger.debug("Obsidian não configurado — pulando")
        return

    product = ctx["product"]
    new_price: float = ctx["new_price"]
    old_price: float = ctx["old_price"]
    pct: float = ctx["pct"]
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    # Adiciona ao final do arquivo de alertas (append via PATCH)
    content = (
        f"\n## {now} — {product.store}\n"
        f"- **Produto:** [{product.name}]({product.url})\n"
        f"- **Preço anterior:** R$ {old_price:,.2f}\n"
        f"- **Preço atual:** R$ {new_price:,.2f} (↓ {abs(pct):.1f}%)\n"
        f"- **Meta atingida:** R$ {product.alert_price:,.2f} ✅\n"
    )

    # Obsidian Local REST API usa HTTPS com certificado auto-assinado
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    async with httpx.AsyncClient(verify=False, timeout=5) as client:
        # Tenta PATCH (append) no arquivo existente
        resp = await client.patch(
            f"{settings.obsidian_base_url}/vault/{VAULT_PATH}",
            headers={
                "Authorization": f"Bearer {settings.obsidian_api_key}",
                "Content-Type": "text/markdown",
            },
            content=content.encode(),
        )

        # Se arquivo não existe, cria com PUT
        if resp.status_code == 404:
            header = "# Alertas Pricewatch\n\nHistórico de quedas de preço detectadas.\n"
            await client.put(
                f"{settings.obsidian_base_url}/vault/{VAULT_PATH}",
                headers={
                    "Authorization": f"Bearer {settings.obsidian_api_key}",
                    "Content-Type": "text/markdown",
                },
                content=(header + content).encode(),
            )

    logger.info(f"Nota Obsidian registrada em {VAULT_PATH}")
