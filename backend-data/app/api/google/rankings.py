from fastapi import APIRouter, Query, HTTPException
from app.services.rankings import RankingsService
from typing import List, Optional

router = APIRouter()
rankings_service = RankingsService()

@router.get("/")
async def get_rankings(
    keywords: str = Query(..., description="Comma-separated keywords"),
    city: Optional[str] = None,
    country: str = Query("ES", description="Country code")
):
    try:
        keyword_list = [k.strip() for k in keywords.split(",")]
        rankings = await rankings_service.get_rankings(keyword_list, city, country)
        return rankings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




