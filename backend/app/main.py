import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import products, scraper
from app.services.tracker import check_all_prices

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="America/Sao_Paulo")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("Banco de dados inicializado")

    scheduler.add_job(
        check_all_prices,
        trigger="interval",
        hours=settings.scrape_interval_hours,
        id="price_tracker",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(f"Price tracker agendado a cada {settings.scrape_interval_hours}h")

    yield

    scheduler.shutdown(wait=False)
    logger.info("Scheduler encerrado")


app = FastAPI(
    title="Pricewatch API",
    description="Backend do sistema de monitoramento de preços",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scraper.router)
app.include_router(products.router)


@app.get("/health", tags=["infra"])
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/api/admin/check-prices", tags=["infra"])
async def trigger_check():
    """Dispara verificação de preços manualmente (útil em dev)."""
    await check_all_prices()
    return {"status": "done"}
