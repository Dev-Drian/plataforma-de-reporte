from fastapi import APIRouter, Query, HTTPException
from app.services.analytics import AnalyticsService
from typing import Optional

router = APIRouter()
analytics_service = AnalyticsService()

@router.get("/metrics")
async def get_metrics(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    property_id: Optional[str] = None
):
    try:
        metrics = await analytics_service.get_metrics(start_date, end_date, property_id)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dimensions")
async def get_dimensions(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    dimension: str = Query("country", description="Dimension to analyze")
):
    try:
        data = await analytics_service.get_dimension_data(start_date, end_date, dimension)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




