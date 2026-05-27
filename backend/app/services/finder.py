"""
Cross-marketplace product finder.
Two-pass strategy:
  1. httpx (fast, ~1s) — works for APIs and SSR pages
  2. Playwright sync in thread (avoids Windows asyncio subprocess issue)
"""
import asyncio
import json
import logging
import re
from urllib.parse import quote_plus, urljoin

import httpx
from bs4 import BeautifulSoup

from app.services.scraper import HEADERS, scrape_url

logger = logging.getLogger(__name__)


def _clean_query(name: str) -> str:
    clean = name
    clean = re.sub(r",.*$", "", clean)
    clean = re.sub(r"\s*[-–—]\s*[A-Z0-9][A-Z0-9/_\-]{2,}$", "", clean)
    clean = re.sub(r"\bUSB[\s\-]?[\d.]+\b", "", clean, flags=re.IGNORECASE)
    clean = re.sub(r"\bGen[\s\-]?\d\b", "", clean, flags=re.IGNORECASE)
    clean = re.sub(
        r"\b(preto|branco|azul|vermelho|verde|rosa|dourado|prata|cinza|"
        r"amarelo|laranja|roxo|colorido|e\s+\w+)\b",
        "", clean, flags=re.IGNORECASE,
    )
    clean = re.sub(
        r"\b(frete grátis|produto novo|versão|edição|original|lacrado|garantia|"
        r"lacrada|novo|usado|bivolt|110v|220v)\b",
        "", clean, flags=re.IGNORECASE,
    )
    clean = re.sub(r"\([^)]*\)", "", clean)
    clean = re.sub(r"\s+", " ", clean).strip(" ,.-")
    return clean[:60].strip()


# ── Mercado Livre (API + website fallback) ─────────────────────────────────

async def _search_mercadolivre(query: str) -> str | None:
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.get(
                "https://api.mercadolibre.com/sites/MLB/search",
                params={"q": query, "limit": 3},
                headers={"User-Agent": HEADERS["User-Agent"]},
            )
            if resp.status_code == 200:
                items = resp.json().get("results", [])
                if items:
                    return items[0].get("permalink")
            logger.info(f"ML API → {resp.status_code}")
    except Exception as exc:
        logger.warning(f"ML API: {exc}")

    try:
        url = f"https://lista.mercadolivre.com.br/{quote_plus(query)}"
        async with httpx.AsyncClient(
            headers=HEADERS, follow_redirects=True, timeout=15
        ) as client:
            resp = await client.get(url)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "lxml")
            for sel in [
                "a.ui-search-link",
                'a[href*="produto.mercadolivre"]',
                'a[href*="MLB-"]',
            ]:
                link = soup.select_one(sel)
                if link:
                    href = link.get("href", "")
                    if href:
                        return href.split("?")[0]
    except Exception as exc:
        logger.warning(f"ML scrape: {exc}")
    return None


# ── Generic httpx search ───────────────────────────────────────────────────

async def _search_store_httpx(
    search_url: str, selector: str, base_url: str
) -> str | None:
    try:
        async with httpx.AsyncClient(
            headers=HEADERS, follow_redirects=True, timeout=15
        ) as client:
            resp = await client.get(search_url)
        if resp.status_code >= 400:
            logger.info(f"httpx {base_url} → {resp.status_code}")
            return None

        soup = BeautifulSoup(resp.text, "lxml")

        link = soup.select_one(selector)
        if link:
            href = link.get("href", "")
            if href:
                return href if href.startswith("http") else urljoin(base_url, href)

        script = soup.find("script", {"id": "__NEXT_DATA__"})
        if script and script.string:
            try:
                data = json.loads(script.string)
                for path in [
                    ["props", "pageProps", "search", "products"],
                    ["props", "pageProps", "products"],
                    ["props", "pageProps", "data", "products"],
                ]:
                    node = data
                    for key in path:
                        node = node.get(key) if isinstance(node, dict) else None
                        if node is None:
                            break
                    if isinstance(node, list) and node:
                        for field in ("url", "link", "permalink"):
                            url = node[0].get(field)
                            if url:
                                return (
                                    url
                                    if url.startswith("http")
                                    else urljoin(base_url, url)
                                )
            except (json.JSONDecodeError, AttributeError):
                pass
    except Exception as exc:
        logger.warning(f"httpx {base_url}: {exc}")
    return None


# ── Playwright sync (runs in thread to avoid Windows asyncio issue) ────────

