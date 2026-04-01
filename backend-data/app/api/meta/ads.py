from fastapi import APIRouter, Query, HTTPException
from app.services.meta_ads import MetaAdsService
from typing import Optional

router = APIRouter()
meta_ads_service = MetaAdsService()

@router.get("/metrics")
async def get_metrics(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    account_id: Optional[str] = None
):
    try:
        metrics = await meta_ads_service.get_metrics(start_date, end_date, account_id)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




