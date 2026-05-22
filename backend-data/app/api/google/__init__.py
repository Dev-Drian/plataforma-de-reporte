from fastapi import APIRouter
from app.api.google import search_console, analytics, ads, rankings

router = APIRouter()

router.include_router(search_console.router, prefix="/search-console", tags=["Search Console"])
router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
router.include_router(ads.router, prefix="/ads", tags=["Ads"])
router.include_router(rankings.router, prefix="/rankings", tags=["Rankings"])




