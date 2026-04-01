"""
API pública para acceder a dashboards compartidos sin autenticación
"""
from fastapi import APIRouter, Depends, Request, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import logging
import hashlib

from app.core.database import get_db
from app.core.response import success_response, error_response
from app.core.cache import get_from_cache, set_to_cache, cache_key
from app.core.auth_credentials import get_ads_credentials
from app.models import Account, ShareLink
from app.services.ads import AdsService
from app.services.meta_ads import MetaAdsService
from app.services.linkedin_ads import LinkedInAdsService
from app.services.tiktok_ads import TikTokAdsService

logger = logging.getLogger(__name__)

router = APIRouter()

# Servicios
google_ads_service = AdsService()
meta_ads_service = MetaAdsService()
linkedin_ads_service = LinkedInAdsService()
tiktok_ads_service = TikTokAdsService()


class PasswordVerifyRequest(BaseModel):
    password: str


def hash_password(password: str) -> str:
    """Hash simple para contraseña del link"""
    return hashlib.sha256(password.encode()).hexdigest()


@router.get("/{token}")
async def get_shared_dashboard_info(
    token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Obtiene información del dashboard compartido (sin datos sensibles).
    Usado para verificar si el link es válido y si requiere contraseña.
    """
    try:
        link = db.query(ShareLink).filter(
            ShareLink.token == token
        ).first()
        
        if not link:
            return error_response(
                message="Link no encontrado o ha expirado",
                status_code=404,
                path=str(request.url.path)
            )
        
        if not link.is_valid():
            return error_response(
                message="Este link ha expirado o está desactivado",
                status_code=403,
                path=str(request.url.path)
            )
        
        # Obtener info básica de las cuentas (sin datos sensibles)
        accounts = db.query(Account).filter(
            Account.id.in_(link.account_ids or []),
            Account.organization_id == link.organization_id,
            Account.is_active == True
        ).all()
        
        # Obtener plataformas únicas
        platforms = list(set([acc.platform for acc in accounts]))
        
        return success_response(
            data={
                "name": link.name,
                "requires_password": link.password_hash is not None,
                "config": link.config or {},
                "platforms": platforms,
                "account_count": len(accounts),
                "accounts": [
                    {
                        "platform": acc.platform,
                        "account_type": acc.account_type,
                        "account_name": acc.account_name or f"Cuenta {acc.platform}"
                    }
                    for acc in accounts
                ]
            },
            message="Información del dashboard obtenida",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        logger.error(f"Error getting shared dashboard info: {e}")
        return error_response(
            message="Error al obtener información del dashboard",
            status_code=500,
            path=str(request.url.path)
        )


@router.post("/{token}/verify")
async def verify_password(
    token: str,
    data: PasswordVerifyRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Verifica la contraseña para un dashboard protegido"""
    try:
        link = db.query(ShareLink).filter(
            ShareLink.token == token
        ).first()
        
        if not link or not link.is_valid():
            return error_response(
                message="Link no válido",
                status_code=404,
                path=str(request.url.path)
            )
        
        if not link.password_hash:
            return success_response(
                data={"verified": True},
                message="No requiere contraseña",
                status_code=200,
                path=str(request.url.path)
            )
        
        if hash_password(data.password) == link.password_hash:
            return success_response(
                data={"verified": True, "access_token": token},  # Podrías generar un JWT temporal aquí
                message="Contraseña correcta",
                status_code=200,
                path=str(request.url.path)
            )
        
        return error_response(
            message="Contraseña incorrecta",
            status_code=401,
            path=str(request.url.path)
        )
    except Exception as e:
        logger.error(f"Error verifying password: {e}")
        return error_response(
            message="Error al verificar contraseña",
            status_code=500,
            path=str(request.url.path)
        )


@router.get("/{token}/metrics")
async def get_shared_metrics(
    token: str,
    request: Request,
    startDate: str = Query(..., alias="startDate"),
    endDate: str = Query(..., alias="endDate"),
    password: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Obtiene las métricas agregadas para un dashboard compartido.
    Este endpoint es PÚBLICO y no requiere autenticación normal.
    """
    try:
        # Verificar link
        link = db.query(ShareLink).filter(
            ShareLink.token == token
        ).first()
        
        if not link:
            return error_response(
                message="Link no encontrado",
                status_code=404,
                path=str(request.url.path)
            )
        
        if not link.is_valid():
            return error_response(
                message="Este link ha expirado o está desactivado",
                status_code=403,
                path=str(request.url.path)
            )
        
        # Verificar contraseña si es requerida
        if link.password_hash:
            if not password:
                return error_response(
                    message="Este dashboard requiere contraseña",
                    status_code=401,
                    path=str(request.url.path)
                )
            if hash_password(password) != link.password_hash:
                return error_response(
                    message="Contraseña incorrecta",
                    status_code=401,
                    path=str(request.url.path)
                )
        
        # Registrar acceso
        link.record_access()
        db.commit()
        
        # Generar clave de cache para métricas públicas
        cache_key_str = cache_key(
            "shared:metrics",
            token,
            startDate,
            endDate
        )
        
        # Intentar obtener del cache
        cached_metrics = get_from_cache(cache_key_str)
        if cached_metrics:
            logger.info(f"📊 Métricas compartidas obtenidas del cache para {link.name}")
            return success_response(
                data=cached_metrics,
                message="Métricas obtenidas exitosamente (cache)",
                status_code=200,
                path=str(request.url.path)
            )
        
        # Obtener cuentas activas
        accounts = db.query(Account).filter(
            Account.id.in_(link.account_ids or []),
            Account.organization_id == link.organization_id,
            Account.is_active == True
        ).all()
        
        if not accounts:
            return success_response(
                data={
                    "totalClicks": 0,
                    "totalImpressions": 0,
                    "totalCost": 0,
                    "totalConversions": 0,
                    "totalCTR": 0,
                    "platforms": {},
                    "startDate": startDate,
                    "endDate": endDate
                },
                message="No hay cuentas disponibles",
                status_code=200,
                path=str(request.url.path)
            )
        
        # Agrupar cuentas por plataforma
        accounts_by_platform = {}
        for account in accounts:
            platform = account.platform
            if platform not in accounts_by_platform:
                accounts_by_platform[platform] = []
            accounts_by_platform[platform].append(account)
        
        # Agregar métricas por plataforma
        platforms_metrics = {}
        total_clicks = 0
        total_impressions = 0
        total_cost = 0
        total_conversions = 0
        total_revenue = 0
        
        config = link.config or {}
        show_cost = config.get("show_cost", True)
        
        # Helper para normalizar customer_id
        def normalize_customer_id(cid: str) -> str:
            return cid.replace('-', '') if cid else cid
        
        # Helper para detectar si es MCC
        def is_mcc_account(account) -> bool:
            if account.extra_data:
                try:
                    import json
                    extra = json.loads(account.extra_data)
                    # Si es MCC o si el account_id es igual al parent_customer_id y tiene subcuentas
                    if extra.get("is_mcc", False):
                        return True
                    # Si es la cuenta MCC principal (su id es parent de otras cuentas)
                    # Verificar si hay otras cuentas que tienen a esta como padre
                    has_children = db.query(Account).filter(
                        Account.parent_account_id == account.id,
                        Account.id != account.id,
                        Account.deleted_at.is_(None)
                    ).first() is not None
                    if has_children:
                        return True
                except:
                    pass
            return False
        
        # Helper para obtener login_customer_id para subcuentas
        def get_login_customer_id(account):
            # Primero intentar desde parent_account_id
            if account.parent_account_id and account.parent_account_id != account.id:
                parent = db.query(Account).filter(Account.id == account.parent_account_id).first()
                if parent and parent.account_id:
                    return normalize_customer_id(parent.account_id)
            
            # Intentar desde extra_data
            if account.extra_data:
                try:
                    import json
                    extra = json.loads(account.extra_data)
                    pcid = extra.get("parent_customer_id")
                    if pcid:
                        return normalize_customer_id(pcid)
                except:
                    pass
            return None
        
        # Obtener métricas de Google Ads
        google_accounts = accounts_by_platform.get("google", [])
        for account in google_accounts:
            if account.account_type != "ads":
                continue
            
            # Saltar cuentas MCC (no se pueden obtener métricas directas)
            if is_mcc_account(account):
                logger.info(f"⏭️ Saltando cuenta MCC: {account.account_name} ({account.account_id})")
                continue
                
            try:
                credentials = get_ads_credentials(
                    db=db,
                    organization_id=link.organization_id,
                    account_id=account.id,
                    platform="google"
                )
                
                if credentials:
                    customer_id = normalize_customer_id(account.account_id)
                    login_customer_id = get_login_customer_id(account)
                    
                    if customer_id:
                        logger.info(f"📊 Obteniendo métricas de Google Ads para {account.account_name} (customer_id={customer_id}, login_customer_id={login_customer_id})")
                        
                        metrics = await google_ads_service.get_metrics(
                            startDate,
                            endDate,
                            customer_id=customer_id,
                            credentials=credentials,
                            login_customer_id=login_customer_id
                        )
                        
                        if metrics:
                            clicks = metrics.get("clicks", 0)
                            impressions = metrics.get("impressions", 0)
                            cost = metrics.get("cost", 0) if show_cost else 0
                            conversions = metrics.get("conversions", 0)
                            
                            total_clicks += clicks
                            total_impressions += impressions
                            total_cost += cost
                            total_conversions += conversions
                            
                            if "google" not in platforms_metrics:
                                platforms_metrics["google"] = {
                                    "platform": "google",
                                    "clicks": 0,
                                    "impressions": 0,
                                    "cost": 0,
                                    "conversions": 0,
                                    "ctr": 0,
                                    "cpc": 0
                                }
                            
                            platforms_metrics["google"]["clicks"] += clicks
                            platforms_metrics["google"]["impressions"] += impressions
                            platforms_metrics["google"]["cost"] += cost if show_cost else 0
                            platforms_metrics["google"]["conversions"] += conversions
            except Exception as e:
                logger.error(f"Error getting Google Ads metrics for account {account.id}: {e}")
        
        # Obtener métricas de Meta Ads
        meta_accounts = accounts_by_platform.get("meta", [])
        for account in meta_accounts:
            if account.account_type != "ads":
                continue
            try:
                credentials = get_ads_credentials(
                    db=db,
                    organization_id=link.organization_id,
                    account_id=account.id,
                    platform="meta"
                )
                
                if credentials:
                    metrics = await meta_ads_service.get_metrics(
                        startDate,
                        endDate,
                        ad_account_id=account.account_id,
                        credentials=credentials
                    )
                    
                    if metrics:
                        clicks = metrics.get("clicks", 0)
                        impressions = metrics.get("impressions", 0)
                        cost = metrics.get("spend", 0) if show_cost else 0
                        conversions = metrics.get("conversions", 0)
                        
                        total_clicks += clicks
                        total_impressions += impressions
                        total_cost += cost
                        total_conversions += conversions
                        
                        if "meta" not in platforms_metrics:
                            platforms_metrics["meta"] = {
                                "platform": "meta",
                                "clicks": 0,
                                "impressions": 0,
                                "cost": 0,
                                "conversions": 0,
                                "ctr": 0,
                                "cpc": 0
                            }
                        
                        platforms_metrics["meta"]["clicks"] += clicks
                        platforms_metrics["meta"]["impressions"] += impressions
                        platforms_metrics["meta"]["cost"] += cost if show_cost else 0
                        platforms_metrics["meta"]["conversions"] += conversions
            except Exception as e:
                logger.error(f"Error getting Meta Ads metrics for account {account.id}: {e}")
        
        # Obtener métricas de LinkedIn Ads
        linkedin_accounts = accounts_by_platform.get("linkedin", [])
        for account in linkedin_accounts:
            if account.account_type != "ads":
                continue
            try:
                credentials = get_ads_credentials(
                    db=db,
                    organization_id=link.organization_id,
                    account_id=account.id,
                    platform="linkedin"
                )
                
                if credentials:
                    metrics = await linkedin_ads_service.get_metrics(
                        startDate,
                        endDate,
                        account_id=account.account_id,
                        credentials=credentials
                    )
                    
                    if metrics:
                        clicks = metrics.get("clicks", 0)
                        impressions = metrics.get("impressions", 0)
                        cost = metrics.get("cost", 0) if show_cost else 0
                        conversions = metrics.get("conversions", 0)
                        
                        total_clicks += clicks
                        total_impressions += impressions
                        total_cost += cost
                        total_conversions += conversions
                        
                        if "linkedin" not in platforms_metrics:
                            platforms_metrics["linkedin"] = {
                                "platform": "linkedin",
                                "clicks": 0,
                                "impressions": 0,
                                "cost": 0,
                                "conversions": 0,
                                "ctr": 0,
                                "cpc": 0
                            }
                        
                        platforms_metrics["linkedin"]["clicks"] += clicks
                        platforms_metrics["linkedin"]["impressions"] += impressions
                        platforms_metrics["linkedin"]["cost"] += cost if show_cost else 0
                        platforms_metrics["linkedin"]["conversions"] += conversions
            except Exception as e:
                logger.error(f"Error getting LinkedIn Ads metrics for account {account.id}: {e}")
        
        # Obtener métricas de TikTok Ads
        tiktok_accounts = accounts_by_platform.get("tiktok", [])
        for account in tiktok_accounts:
            if account.account_type != "ads":
                continue
            try:
                credentials = get_ads_credentials(
                    db=db,
                    organization_id=link.organization_id,
                    account_id=account.id,
                    platform="tiktok"
                )
                
                if credentials:
                    metrics = await tiktok_ads_service.get_metrics(
                        startDate,
                        endDate,
                        advertiser_id=account.account_id,
                        credentials=credentials
                    )
                    
                    if metrics:
                        clicks = metrics.get("clicks", 0)
                        impressions = metrics.get("impressions", 0)
                        cost = metrics.get("cost", 0) if show_cost else 0
                        conversions = metrics.get("conversions", 0)
                        
                        total_clicks += clicks
                        total_impressions += impressions
                        total_cost += cost
                        total_conversions += conversions
                        
                        if "tiktok" not in platforms_metrics:
                            platforms_metrics["tiktok"] = {
                                "platform": "tiktok",
                                "clicks": 0,
                                "impressions": 0,
                                "cost": 0,
                                "conversions": 0,
                                "ctr": 0,
                                "cpc": 0
                            }
                        
                        platforms_metrics["tiktok"]["clicks"] += clicks
                        platforms_metrics["tiktok"]["impressions"] += impressions
                        platforms_metrics["tiktok"]["cost"] += cost if show_cost else 0
                        platforms_metrics["tiktok"]["conversions"] += conversions
            except Exception as e:
                logger.error(f"Error getting TikTok Ads metrics for account {account.id}: {e}")
        
        # Calcular KPIs
        for platform_key in platforms_metrics:
            p = platforms_metrics[platform_key]
            p["ctr"] = (p["clicks"] / p["impressions"] * 100) if p["impressions"] > 0 else 0
            p["cpc"] = (p["cost"] / p["clicks"]) if p["clicks"] > 0 else 0
        
        total_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
        total_cpc = (total_cost / total_clicks) if total_clicks > 0 else 0
        total_cpm = (total_cost / total_impressions * 1000) if total_impressions > 0 else 0
        total_cpa = (total_cost / total_conversions) if total_conversions > 0 else 0
        
        result = {
            "totalClicks": total_clicks,
            "totalImpressions": total_impressions,
            "totalCost": total_cost if show_cost else None,
            "totalConversions": total_conversions,
            "totalCTR": round(total_ctr, 2),
            "totalCPC": round(total_cpc, 2) if show_cost else None,
            "totalCPM": round(total_cpm, 2) if show_cost else None,
            "totalCPA": round(total_cpa, 2) if show_cost else None,
            "platforms": platforms_metrics,
            "startDate": startDate,
            "endDate": endDate,
            "dashboardName": link.name,
            "config": config
        }
        
        # Guardar en cache (15 minutos para datos públicos)
        set_to_cache(cache_key_str, result, ttl=900)
        
        return success_response(
            data=result,
            message="Métricas obtenidas exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
        
    except Exception as e:
        logger.error(f"Error getting shared metrics: {e}")
        import traceback
        traceback.print_exc()
        return error_response(
            message=f"Error al obtener métricas: {str(e)}",
            status_code=500,
            path=str(request.url.path)
        )


@router.get("/{token}/trends")
async def get_shared_trends(
    token: str,
    request: Request,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Obtiene datos de tendencias diarias para el dashboard compartido
    """
    try:
        link = db.query(ShareLink).filter(
            ShareLink.token == token,
            ShareLink.is_active == True,
            ShareLink.deleted_at.is_(None)
        ).first()
        
        if not link:
            return error_response(
                message="Link no encontrado o inactivo",
                status_code=404,
                path=str(request.url.path)
            )
        
        if link.expires_at and link.expires_at < datetime.utcnow():
            return error_response(
                message="Este link ha expirado",
                status_code=410,
                path=str(request.url.path)
            )
        
        config = link.config or {}
        selected_accounts = config.get("selectedAccounts", [])
        
        if not selected_accounts:
            return success_response(
                data={"trends": []},
                message="No hay cuentas configuradas",
                status_code=200,
                path=str(request.url.path)
            )
        
        if not startDate or not endDate:
            end = datetime.now()
            start = end - timedelta(days=30)
            startDate = start.strftime("%Y-%m-%d")
            endDate = end.strftime("%Y-%m-%d")
        
        # Agrupar cuentas por plataforma
        accounts_by_platform = {}
        for acc in selected_accounts:
            platform = acc.get("platform", "").lower()
            if platform not in accounts_by_platform:
                accounts_by_platform[platform] = []
            accounts_by_platform[platform].append(acc)
        
        # Obtener tendencias consolidadas por día
        daily_data = {}
        
        # Generar lista de fechas
        start_dt = datetime.strptime(startDate, "%Y-%m-%d")
        end_dt = datetime.strptime(endDate, "%Y-%m-%d")
        current_dt = start_dt
        while current_dt <= end_dt:
            date_str = current_dt.strftime("%Y-%m-%d")
            daily_data[date_str] = {
                "date": date_str,
                "impressions": 0,
                "clicks": 0,
                "cost": 0,
                "conversions": 0
            }
            current_dt += timedelta(days=1)
        
        # Obtener datos de cada plataforma
        for platform, accounts in accounts_by_platform.items():
            for acc in accounts:
                try:
                    account_id = acc.get("accountId")
                    customer_id = acc.get("customerId")
                    
                    if platform == "google_ads":
                        # Obtener tendencias de Google Ads
                        ad_account = db.query(AdAccount).filter(
                            AdAccount.account_id == account_id,
                            AdAccount.platform == "google_ads"
                        ).first()
                        
                        if ad_account:
                            from app.services.google_ads_service import GoogleAdsService
                            google_ads_service = GoogleAdsService(db)
                            
                            trends = await google_ads_service.get_performance_trends(
                                ad_account_id=ad_account.id,
                                customer_id=customer_id,
                                start_date=startDate,
                                end_date=endDate
                            )
                            
                            for day_data in trends:
                                date_key = day_data.get("date", "")
                                if date_key in daily_data:
                                    daily_data[date_key]["impressions"] += day_data.get("impressions", 0)
                                    daily_data[date_key]["clicks"] += day_data.get("clicks", 0)
                                    daily_data[date_key]["cost"] += day_data.get("cost", 0)
                                    daily_data[date_key]["conversions"] += day_data.get("conversions", 0)
                    
                    elif platform == "meta":
                        # Obtener tendencias de Meta Ads
                        ad_account = db.query(AdAccount).filter(
                            AdAccount.account_id == account_id,
                            AdAccount.platform == "meta"
                        ).first()
                        
                        if ad_account:
                            from app.services.meta_service import MetaService
                            meta_service = MetaService(db)
                            
                            trends = await meta_service.get_performance_trends(
                                ad_account_id=ad_account.id,
                                start_date=startDate,
                                end_date=endDate
                            )
                            
                            for day_data in trends:
                                date_key = day_data.get("date", "")
                                if date_key in daily_data:
                                    daily_data[date_key]["impressions"] += day_data.get("impressions", 0)
                                    daily_data[date_key]["clicks"] += day_data.get("clicks", 0)
                                    daily_data[date_key]["cost"] += day_data.get("spend", day_data.get("cost", 0))
                                    daily_data[date_key]["conversions"] += day_data.get("conversions", 0)
                    
                    elif platform == "linkedin":
                        # Obtener tendencias de LinkedIn Ads
                        ad_account = db.query(AdAccount).filter(
                            AdAccount.account_id == account_id,
                            AdAccount.platform == "linkedin"
                        ).first()
                        
                        if ad_account:
                            from app.services.linkedin_service import LinkedInService
                            linkedin_service = LinkedInService(db)
                            
                            trends = await linkedin_service.get_performance_trends(
                                ad_account_id=ad_account.id,
                                start_date=startDate,
                                end_date=endDate
                            )
                            
                            for day_data in trends:
                                date_key = day_data.get("date", "")
                                if date_key in daily_data:
                                    daily_data[date_key]["impressions"] += day_data.get("impressions", 0)
                                    daily_data[date_key]["clicks"] += day_data.get("clicks", 0)
                                    daily_data[date_key]["cost"] += day_data.get("cost", 0)
                                    daily_data[date_key]["conversions"] += day_data.get("conversions", 0)
                    
                    elif platform == "tiktok":
                        # Obtener tendencias de TikTok Ads
                        ad_account = db.query(AdAccount).filter(
                            AdAccount.account_id == account_id,
                            AdAccount.platform == "tiktok"
                        ).first()
                        
                        if ad_account:
                            from app.services.tiktok_service import TikTokService
                            tiktok_service = TikTokService(db)
                            
                            trends = await tiktok_service.get_performance_trends(
                                ad_account_id=ad_account.id,
                                start_date=startDate,
                                end_date=endDate
                            )
                            
                            for day_data in trends:
                                date_key = day_data.get("date", "")
                                if date_key in daily_data:
                                    daily_data[date_key]["impressions"] += day_data.get("impressions", 0)
                                    daily_data[date_key]["clicks"] += day_data.get("clicks", 0)
                                    daily_data[date_key]["cost"] += day_data.get("cost", 0)
                                    daily_data[date_key]["conversions"] += day_data.get("conversions", 0)
                                    
                except Exception as e:
                    logger.error(f"Error getting trends for {platform} account {account_id}: {e}")
                    continue
        
        # Convertir a lista ordenada y calcular métricas derivadas
        trends_list = []
        show_cost = config.get("showCost", True)
        
        for date_str in sorted(daily_data.keys()):
            day = daily_data[date_str]
            impressions = day["impressions"]
            clicks = day["clicks"]
            cost = day["cost"]
            conversions = day["conversions"]
            
            trends_list.append({
                "date": date_str,
                "impressions": impressions,
                "clicks": clicks,
                "cost": round(cost, 2) if show_cost else None,
                "conversions": conversions,
                "ctr": round((clicks / impressions * 100), 2) if impressions > 0 else 0,
                "cpc": round((cost / clicks), 2) if clicks > 0 and show_cost else None,
                "roas": round((conversions / cost), 2) if cost > 0 and show_cost else None
            })
        
        return success_response(
            data={"trends": trends_list},
            message="Tendencias obtenidas exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
        
    except Exception as e:
        logger.error(f"Error getting shared trends: {e}")
        import traceback
        traceback.print_exc()
        return error_response(
            message=f"Error al obtener tendencias: {str(e)}",
            status_code=500,
            path=str(request.url.path)
        )
