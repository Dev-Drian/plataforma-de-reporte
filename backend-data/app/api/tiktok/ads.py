from fastapi import APIRouter, Query, HTTPException
from app.services.tiktok_ads import TikTokAdsService
from typing import Optional

router = APIRouter()
tiktok_ads_service = TikTokAdsService()

@router.get("/metrics")
async def get_metrics(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    advertiser_id: Optional[str] = None
):
    try:
        metrics = await tiktok_ads_service.get_metrics(start_date, end_date, advertiser_id)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




