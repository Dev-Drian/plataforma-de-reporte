from fastapi import APIRouter
from app.api.tiktok import ads

router = APIRouter()

router.include_router(ads.router, prefix="/ads", tags=["TikTok Ads"])




