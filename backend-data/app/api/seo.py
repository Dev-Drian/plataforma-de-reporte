from fastapi import APIRouter, Query, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.auth_middleware import get_current_user
from app.core.response import success_response, error_response
from app.core.cache import get_from_cache, set_to_cache, cache_key, invalidate_cache_pattern
from app.models import User, Account, OAuthConfig
from app.services.search_console import SearchConsoleService, OAuthExpiredError
from app.services.rankings import RankingsService
from app.services.meta_seo import MetaSEOService
from app.services.linkedin_seo import LinkedInSEOService
from app.services.credentials_service import get_account_credentials, get_all_accounts_for_platform
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
search_console_service = SearchConsoleService()
rankings_service = RankingsService()
meta_seo_service = MetaSEOService()
linkedin_seo_service = LinkedInSEOService()


def _get_credentials_with_oauth(
    db: Session,
    organization_id: int,
    account_id: Optional[int] = None,
    platform: str = "google"
) -> Optional[dict]:
    """Obtiene credenciales de cuenta con OAuth config incluido"""
    account = None
    
    # Determinar account_type según la plataforma
    account_type_map = {
        "google": "search_console",
        "meta": "seo",  # O usar "page" si existe
        "linkedin": "seo"  # O usar "page" si existe
    }
    account_type = account_type_map.get(platform, "search_console")
    
    if account_id:
        # Buscar cuenta específica por ID
        account = db.query(Account).filter(
            Account.id == account_id,
            Account.organization_id == organization_id,
            Account.is_active == True,
            Account.platform == platform,
            Account.deleted_at.is_(None)  # Excluir cuentas eliminadas
        ).first()
    else:
        # Buscar primera cuenta activa de la plataforma
        account = db.query(Account).filter(
            Account.organization_id == organization_id,
            Account.platform == platform,
            Account.is_active == True,
            Account.deleted_at.is_(None)  # Excluir cuentas eliminadas
        ).first()
    
    if not account:
        return None
    
    # Construir credenciales desde la cuenta
    credentials = {}
    
    # Tokens OAuth (prioridad: campos directos)
    if account.access_token:
        credentials['access_token'] = account.access_token
    if account.refresh_token:
        credentials['refresh_token'] = account.refresh_token
    
    # Credenciales adicionales del campo JSON
    if account.credentials:
        try:
            creds_json = json.loads(account.credentials)
            credentials.update(creds_json)
        except json.JSONDecodeError:
            pass
    
    # Si no hay access_token, no podemos continuar
    if not credentials.get('access_token'):
        return None
    
    # Obtener client_id y client_secret de OAuthConfig (solo para Google)
    if platform == "google":
        oauth_config = db.query(OAuthConfig).filter(
            OAuthConfig.organization_id == organization_id,
            OAuthConfig.platform == "google",
            OAuthConfig.is_active == True
        ).first()
        
        if oauth_config:
            credentials['client_id'] = oauth_config.client_id
            credentials['client_secret'] = oauth_config.client_secret
    
    return credentials

