import logging

import resend

from app.config import settings

logger = logging.getLogger(__name__)


async def send_email_alert(ctx: dict) -> None:
    if not settings.resend_api_key or not settings.alert_email_to:
        logger.debug("Email não configurado — pulando")
        return

    resend.api_key = settings.resend_api_key
    product = ctx["product"]
    new_price: float = ctx["new_price"]
    old_price: float = ctx["old_price"]
    pct: float = ctx["pct"]

    html = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#08080f;font-family:'DM Sans',system-ui,sans-serif;color:#f4f4f8">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <div style="margin-bottom:24px">
      <span style="font-size:14px;font-weight:700;letter-spacing:-.03em;color:#f4f4f8">price</span><span style="font-size:14px;font-weight:700;letter-spacing:-.03em;color:#a78bfa">watch</span>
    </div>
    <h1 style="font-size:22px;font-weight:800;letter-spacing:-.04em;margin:0 0 8px">Queda de preço detectada</h1>
    <p style="color:#a1a1b5;font-size:14px;margin:0 0 24px">{product.store}</p>
    <p style="font-size:15px;font-weight:600;margin:0 0 16px;line-height:1.4">{product.name}</p>
    <div style="background:#0e0e1a;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:20px;margin-bottom:20px">
      <p style="font-size:32px;font-weight:800;letter-spacing:-.05em;color:#4ade80;margin:0 0 4px">R$ {new_price:,.2f}</p>
      <p style="font-size:13px;color:#a1a1b5;margin:0 0 12px">
        <s>R$ {old_price:,.2f}</s> &nbsp;▼ {abs(pct):.1f}%
      </p>
      <p style="font-size:12px;color:#5c5c78;margin:0">
        Sua meta era R$ {product.alert_price:,.2f} ✅
      </p>
    </div>
    <a href="{product.url}"
       style="display:inline-block;background:#a78bfa;color:#0a0010;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:-.01em">
      Ver na {product.store}
    </a>
    <p style="font-size:11px;color:#5c5c78;margin-top:32px">
      Você recebeu este email porque configurou um alerta no Pricewatch.
    </p>
  </div>
</body>
</html>
"""

    resend.Emails.send({
        "from": settings.alert_email_from,
        "to": [settings.alert_email_to],
        "subject": f"[Pricewatch] {product.name[:60]} caiu para R$ {new_price:,.2f}",
        "html": html,
    })
    logger.info(f"Alerta email enviado para {settings.alert_email_to}")
