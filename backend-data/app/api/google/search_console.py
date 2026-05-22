from fastapi import APIRouter, Query, HTTPException
from app.services.search_console import SearchConsoleService
from typing import Optional

router = APIRouter()
search_console_service = SearchConsoleService()

@router.get("/metrics")
async def get_metrics(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    property_uri: Optional[str] = None
):
    try:
        metrics = await search_console_service.get_metrics(start_date, end_date, property_uri)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/queries")
async def get_queries(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=1000)
):
    try:
        queries = await search_console_service.get_top_queries(start_date, end_date, limit)
        return queries
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




