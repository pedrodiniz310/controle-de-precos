from fastapi import APIRouter, HTTPException

from app.schemas.product import ScrapeRequest, ScrapeResponse
from app.services.scraper import scrape_url

router = APIRouter(prefix="/api", tags=["scraper"])


@router.post("/scrape", response_model=ScrapeResponse)
async def scrape(body: ScrapeRequest):
    try:
        return await scrape_url(body.url)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro interno no scraping: {exc}")