@router.get("/metrics")
async def get_seo_metrics(
    request: Request,
    startDate: Optional[str] = Query(None, alias="startDate"),
    endDate: Optional[str] = Query(None, alias="endDate"),
    accountId: Optional[int] = Query(None, alias="accountId"),
    propertyUri: Optional[str] = Query(None, alias="propertyUri"),
    platform: Optional[str] = Query("google", alias="platform"),
    forceRefresh: Optional[bool] = Query(False, alias="forceRefresh"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Endpoint consolidado para métricas SEO con soporte multi-plataforma"""
    if not startDate or not endDate:
        return error_response(
            message="startDate and endDate are required",
            status_code=400,
            error="Missing required parameters",
            path=str(request.url.path)
        )
    
    platform_name = platform.lower() if platform else "google"
    
    # Validar plataforma
    if platform_name not in ["google", "meta", "linkedin"]:
        return error_response(
            message=f"Platform {platform_name} not supported. Supported platforms: google, meta, linkedin",
            status_code=400,
            error="Invalid platform",
            path=str(request.url.path)
        )
    
    # Obtener credenciales desde BD
    credentials = _get_credentials_with_oauth(
        db,
        current_user.organization_id,
        accountId,
        platform=platform_name
    )
    
    if not credentials:
        platform_names = {
            "google": "Search Console",
            "meta": "Meta (Facebook/Instagram)",
            "linkedin": "LinkedIn"
        }
        return error_response(
            message=f"No hay cuenta de {platform_names.get(platform_name, 'SEO')} configurada. Configúrala en Settings > Cuentas.",
            status_code=400,
            error=f"No {platform_name} SEO account configured",
            path=str(request.url.path)
        )
    
    try:
        # Intentar obtener del cache (solo si no se fuerza refresh)
        cache_key_str = cache_key(
            f"seo:metrics:{platform_name}",
            startDate,
            endDate,
            accountId=accountId,
            propertyUri=propertyUri
        )
        
        if not forceRefresh:
            cached_metrics = get_from_cache(cache_key_str)
            
            if cached_metrics:
                logger.info(f"Cache hit para métricas {platform_name}: {cache_key_str}")
                return success_response(
                    data=cached_metrics,
                    message="Métricas obtenidas exitosamente (cache)",
                    status_code=200,
                    path=str(request.url.path)
                )
        else:
            # Si se fuerza refresh, invalidar cache
            logger.info(f"Forzando refresh para métricas {platform_name}: {cache_key_str}")
            invalidate_cache_pattern(f"seo:metrics:{platform_name}:*")
        
        # Obtener de la API según la plataforma
        logger.info(f"Cache miss para métricas {platform_name}: {cache_key_str}")
        
        if platform_name == "google":
            metrics = await search_console_service.get_metrics(
                startDate, 
                endDate, 
                property_uri=propertyUri,
                credentials=credentials
            )
        elif platform_name == "meta":
            # Para Meta, propertyUri es el page_id
            page_id = propertyUri or accountId
            if accountId and not propertyUri:
                # Obtener account_id de la cuenta
                account = db.query(Account).filter(
                    Account.id == accountId,
                    Account.organization_id == current_user.organization_id,
                    Account.platform == "meta",
                    Account.deleted_at.is_(None)
                ).first()
                if account:
                    page_id = account.account_id
            
            if not page_id:
                return error_response(
                    message="propertyUri o accountId con account_id es requerido para Meta SEO",
                    status_code=400,
                    error="Missing propertyUri",
                    path=str(request.url.path)
                )
            
            metrics = await meta_seo_service.get_metrics(
                startDate,
                endDate,
                page_id=str(page_id),
                credentials=credentials
            )
        elif platform_name == "linkedin":
            # Para LinkedIn, propertyUri es el organization_id
            org_id = propertyUri or accountId
            if accountId and not propertyUri:
                # Obtener account_id de la cuenta
                account = db.query(Account).filter(
                    Account.id == accountId,
                    Account.organization_id == current_user.organization_id,
                    Account.platform == "linkedin",
                    Account.deleted_at.is_(None)
                ).first()
                if account:
                    org_id = account.account_id
            
            metrics = await linkedin_seo_service.get_metrics(
                startDate,
                endDate,
                organization_id=str(org_id) if org_id else None,
                credentials=credentials
            )
        else:
            return error_response(
                message=f"Platform {platform_name} not implemented",
                status_code=400,
                error="Platform not implemented",
                path=str(request.url.path)
            )
        
        # Cachear resultado (30 minutos para métricas)
        set_to_cache(cache_key_str, metrics, ttl=1800)
        
        return success_response(
            data=metrics,
            message="Métricas obtenidas exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except OAuthExpiredError as auth_err:
        return error_response(
            message=str(auth_err), status_code=401,
            error="oauth_expired", path=str(request.url.path)
        )
    except Exception as e:
        logger.error(f"Error al obtener métricas {platform_name}: {str(e)}")
        return error_response(
            message=str(e),
            status_code=500,
            error="Error al obtener métricas",
            path=str(request.url.path)
        )

@router.get("/queries")
async def get_seo_queries(
    request: Request,
    startDate: Optional[str] = Query(None, alias="startDate"),
    endDate: Optional[str] = Query(None, alias="endDate"),
    accountId: Optional[int] = Query(None, alias="accountId"),
    propertyUri: Optional[str] = Query(None, alias="propertyUri"),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener top queries de Search Console"""
    if not startDate or not endDate:
        return error_response(
            message="startDate and endDate are required",
            status_code=400,
            error="Missing required parameters",
            path=str(request.url.path)
        )
    
    credentials = _get_credentials_with_oauth(
        db,
        current_user.organization_id,
        accountId
    )
    
    if not credentials:
        return error_response(
            message="No hay cuenta de Search Console configurada",
            status_code=400,
            error="No Search Console account configured",
            path=str(request.url.path)
        )
    
    try:
        # Cache para queries (1 hora)
        cache_key_str = cache_key(
            "seo:queries",
            startDate,
            endDate,
            accountId=accountId,
            propertyUri=propertyUri,
            limit=limit
        )
        cached_queries = get_from_cache(cache_key_str)
        
        if cached_queries:
            return success_response(
                data=cached_queries,
                message="Queries obtenidas exitosamente (cache)",
                status_code=200,
                path=str(request.url.path)
            )
        
        queries = await search_console_service.get_top_queries(
            startDate,
            endDate,
            property_uri=propertyUri,
            credentials=credentials,
            limit=limit
        )
        
        set_to_cache(cache_key_str, queries, ttl=3600)
        
        return success_response(
            data=queries,
            message="Queries obtenidas exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except OAuthExpiredError as auth_err:
        return error_response(
            message=str(auth_err), status_code=401,
            error="oauth_expired", path=str(request.url.path)
        )
    except Exception as e:
        logger.error(f"Error al obtener queries: {str(e)}")
        return error_response(
            message=str(e),
            status_code=500,
            error="Error al obtener queries",
            path=str(request.url.path)
        )

@router.get("/pages")
async def get_seo_pages(
    request: Request,
    startDate: Optional[str] = Query(None, alias="startDate"),
    endDate: Optional[str] = Query(None, alias="endDate"),
    accountId: Optional[int] = Query(None, alias="accountId"),
    propertyUri: Optional[str] = Query(None, alias="propertyUri"),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener top páginas de Search Console"""
    if not startDate or not endDate:
        return error_response(
            message="startDate and endDate are required",
            status_code=400,
            error="Missing required parameters",
            path=str(request.url.path)
        )
    
    credentials = _get_credentials_with_oauth(
        db,
        current_user.organization_id,
        accountId
    )
    
    if not credentials:
        return error_response(
            message="No hay cuenta de Search Console configurada",
            status_code=400,
            error="No Search Console account configured",
            path=str(request.url.path)
        )
    
    try:
        cache_key_str = cache_key(
            "seo:pages",
            startDate,
            endDate,
            accountId=accountId,
            propertyUri=propertyUri,
            limit=limit
        )
        cached_pages = get_from_cache(cache_key_str)
        
        if cached_pages:
            return success_response(
                data=cached_pages,
                message="Páginas obtenidas exitosamente (cache)",
                status_code=200,
                path=str(request.url.path)
            )
        
        pages = await search_console_service.get_top_pages(
            startDate,
            endDate,
            property_uri=propertyUri,
            credentials=credentials,
            limit=limit
        )
        
        set_to_cache(cache_key_str, pages, ttl=3600)
        
        return success_response(
            data=pages,
            message="Páginas obtenidas exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except OAuthExpiredError as auth_err:
        return error_response(
            message=str(auth_err), status_code=401,
            error="oauth_expired", path=str(request.url.path)
        )
    except Exception as e:
        logger.error(f"Error al obtener páginas: {str(e)}")
        return error_response(
            message=str(e),
            status_code=500,
            error="Error al obtener páginas",
            path=str(request.url.path)
        )

@router.get("/trends")
async def get_seo_trends(
    request: Request,
    startDate: Optional[str] = Query(None, alias="startDate"),
    endDate: Optional[str] = Query(None, alias="endDate"),
    accountId: Optional[int] = Query(None, alias="accountId"),
    propertyUri: Optional[str] = Query(None, alias="propertyUri"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener tendencias de rendimiento"""
    if not startDate or not endDate:
        return error_response(
            message="startDate and endDate are required",
            status_code=400,
            error="Missing required parameters",
            path=str(request.url.path)
        )
    
    credentials = _get_credentials_with_oauth(
        db,
        current_user.organization_id,
        accountId
    )
    
    if not credentials:
        return error_response(
            message="No hay cuenta de Search Console configurada",
            status_code=400,
            error="No Search Console account configured",
            path=str(request.url.path)
        )
    
    try:
        cache_key_str = cache_key(
            "seo:trends",
            startDate,
            endDate,
            accountId=accountId,
            propertyUri=propertyUri
        )
        cached_trends = get_from_cache(cache_key_str)
        
        if cached_trends:
            return success_response(
                data=cached_trends,
                message="Tendencias obtenidas exitosamente (cache)",
                status_code=200,
                path=str(request.url.path)
            )
        
        trends = await search_console_service.get_performance_trends(
            startDate,
            endDate,
            property_uri=propertyUri,
            credentials=credentials
        )
        
        set_to_cache(cache_key_str, trends, ttl=1800)
        
        return success_response(
            data=trends,
            message="Tendencias obtenidas exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except OAuthExpiredError as auth_err:
        return error_response(
            message=str(auth_err), status_code=401,
            error="oauth_expired", path=str(request.url.path)
        )
    except Exception as e:
        logger.error(f"Error al obtener tendencias: {str(e)}")
        return error_response(
            message=str(e),
            status_code=500,
            error="Error al obtener tendencias",
            path=str(request.url.path)
        )

@router.get("/devices")
async def get_seo_devices(
    request: Request,
    startDate: Optional[str] = Query(None, alias="startDate"),
    endDate: Optional[str] = Query(None, alias="endDate"),
    accountId: Optional[int] = Query(None, alias="accountId"),
    propertyUri: Optional[str] = Query(None, alias="propertyUri"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener desglose por dispositivo"""
    if not startDate or not endDate:
        return error_response(
            message="startDate and endDate are required",
            status_code=400,
            error="Missing required parameters",
            path=str(request.url.path)
        )
    
    credentials = _get_credentials_with_oauth(
        db,
        current_user.organization_id,
        accountId
    )
    
    if not credentials:
        return error_response(
            message="No hay cuenta de Search Console configurada",
            status_code=400,
            error="No Search Console account configured",
            path=str(request.url.path)
        )
    
    try:
        cache_key_str = cache_key(
            "seo:devices",
            startDate,
            endDate,
            accountId=accountId,
            propertyUri=propertyUri
        )
        cached_devices = get_from_cache(cache_key_str)
        
        if cached_devices:
            return success_response(
                data=cached_devices,
                message="Desglose por dispositivo obtenido exitosamente (cache)",
                status_code=200,
                path=str(request.url.path)
            )
        
        devices = await search_console_service.get_device_breakdown(
            startDate,
            endDate,
            property_uri=propertyUri,
            credentials=credentials
        )
        
        set_to_cache(cache_key_str, devices, ttl=3600)
        
        return success_response(
            data=devices,
            message="Desglose por dispositivo obtenido exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except OAuthExpiredError as auth_err:
        return error_response(
            message=str(auth_err), status_code=401,
            error="oauth_expired", path=str(request.url.path)
        )
    except Exception as e:
        logger.error(f"Error al obtener desglose por dispositivo: {str(e)}")
        return error_response(
            message=str(e),
            status_code=500,
            error="Error al obtener desglose por dispositivo",
            path=str(request.url.path)
        )

@router.get("/countries")
async def get_seo_countries(
    request: Request,
    startDate: Optional[str] = Query(None, alias="startDate"),
    endDate: Optional[str] = Query(None, alias="endDate"),
    accountId: Optional[int] = Query(None, alias="accountId"),
    propertyUri: Optional[str] = Query(None, alias="propertyUri"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener desglose por país"""
    if not startDate or not endDate:
        return error_response(
            message="startDate and endDate are required",
            status_code=400,
            error="Missing required parameters",
            path=str(request.url.path)
        )
    
    credentials = _get_credentials_with_oauth(
        db,
        current_user.organization_id,
        accountId
    )
    
    if not credentials:
        return error_response(
            message="No hay cuenta de Search Console configurada",
            status_code=400,
            error="No Search Console account configured",
            path=str(request.url.path)
        )
    
    try:
        cache_key_str = cache_key(
            "seo:countries",
            startDate,
            endDate,
            accountId=accountId,
            propertyUri=propertyUri
        )
        cached_countries = get_from_cache(cache_key_str)
        
        if cached_countries:
            return success_response(
                data=cached_countries,
                message="Desglose por país obtenido exitosamente (cache)",
                status_code=200,
                path=str(request.url.path)
            )
        
        countries = await search_console_service.get_country_breakdown(
            startDate,
            endDate,
            property_uri=propertyUri,
            credentials=credentials
        )
        
        set_to_cache(cache_key_str, countries, ttl=3600)
        
        return success_response(
            data=countries,
            message="Desglose por país obtenido exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except OAuthExpiredError as auth_err:
        return error_response(
            message=str(auth_err), status_code=401,
            error="oauth_expired", path=str(request.url.path)
        )
    except Exception as e:
        logger.error(f"Error al obtener desglose por país: {str(e)}")
        return error_response(
            message=str(e),
            status_code=500,
            error="Error al obtener desglose por país",
            path=str(request.url.path)
        )

@router.get("/properties")
async def get_seo_properties(
    request: Request,
    accountId: Optional[int] = Query(None, alias="accountId"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener lista de propiedades de Search Console"""
    credentials = _get_credentials_with_oauth(
        db,
        current_user.organization_id,
        accountId
    )
    
    if not credentials:
        return error_response(
            message="No hay cuenta de Search Console configurada",
            status_code=400,
            error="No Search Console account configured",
            path=str(request.url.path)
        )
    
    try:
        # Cache más largo para propiedades (6 horas, cambian raramente)
        cache_key_str = cache_key("seo:properties", accountId=accountId)
        cached_properties = get_from_cache(cache_key_str)
        
        if cached_properties:
            return success_response(
                data=cached_properties,
                message="Propiedades obtenidas exitosamente (cache)",
                status_code=200,
                path=str(request.url.path)
            )
        
        properties = await search_console_service.list_properties(credentials)
        
        set_to_cache(cache_key_str, properties, ttl=21600)
        
        return success_response(
            data=properties,
            message="Propiedades obtenidas exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except OAuthExpiredError as auth_err:
        logger.warning(f"OAuth expired for SEO properties: {str(auth_err)}")
        return error_response(
            message=str(auth_err),
            status_code=401,
            error="oauth_expired",
            path=str(request.url.path)
        )
    except Exception as e:
        logger.error(f"Error al obtener propiedades: {str(e)}")
        return error_response(
            message=str(e),
            status_code=500,
            error="Error al obtener propiedades",
            path=str(request.url.path)
        )

@router.get("/rankings")
async def get_seo_rankings(
    request: Request,
    keywords: Optional[str] = None,
    city: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Endpoint consolidado para rankings SEO"""
    if not keywords:
        return error_response(
            message="keywords parameter is required",
            status_code=400,
            error="Missing required parameters",
            path=str(request.url.path)
        )
    
    try:
        keyword_list = [k.strip() for k in keywords.split(",")]
        rankings = await rankings_service.get_rankings(keyword_list, city, "ES")
        return success_response(
            data=rankings,
            message="Rankings obtenidos exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        return error_response(
            message=str(e),
            status_code=500,
            error="Error al obtener rankings",
            path=str(request.url.path)
        )

