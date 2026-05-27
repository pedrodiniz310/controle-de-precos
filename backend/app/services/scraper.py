"""
Scraper em duas camadas:
  1. httpx + BeautifulSoup (rápido, ~0.5s)
  2. Playwright headless como fallback (JS-rendered, ~3-5s)

Parsers específicos por loja complementam a leitura de Open Graph tags.
"""
import logging
import re
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from app.schemas.product import ScrapeResponse

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

STORE_MAP = {
    "amazon.com.br": "Amazon BR",
    "amazon.com": "Amazon",
    "mercadolivre.com.br": "Mercado Livre",
    "mercadolibre.com.br": "Mercado Livre",
    "magazineluiza.com.br": "Magazine Luiza",
    "magalu.com.br": "Magazine Luiza",
    "shopee.com.br": "Shopee",
    "shopee.com": "Shopee",
    "aliexpress.com": "AliExpress",
    "pt.aliexpress.com": "AliExpress",
    "americanas.com.br": "Americanas",
    "submarino.com.br": "Submarino",
    "casasbahia.com.br": "Casas Bahia",
    "kabum.com.br": "KaBuM!",
    "extra.com.br": "Extra",
}


def detect_store(url: str) -> str:
    host = urlparse(url).netloc.lower().removeprefix("www.")
    for domain, name in STORE_MAP.items():
        if domain in host:
            return name
    return host.split(".")[0].title()


def parse_brl(text: str) -> float | None:
    """R$ 1.349,90 → 1349.9"""
    digits = re.sub(r"[^\d,]", "", text)
    if not digits:
        return None
    normalized = digits.replace(".", "").replace(",", ".")
    try:
        return float(normalized)
    except ValueError:
        return None


# ── Site-specific parsers ───────────────────────────────────────────────────

def _parse_amazon(soup: BeautifulSoup) -> dict:
    data: dict = {}

    title = soup.find(id="productTitle")
    if title:
        data["name"] = title.get_text(strip=True)

    for sel in [
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        ".a-price .a-offscreen",
        "#corePrice_feature_div .a-price .a-offscreen",
        "#apex_desktop .a-price .a-offscreen",
    ]:
        el = soup.select_one(sel)
        if el:
            price = parse_brl(el.get_text(strip=True))
            if price:
                data["price"] = price
                break

    img = soup.find(id="landingImage")
    if img:
        data["image_url"] = img.get("data-old-hires") or img.get("src", "")

    return data


def _parse_mercadolivre(soup: BeautifulSoup) -> dict:
    data: dict = {}

    title = soup.select_one("h1.ui-pdp-title")
    if title:
        data["name"] = title.get_text(strip=True)

    # Itera todas as frações de preço, pulando as riscadas (andes-money-amount--previous).
    # O primeiro preço não-riscado é o preço atual/promocional.
    for fraction in soup.select(".andes-money-amount__fraction"):
        if fraction.find_parent(class_=lambda c: c and any("previous" in x for x in (c if isinstance(c, list) else [c]))):
            continue
        raw = fraction.get_text(strip=True)
        amount_el = fraction.find_parent(class_=lambda c: c and "andes-money-amount" in " ".join(c if isinstance(c, list) else [c]))
        if amount_el:
            cents = amount_el.select_one(".andes-money-amount__cents")
            if cents:
                raw += f",{cents.get_text(strip=True)}"
        price = parse_brl(raw)
        if price:
            data["price"] = price
            break

    # Prioridade: data-zoom (alta res) > srcset maior > src
    # Não sobrescreve o OG image que é a imagem canônica do ML
    img = soup.select_one(".ui-pdp-image.ui-pdp-gallery__figure__image, .ui-pdp-image")
    if img:
        zoom = img.get("data-zoom", "")
        src = img.get("src", "")
        # Pega maior imagem do srcset se disponível
        srcset = img.get("srcset", "")
        best_src = src
        if srcset:
            candidates = [s.strip().split(" ")[0] for s in srcset.split(",") if s.strip()]
            if candidates:
                best_src = candidates[-1]  # último = maior resolução
        data["image_url"] = zoom or best_src

    return data


def _parse_magalu(soup: BeautifulSoup) -> dict:
    data: dict = {}

    title = soup.select_one('[data-testid="heading-product-title"]') or soup.select_one("h1")
    if title:
        data["name"] = title.get_text(strip=True)

    price_el = soup.select_one('[data-testid="price-value"]')
    if price_el:
        price = parse_brl(price_el.get_text(strip=True))
        if price:
            data["price"] = price

    img = soup.select_one('[data-testid="image-selected-item"]') or soup.select_one("picture img")
    if img:
        data["image_url"] = img.get("src", "")

    return data


def _parse_aliexpress(soup: BeautifulSoup) -> dict:
    data: dict = {}

    title = soup.select_one("h1.product-title-text") or soup.select_one('[class*="product-title"]')
    if title:
        data["name"] = title.get_text(strip=True)

    # AliExpress usa JSON-LD e também window.runParams / meta tags de preço
    for sel in ['[class*="product-price-value"]', '[class*="uniform-banner-box-price"]']:
        el = soup.select_one(sel)
        if el:
            price = parse_brl(el.get_text(strip=True))
            if price:
                data["price"] = price
                break

    img = soup.select_one("[class*='magnifier-image']") or soup.select_one("img.magnifier-image")
    if img:
        data["image_url"] = img.get("src", "")

    return data