def _playwright_search_sync(
    failed_stores: list[tuple[str, str, str, str]], q_enc: str
) -> dict[str, str]:
    """Sync Playwright — called via asyncio.to_thread()."""
    from playwright.sync_api import sync_playwright

    results: dict[str, str] = {}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-blink-features=AutomationControlled",
                ],
            )
            ctx = browser.new_context(
                user_agent=HEADERS["User-Agent"],
                locale="pt-BR",
                viewport={"width": 1280, "height": 800},
            )
            ctx.add_init_script(
                "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
            )

            for sk, url_tpl, sel, bu in failed_stores:
                page = None
                try:
                    page = ctx.new_page()
                    page.goto(
                        url_tpl.format(q=q_enc),
                        wait_until="domcontentloaded",
                        timeout=20_000,
                    )
                    try:
                        page.wait_for_selector(sel, timeout=8_000)
                    except Exception:
                        pass
                    el = page.query_selector(sel)
                    if el:
                        href = el.get_attribute("href")
                        if href:
                            full = href if href.startswith("http") else urljoin(bu, href)
                            results[sk] = full
                            logger.info(f"Playwright → {sk}: {full}")
                except Exception as exc:
                    logger.warning(f"Playwright {sk}: {exc}")
                finally:
                    if page:
                        page.close()

            browser.close()
    except Exception as exc:
        logger.warning(f"Playwright: {exc}")
    return results


async def _search_with_playwright(
    failed_stores: list[tuple[str, str, str, str]], q_enc: str
) -> dict[str, str]:
    if not failed_stores:
        return {}
    logger.info(f"Playwright: tentando {', '.join(s[0] for s in failed_stores)}")
    return await asyncio.to_thread(_playwright_search_sync, failed_stores, q_enc)


# ── Store config ───────────────────────────────────────────────────────────

_STORE_SEARCHES = [
    (
        "amazon",
        "https://www.amazon.com.br/s?k={q}",
        '[data-component-type="s-search-result"] a.a-link-normal[href*="/dp/"]',
        "https://www.amazon.com.br",
    ),
    (
        "magalu",
        "https://www.magazineluiza.com.br/busca/{q}/",
        'a[href*="/p/"]',
        "https://www.magazineluiza.com.br",
    ),
    (
        "americanas",
        "https://www.americanas.com.br/s?q={q}",
        'a[href*="/produto/"]',
        "https://www.americanas.com.br",
    ),
    (
        "kabum",
        "https://www.kabum.com.br/busca/{q}",
        'a.productLink, a[class*="productLink"]',
        "https://www.kabum.com.br",
    ),
    (
        "casasbahia",
        "https://www.casasbahia.com.br/busca?q={q}",
        'a[href*="/produto/"]',
        "https://www.casasbahia.com.br",
    ),
]

_SKIP_MAP: dict[str, set[str]] = {
    "amazon": {"Amazon BR", "Amazon"},
    "magalu": {"Magazine Luiza"},
    "americanas": {"Americanas"},
    "kabum": {"KaBuM!"},
    "casasbahia": {"Casas Bahia"},
    "mercadolivre": {"Mercado Livre"},
}


# ── Public entry point ─────────────────────────────────────────────────────

async def find_alternatives(product_name: str, current_store: str) -> list[dict]:
    query = _clean_query(product_name)
    q_enc = quote_plus(query)
    logger.info(f"Query: '{query}' (excluindo {current_store})")

    # === Pass 1: httpx ===
    tasks: dict[str, asyncio.Task] = {}
    store_params: dict[str, tuple] = {}

    if current_store not in _SKIP_MAP["mercadolivre"]:
        tasks["mercadolivre"] = asyncio.create_task(_search_mercadolivre(query))

    for store_key, url_tpl, selector, base_url in _STORE_SEARCHES:
        if current_store in _SKIP_MAP.get(store_key, set()):
            continue
        url = url_tpl.format(q=q_enc)
        tasks[store_key] = asyncio.create_task(
            _search_store_httpx(url, selector, base_url)
        )
        store_params[store_key] = (store_key, url_tpl, selector, base_url)

    raw = await asyncio.gather(*tasks.values(), return_exceptions=True)

    found_urls: dict[str, str] = {}
    failed_httpx: list[tuple[str, str, str, str]] = []

    for key, result in zip(tasks.keys(), raw):
        if result and isinstance(result, str):
            found_urls[key] = result
        elif key in store_params:
            failed_httpx.append(store_params[key])

    logger.info(
        f"httpx: encontrou {list(found_urls.keys())} | "
        f"falhou {[s[0] for s in failed_httpx]}"
    )

    # === Pass 2: Playwright (thread) ===
    if failed_httpx:
        pw = await _search_with_playwright(failed_httpx, q_enc)
        found_urls.update(pw)

    logger.info(f"Total URLs: {list(found_urls.keys())}")

    # === Scrape each found URL ===
    alternatives: list[dict] = []
    for store_key, url in found_urls.items():
        try:
            scrape = await scrape_url(url)
            alternatives.append(
                {
                    "name": scrape.name,
                    "url": url,
                    "image_url": scrape.image_url,
                    "store": scrape.store,
                    "current_price": scrape.price,
                    "original_price": scrape.price,
                }
            )
            logger.info(f"Alternativa: {scrape.store} → R${scrape.price:.2f}")
        except Exception as exc:
            logger.warning(f"Scrape falhou {url}: {exc}")

    return alternatives
