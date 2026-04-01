"""
API de Dashboard Global
Agrega métricas de todas las plataformas (Google Ads, Meta, LinkedIn, TikTok, SEO)
"""
from fastapi import APIRouter, Query, Depends, Request
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
import logging

from app.core.database import get_db
from app.core.auth_middleware import get_current_user
from app.core.response import success_response, error_response
from app.core.cache import get_from_cache, set_to_cache, cache_key, invalidate_cache_pattern
from app.models import User, Account
from app.api import ads, seo
from app.services.ads import AdsService
from app.services.meta_ads import MetaAdsService
from app.services.linkedin_ads import LinkedInAdsService
from app.services.tiktok_ads import TikTokAdsService
from app.core.auth_credentials import get_ads_credentials

logger = logging.getLogger(__name__)

router = APIRouter()

google_ads_service = AdsService()
meta_ads_service = MetaAdsService()
linkedin_ads_service = LinkedInAdsService()
tiktok_ads_service = TikTokAdsService()


@router.get("/metrics")
async def get_global_metrics(
    request: Request,
    startDate: str = Query(..., alias="startDate"),
    endDate: str = Query(..., alias="endDate"),
    accountIds: Optional[str] = Query(None, alias="accountIds"),  # IDs separados por coma
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene métricas agregadas de todas las plataformas conectadas
    """
    try:
        # Parsear accountIds
        account_id_list = []
        if accountIds:
            account_id_list = [int(id.strip()) for id in accountIds.split(",") if id.strip()]
        
        # Generar clave de cache
        cache_key_str = cache_key(
            "dashboard:global_metrics",
            startDate,
            endDate,
            accountIds=accountIds or "all"
        )
        
        # Intentar obtener del cache
        cached_metrics = get_from_cache(cache_key_str)
        if cached_metrics:
            logger.info("📊 Métricas globales obtenidas del cache")
            return success_response(
                data=cached_metrics,
                message="Métricas globales obtenidas exitosamente (cache)",
                status_code=200,
                path=str(request.url.path)
            )
        
        # Obtener todas las cuentas activas del usuario
        query = db.query(Account).filter(
            Account.organization_id == current_user.organization_id,
            Account.is_active == True
        )
        
        if account_id_list:
            query = query.filter(Account.id.in_(account_id_list))
        
        accounts = query.all()
        
        if not accounts:
            return success_response(
                data={
                    "totalClicks": 0,
                    "totalImpressions": 0,
                    "totalCost": 0,
                    "totalConversions": 0,
                    "totalRevenue": 0,
                    "totalCTR": 0,
                    "totalCPC": 0,
                    "totalCPM": 0,
                    "totalROAS": 0,
                    "totalCPA": 0,
                    "platforms": {},
                    "trends": [],
                    "startDate": startDate,
                    "endDate": endDate
                },
                message="No hay cuentas conectadas",
                status_code=200,
                path=str(request.url.path)
            )
        
        # Agregar métricas por plataforma
        platforms_metrics = {}
        total_clicks = 0
        total_impressions = 0
        total_cost = 0
        total_conversions = 0
        total_revenue = 0
        
        # Agrupar cuentas por plataforma
        accounts_by_platform = {}
        for account in accounts:
            platform = account.platform
            if platform not in accounts_by_platform:
                accounts_by_platform[platform] = []
            accounts_by_platform[platform].append(account)
        
        # Obtener métricas de Google Ads
        google_accounts = accounts_by_platform.get("google", [])
        if google_accounts:
            try:
                google_clicks = 0
                google_impressions = 0
                google_cost = 0
                google_conversions = 0
                google_revenue = 0
                
                for account in google_accounts:
                    credentials = get_ads_credentials(
                        db,
                        current_user.organization_id,
                        "google",
                        account.id
                    )
                    
                    if credentials:
                        # Obtener customerId de la cuenta
                        customer_id = account.account_id
                        if customer_id:
                            metrics = await google_ads_service.get_metrics(
                                startDate,
                                endDate,
                                customer_id=customer_id,
                                credentials=credentials
                            )
                            
                            if metrics:
                                google_clicks += metrics.get("clicks", 0)
                                google_impressions += metrics.get("impressions", 0)
                                google_cost += metrics.get("cost", 0)
                                google_conversions += metrics.get("conversions", 0)
                                google_revenue += metrics.get("revenue", 0) or 0
                
                if google_clicks > 0 or google_impressions > 0:
                    google_ctr = (google_clicks / google_impressions * 100) if google_impressions > 0 else 0
                    google_cpc = (google_cost / google_clicks) if google_clicks > 0 else 0
                    google_cpm = (google_cost / google_impressions * 1000) if google_impressions > 0 else 0
                    google_roas = (google_revenue / google_cost) if google_cost > 0 else 0
                    google_cpa = (google_cost / google_conversions) if google_conversions > 0 else 0
                    
                    platforms_metrics["google"] = {
                        "platform": "google",
                        "clicks": google_clicks,
                        "impressions": google_impressions,
                        "cost": google_cost,
                        "conversions": google_conversions,
                        "revenue": google_revenue,
                        "ctr": google_ctr,
                        "cpc": google_cpc,
                        "cpm": google_cpm,
                        "roas": google_roas,
                        "cpa": google_cpa
                    }
                    
                    total_clicks += google_clicks
                    total_impressions += google_impressions
                    total_cost += google_cost
                    total_conversions += google_conversions
                    total_revenue += google_revenue
            except Exception as e:
                logger.warning(f"Error al obtener métricas de Google Ads: {str(e)}")
        
        # Obtener métricas de Meta Ads
        meta_accounts = accounts_by_platform.get("meta", [])
        if meta_accounts:
            try:
                meta_clicks = 0
                meta_impressions = 0
                meta_cost = 0
                meta_conversions = 0
                meta_revenue = 0
                
                for account in meta_accounts:
                    credentials = get_ads_credentials(
                        db,
                        current_user.organization_id,
                        "meta",
                        account.id
                    )
                    
                    if credentials:
                        metrics = await meta_ads_service.get_metrics(
                            startDate,
                            endDate,
                            credentials=credentials
                        )
                        
                        if metrics:
                            meta_clicks += metrics.get("clicks", 0)
                            meta_impressions += metrics.get("impressions", 0)
                            meta_cost += metrics.get("spend", 0) or metrics.get("cost", 0)
                            meta_conversions += metrics.get("conversions", 0)
                            meta_revenue += metrics.get("revenue", 0) or 0
                
                if meta_clicks > 0 or meta_impressions > 0:
                    meta_ctr = (meta_clicks / meta_impressions * 100) if meta_impressions > 0 else 0
                    meta_cpc = (meta_cost / meta_clicks) if meta_clicks > 0 else 0
                    meta_cpm = (meta_cost / meta_impressions * 1000) if meta_impressions > 0 else 0
                    meta_roas = (meta_revenue / meta_cost) if meta_cost > 0 else 0
                    meta_cpa = (meta_cost / meta_conversions) if meta_conversions > 0 else 0
                    
                    platforms_metrics["meta"] = {
                        "platform": "meta",
                        "clicks": meta_clicks,
                        "impressions": meta_impressions,
                        "cost": meta_cost,
                        "conversions": meta_conversions,
                        "revenue": meta_revenue,
                        "ctr": meta_ctr,
                        "cpc": meta_cpc,
                        "cpm": meta_cpm,
                        "roas": meta_roas,
                        "cpa": meta_cpa
                    }
                    
                    total_clicks += meta_clicks
                    total_impressions += meta_impressions
                    total_cost += meta_cost
                    total_conversions += meta_conversions
                    total_revenue += meta_revenue
            except Exception as e:
                logger.warning(f"Error al obtener métricas de Meta Ads: {str(e)}")
        
        # Obtener métricas de LinkedIn Ads
        linkedin_accounts = accounts_by_platform.get("linkedin", [])
        if linkedin_accounts:
            try:
                linkedin_clicks = 0
                linkedin_impressions = 0
                linkedin_cost = 0
                linkedin_conversions = 0
                linkedin_revenue = 0
                
                for account in linkedin_accounts:
                    credentials = get_ads_credentials(
                        db,
                        current_user.organization_id,
                        "linkedin",
                        account.id
                    )
                    
                    if credentials:
                        metrics = await linkedin_ads_service.get_metrics(
                            startDate,
                            endDate,
                            account_id=account.account_id,
                            credentials=credentials
                        )
                        
                        if metrics:
                            linkedin_clicks += metrics.get("clicks", 0)
                            linkedin_impressions += metrics.get("impressions", 0)
                            linkedin_cost += metrics.get("spend", 0) or metrics.get("cost", 0)
                            linkedin_conversions += metrics.get("conversions", 0)
                            linkedin_revenue += metrics.get("revenue", 0) or 0
                
                if linkedin_clicks > 0 or linkedin_impressions > 0:
                    linkedin_ctr = (linkedin_clicks / linkedin_impressions * 100) if linkedin_impressions > 0 else 0
                    linkedin_cpc = (linkedin_cost / linkedin_clicks) if linkedin_clicks > 0 else 0
                    linkedin_cpm = (linkedin_cost / linkedin_impressions * 1000) if linkedin_impressions > 0 else 0
                    linkedin_roas = (linkedin_revenue / linkedin_cost) if linkedin_cost > 0 else 0
                    linkedin_cpa = (linkedin_cost / linkedin_conversions) if linkedin_conversions > 0 else 0
                    
                    platforms_metrics["linkedin"] = {
                        "platform": "linkedin",
                        "clicks": linkedin_clicks,
                        "impressions": linkedin_impressions,
                        "cost": linkedin_cost,
                        "conversions": linkedin_conversions,
                        "revenue": linkedin_revenue,
                        "ctr": linkedin_ctr,
                        "cpc": linkedin_cpc,
                        "cpm": linkedin_cpm,
                        "roas": linkedin_roas,
                        "cpa": linkedin_cpa
                    }
                    
                    total_clicks += linkedin_clicks
                    total_impressions += linkedin_impressions
                    total_cost += linkedin_cost
                    total_conversions += linkedin_conversions
                    total_revenue += linkedin_revenue
            except Exception as e:
                logger.warning(f"Error al obtener métricas de LinkedIn Ads: {str(e)}")
        
        # Calcular métricas agregadas
        total_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
        total_cpc = (total_cost / total_clicks) if total_clicks > 0 else 0
        total_cpm = (total_cost / total_impressions * 1000) if total_impressions > 0 else 0
        total_roas = (total_revenue / total_cost) if total_cost > 0 else 0
        total_cpa = (total_cost / total_conversions) if total_conversions > 0 else 0
        
        result = {
            "totalClicks": total_clicks,
            "totalImpressions": total_impressions,
            "totalCost": total_cost,
            "totalConversions": total_conversions,
            "totalRevenue": total_revenue,
            "totalCTR": total_ctr,
            "totalCPC": total_cpc,
            "totalCPM": total_cpm,
            "totalROAS": total_roas,
            "totalCPA": total_cpa,
            "platforms": platforms_metrics,
            "trends": [],  # Se puede implementar después
            "startDate": startDate,
            "endDate": endDate
        }
        
        # Guardar en cache (30 minutos)
        set_to_cache(cache_key_str, result, ttl=1800)
        
        return success_response(
            data=result,
            message="Métricas globales obtenidas exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
        
    except Exception as e:
        logger.error(f"Error al obtener métricas globales: {str(e)}", exc_info=True)
        return error_response(
            message="Error al obtener métricas globales",
            status_code=500,
            error=str(e),
            path=str(request.url.path)
        )


@router.get("/trends")
async def get_global_trends(
    request: Request,
    startDate: str = Query(..., alias="startDate"),
    endDate: str = Query(..., alias="endDate"),
    accountIds: Optional[str] = Query(None, alias="accountIds"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene tendencias agregadas de todas las plataformas
    """
    try:
        # Por ahora retornar array vacío, se puede implementar después
        return success_response(
            data=[],
            message="Tendencias globales (próximamente)",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        logger.error(f"Error al obtener tendencias globales: {str(e)}", exc_info=True)
        return error_response(
            message="Error al obtener tendencias globales",
            status_code=500,
            error=str(e),
            path=str(request.url.path)
        )


@router.get("/cache-status")
async def get_cache_status(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene el estado del cache (última actualización, próxima actualización)
    """
    try:
        # Por ahora retornar valores por defecto
        return success_response(
            data={
                "lastUpdated": None,
                "nextUpdate": None,
                "isUpdating": False
            },
            message="Estado del cache",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        logger.error(f"Error al obtener estado del cache: {str(e)}")
        return error_response(
            message="Error al obtener estado del cache",
            status_code=500,
            error=str(e),
            path=str(request.url.path)
        )


@router.post("/refresh")
async def force_refresh(
    request: Request,
    accountIds: Optional[str] = Query(None, alias="accountIds"),
    current_user: User = Depends(get_current_user)
):
    """
    Fuerza una actualización de los datos (invalida cache)
    """
    try:
        # Invalidar cache de dashboard
        invalidate_cache_pattern("dashboard:*")
        
        # Si hay accountIds específicos, invalidar también sus caches
        if accountIds:
            invalidate_cache_pattern("ads:*")
            invalidate_cache_pattern("seo:*")
        
        return success_response(
            data={"refreshed": True},
            message="Cache invalidado exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        logger.error(f"Error al forzar actualización: {str(e)}")
        return error_response(
            message="Error al forzar actualización",
            status_code=500,
            error=str(e),
            path=str(request.url.path)
        )



