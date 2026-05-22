from fastapi import APIRouter
from app.api.linkedin import ads

router = APIRouter()

router.include_router(ads.router, prefix="/ads", tags=["LinkedIn Ads"])




