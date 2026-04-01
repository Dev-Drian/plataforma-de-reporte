from fastapi import APIRouter, Query, HTTPException
from app.services.ads import AdsService
from typing import Optional

router = APIRouter()
ads_service = AdsService()

@router.get("/metrics")
async def get_metrics(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    customer_id: Optional[str] = None
):
    try:
        metrics = await ads_service.get_metrics(start_date, end_date, customer_id)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/campaigns")
async def get_campaigns(
    customer_id: Optional[str] = None
):
    try:
        campaigns = await ads_service.get_campaigns(customer_id)
        return campaigns
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




