from fastapi import APIRouter, Query, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.auth_middleware import get_current_user
from app.core.response import success_response, error_response
from app.core.cache import get_from_cache, set_to_cache, cache_key
from app.core.auth_credentials import get_oauth_credentials
from app.models import User
from app.services.analytics import AnalyticsService
from app.services.search_console import OAuthExpiredError
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
analytics_service = AnalyticsService()


@router.get("/properties")
async def get_analytics_properties(
    request: Request,
    accountId: Optional[int] = Query(None, alias="accountId"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Listar todas las propiedades de Google Analytics disponibles
    Similar a /ads/customers para Google Ads
    """
    credentials = get_oauth_credentials(
        db,
        current_user.organization_id,
        accountId,
        platform="google",
        account_type="analytics"
    )
    
    if not credentials:
        return error_response(
            message="No Google Analytics account configured. Configure it in Settings > Accounts.",
            status_code=400,
            error="No Analytics account configured",
            path=str(request.url.path)
        )
    
    try:
        # Cache for properties (6 hours, rarely change)
        cache_key_str = cache_key("analytics:properties", accountId=accountId)
        cached_properties = get_from_cache(cache_key_str)
        
        if cached_properties:
            return success_response(
                data=cached_properties,
                message="Properties retrieved successfully (cache)",
                status_code=200,
                path=str(request.url.path)
            )
        
        properties = await analytics_service.list_properties(credentials)
        
        set_to_cache(cache_key_str, properties, ttl=21600)
        
        return success_response(
            data=properties,
            message="Properties retrieved successfully",
            status_code=200,
            path=str(request.url.path)
        )
    except OAuthExpiredError as auth_err:
        logger.warning(f"OAuth expired for Analytics properties: {str(auth_err)}")
        return error_response(
            message=str(auth_err),
            status_code=401,
            error="oauth_expired",
            path=str(request.url.path)
        )
    except Exception as e:
        logger.error(f"Error getting Analytics properties: {str(e)}")
        return error_response(
            message=str(e),
            status_code=500,
            error="Error getting properties",
            path=str(request.url.path)
        )


@router.get("/metrics")
async def get_analytics_metrics(
    request: Request,
    startDate: Optional[str] = Query(None, alias="startDate"),
    endDate: Optional[str] = Query(None, alias="endDate"),
    accountId: Optional[int] = Query(None, alias="accountId"),
    propertyId: Optional[str] = Query(None, alias="propertyId"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Consolidated endpoint for Analytics metrics
    Similar to /ads/metrics for Google Ads
    """
    if not startDate or not endDate:
        return error_response(
            message="startDate and endDate are required",
            status_code=400,
            error="Missing required parameters",
            path=str(request.url.path)
        )
    
    credentials = get_oauth_credentials(
        db,
        current_user.organization_id,
        accountId,
        platform="google",
        account_type="analytics"
    )
    
    if not credentials:
        return error_response(
            message="No Google Analytics account configured. Configure it in Settings > Accounts.",
            status_code=400,
            error="No Analytics account configured",
            path=str(request.url.path)
        )
    
    try:
        # Cache for metrics (30 minutes)
        cache_key_str = cache_key(
            "analytics:metrics",
            startDate,
            endDate,
            accountId=accountId,
            propertyId=propertyId
        )
        cached_metrics = get_from_cache(cache_key_str)
        
        if cached_metrics:
            return success_response(
                data=cached_metrics,
                message="Metrics retrieved successfully (cache)",
                status_code=200,
                path=str(request.url.path)
            )
        
        metrics = await analytics_service.get_metrics(
            startDate,
            endDate,
            property_id=propertyId,
            credentials=credentials
        )
        
        set_to_cache(cache_key_str, metrics, ttl=1800)
        
        return success_response(
            data=metrics,
            message="Metrics retrieved successfully",
            status_code=200,
            path=str(request.url.path)
        )
    except OAuthExpiredError as auth_err:
        return error_response(message=str(auth_err), status_code=401, error="oauth_expired", path=str(request.url.path))
    except Exception as e:
        logger.error(f"Error getting Analytics metrics: {str(e)}")
        return error_response(
            message=str(e),
            status_code=500,
            error="Error getting metrics",
            path=str(request.url.path)
        )


@router.get("/trend")
async def get_analytics_trend(
    request: Request,
    startDate: str = Query(..., alias="startDate"),
    endDate: str = Query(..., alias="endDate"),
    accountId: Optional[int] = Query(None, alias="accountId"),
    propertyId: Optional[str] = Query(None, alias="propertyId"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get daily users and sessions trend for charts"""
    credentials = get_oauth_credentials(
        db,
        current_user.organization_id,
        accountId,
        platform="google",
        account_type="analytics"
    )
    
    if not credentials:
        return error_response(
            message="No Google Analytics account configured",
            status_code=400,
            error="No Analytics account configured",
            path=str(request.url.path)
        )
    
    try:
        cache_key_str = cache_key("analytics:trend", startDate, endDate, accountId=accountId, propertyId=propertyId)
        cached_data = get_from_cache(cache_key_str)
        
        if cached_data:
            return success_response(data=cached_data, message="Trend data (cache)", status_code=200, path=str(request.url.path))
        
        trend = await analytics_service.get_users_trend(startDate, endDate, propertyId, credentials)
        set_to_cache(cache_key_str, trend, ttl=1800)
        
        return success_response(data=trend, message="Trend data retrieved", status_code=200, path=str(request.url.path))
    except OAuthExpiredError as auth_err:
        return error_response(message=str(auth_err), status_code=401, error="oauth_expired", path=str(request.url.path))
    except Exception as e:
        logger.error(f"Error getting trend: {str(e)}")
        return error_response(message=str(e), status_code=500, error="Error getting trend", path=str(request.url.path))


@router.get("/traffic-sources")
async def get_traffic_sources(
    request: Request,
    startDate: str = Query(..., alias="startDate"),
    endDate: str = Query(..., alias="endDate"),
    accountId: Optional[int] = Query(None, alias="accountId"),
    propertyId: Optional[str] = Query(None, alias="propertyId"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get traffic sources breakdown for pie chart"""
    credentials = get_oauth_credentials(
        db,
        current_user.organization_id,
        accountId,
        platform="google",
        account_type="analytics"
    )
    
    if not credentials:
        return error_response(
            message="No Google Analytics account configured",
            status_code=400,
            error="No Analytics account configured",
            path=str(request.url.path)
        )
    
    try:
        cache_key_str = cache_key("analytics:sources", startDate, endDate, accountId=accountId, propertyId=propertyId)
        cached_data = get_from_cache(cache_key_str)
        
        if cached_data:
            return success_response(data=cached_data, message="Traffic sources (cache)", status_code=200, path=str(request.url.path))
        
        sources = await analytics_service.get_traffic_sources(startDate, endDate, propertyId, credentials)
        set_to_cache(cache_key_str, sources, ttl=1800)
        
        return success_response(data=sources, message="Traffic sources retrieved", status_code=200, path=str(request.url.path))
    except OAuthExpiredError as auth_err:
        return error_response(message=str(auth_err), status_code=401, error="oauth_expired", path=str(request.url.path))
    except Exception as e:
        logger.error(f"Error getting traffic sources: {str(e)}")
        return error_response(message=str(e), status_code=500, error="Error getting traffic sources", path=str(request.url.path))


@router.get("/devices")
async def get_device_breakdown(
    request: Request,
    startDate: str = Query(..., alias="startDate"),
    endDate: str = Query(..., alias="endDate"),
    accountId: Optional[int] = Query(None, alias="accountId"),
    propertyId: Optional[str] = Query(None, alias="propertyId"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get device category breakdown for bar chart"""
    credentials = get_oauth_credentials(
        db,
        current_user.organization_id,
        accountId,
        platform="google",
        account_type="analytics"
    )
    
    if not credentials:
        return error_response(
            message="No Google Analytics account configured",
            status_code=400,
            error="No Analytics account configured",
            path=str(request.url.path)
        )
    
    try:
        cache_key_str = cache_key("analytics:devices", startDate, endDate, accountId=accountId, propertyId=propertyId)
        cached_data = get_from_cache(cache_key_str)
        
        if cached_data:
            return success_response(data=cached_data, message="Device breakdown (cache)", status_code=200, path=str(request.url.path))
        
        devices = await analytics_service.get_device_breakdown(startDate, endDate, propertyId, credentials)
        set_to_cache(cache_key_str, devices, ttl=1800)
        
        return success_response(data=devices, message="Device breakdown retrieved", status_code=200, path=str(request.url.path))
    except OAuthExpiredError as auth_err:
        return error_response(message=str(auth_err), status_code=401, error="oauth_expired", path=str(request.url.path))
    except Exception as e:
        logger.error(f"Error getting device breakdown: {str(e)}")
        return error_response(message=str(e), status_code=500, error="Error getting device breakdown", path=str(request.url.path))


@router.get("/top-pages")
async def get_top_pages(
    request: Request,
    startDate: str = Query(..., alias="startDate"),
    endDate: str = Query(..., alias="endDate"),
    accountId: Optional[int] = Query(None, alias="accountId"),
    propertyId: Optional[str] = Query(None, alias="propertyId"),
    limit: int = Query(10),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get top pages by pageviews"""
    credentials = get_oauth_credentials(
        db,
        current_user.organization_id,
        accountId,
        platform="google",
        account_type="analytics"
    )
    
    if not credentials:
        return error_response(
            message="No Google Analytics account configured",
            status_code=400,
            error="No Analytics account configured",
            path=str(request.url.path)
        )
    
    try:
        cache_key_str = cache_key("analytics:pages", startDate, endDate, accountId=accountId, propertyId=propertyId, limit=limit)
        cached_data = get_from_cache(cache_key_str)
        
        if cached_data:
            return success_response(data=cached_data, message="Top pages (cache)", status_code=200, path=str(request.url.path))
        
        pages = await analytics_service.get_top_pages(startDate, endDate, propertyId, credentials, limit)
        set_to_cache(cache_key_str, pages, ttl=1800)
        
        return success_response(data=pages, message="Top pages retrieved", status_code=200, path=str(request.url.path))
    except OAuthExpiredError as auth_err:
        return error_response(message=str(auth_err), status_code=401, error="oauth_expired", path=str(request.url.path))
    except Exception as e:
        logger.error(f"Error getting top pages: {str(e)}")
        return error_response(message=str(e), status_code=500, error="Error getting top pages", path=str(request.url.path))


@router.get("/top-countries")
async def get_top_countries(
    request: Request,
    startDate: str = Query(..., alias="startDate"),
    endDate: str = Query(..., alias="endDate"),
    accountId: Optional[int] = Query(None, alias="accountId"),
    propertyId: Optional[str] = Query(None, alias="propertyId"),
    limit: int = Query(10),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get top countries by sessions"""
    credentials = get_oauth_credentials(
        db,
        current_user.organization_id,
        accountId,
        platform="google",
        account_type="analytics"
    )
    
    if not credentials:
        return error_response(
            message="No Google Analytics account configured",
            status_code=400,
            error="No Analytics account configured",
            path=str(request.url.path)
        )
    
    try:
        cache_key_str = cache_key("analytics:countries", startDate, endDate, accountId=accountId, propertyId=propertyId, limit=limit)
        cached_data = get_from_cache(cache_key_str)
        
        if cached_data:
            return success_response(data=cached_data, message="Top countries (cache)", status_code=200, path=str(request.url.path))
        
        countries = await analytics_service.get_top_countries(startDate, endDate, propertyId, credentials, limit)
        set_to_cache(cache_key_str, countries, ttl=1800)
        
        return success_response(data=countries, message="Top countries retrieved", status_code=200, path=str(request.url.path))
    except OAuthExpiredError as auth_err:
        return error_response(message=str(auth_err), status_code=401, error="oauth_expired", path=str(request.url.path))
    except Exception as e:
        logger.error(f"Error getting top countries: {str(e)}")
        return error_response(message=str(e), status_code=500, error="Error getting top countries", path=str(request.url.path))