def _parse_shopee(soup: BeautifulSoup) -> dict:
    # Shopee é heavy JS — Open Graph é a melhor aposta no estático
    return {}


PARSERS = {
    "Amazon BR": _parse_amazon,
    "Amazon": _parse_amazon,
    "Mercado Livre": _parse_mercadolivre,
    "Magazine Luiza": _parse_magalu,
    "AliExpress": _parse_aliexpress,
    "Shopee": _parse_shopee,
}


# ── Open Graph fallback ─────────────────────────────────────────────────────

def _read_og(soup: BeautifulSoup) -> dict:
    result = {}
    for prop in ["title", "image", "price:amount"]:
        tag = soup.find("meta", property=f"og:{prop}")
        if tag and tag.get("content"):
            result[prop] = tag["content"].strip()
    return result


# ── JSON-LD structured data fallback ────────────────────────────────────────

def _read_json_ld(soup: BeautifulSoup) -> dict:
    import json

    result: dict = {}
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            obj = json.loads(tag.string or "")
        except Exception:
            continue
        # Handle both single object and array
        items = obj if isinstance(obj, list) else [obj]
        for item in items:
            if item.get("@type") not in ("Product", "ItemPage"):
                continue
            if not result.get("name") and item.get("name"):
                result["name"] = item["name"]
            if not result.get("image_url"):
                img = item.get("image")
                if isinstance(img, list):
                    img = img[0]
                if isinstance(img, dict):
                    img = img.get("url", "")
                if img:
                    result["image_url"] = img
            offers = item.get("offers") or item.get("Offers")
            if not offers:
                continue
            if isinstance(offers, list):
                offers = offers[0]
            price_raw = offers.get("price") or offers.get("lowPrice")
            if price_raw is not None:
                try:
                    result["price"] = float(str(price_raw).replace(",", "."))
                except ValueError:
                    pass
            if result.get("name") and result.get("price"):
                break
    return result


def _merge(data: dict, og: dict, ld: dict | None = None) -> dict:
    if not data.get("name"):
        data["name"] = og.get("title", "") or (ld or {}).get("name", "")
    if not data.get("image_url"):
        data["image_url"] = og.get("image", "") or (ld or {}).get("image_url", "")
    if not data.get("price"):
        if og.get("price:amount"):
            data["price"] = parse_brl(og["price:amount"])
        elif (ld or {}).get("price"):
            data["price"] = ld["price"]
    return data


# ── Playwright fallback ─────────────────────────────────────────────────────

async def _scrape_playwright(url: str, store: str) -> dict:
    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
            )
            ctx = await browser.new_context(
                user_agent=HEADERS["User-Agent"],
                locale="pt-BR",
                viewport={"width": 1280, "height": 800},
            )
            page = await ctx.new_page()
            await page.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")
            await page.goto(url, wait_until="networkidle", timeout=45_000)
            await page.wait_for_timeout(4_000)
            html = await page.content()
            await browser.close()

        soup = BeautifulSoup(html, "lxml")
        fractions = soup.select(".andes-money-amount__fraction")
        logger.info(f"Playwright: {len(fractions)} price fractions encontrados para {store}")
        parser = PARSERS.get(store)
        data = parser(soup) if parser else {}
        og = _read_og(soup)
        ld = _read_json_ld(soup)
        result = _merge(data, og, ld)
        logger.info(f"Playwright resultado: {result}")
        return result

    except Exception as exc:
        logger.warning(f"Playwright falhou para {url}: {exc}", exc_info=True)
        return {}


# ── Public entry point ──────────────────────────────────────────────────────

async def scrape_url(url: str) -> ScrapeResponse:
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=20) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ValueError(f"Loja retornou {exc.response.status_code} para a URL") from exc
        except Exception as exc:
            raise ValueError(f"Falha ao acessar URL: {exc}") from exc

    # Detect store from the final URL after all redirects (fixes a.co, amzn.to, etc.)
    final_url = str(resp.url)
    store = detect_store(final_url)
    logger.info(f"URL final após redirect: {final_url} → loja: {store}")

    soup = BeautifulSoup(resp.text, "lxml")
    parser = PARSERS.get(store)
    data = parser(soup) if parser else {}
    og = _read_og(soup)
    ld = _read_json_ld(soup)
    data = _merge(data, og, ld)

    # Se ainda falta nome ou preço, tenta Playwright com a URL final
    if not data.get("name") or not data.get("price"):
        logger.info(f"Usando Playwright como fallback para {store}")
        pw_data = await _scrape_playwright(final_url, store)
        for key in ("name", "price", "image_url"):
            if not data.get(key) and pw_data.get(key):
                data[key] = pw_data[key]

    if not data.get("price"):
        raise ValueError("Não foi possível extrair o preço. Verifique se a URL é de uma página de produto.")

    return ScrapeResponse(
        name=data.get("name") or "Produto",
        price=data["price"],
        image_url=data.get("image_url", ""),
        store=store,
    )
