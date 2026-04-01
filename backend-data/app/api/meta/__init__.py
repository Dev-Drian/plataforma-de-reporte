from fastapi import APIRouter
from app.api.meta import ads

router = APIRouter()

router.include_router(ads.router, prefix="/ads", tags=["Meta Ads"])




