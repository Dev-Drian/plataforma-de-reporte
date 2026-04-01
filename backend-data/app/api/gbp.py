"""
API endpoints para Google Business Profile (GBP)

Este módulo proporciona endpoints para interactuar con la API de Google Business Profile,
utilizando el módulo centralizado de autenticación para obtener credenciales OAuth.
"""
from fastapi import APIRouter, Query, Depends, Request
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.auth_middleware import get_current_user
from app.core.response import success_response, error_response
from app.core.cache import get_from_cache, set_to_cache, cache_key
from app.core.auth_credentials import get_gbp_credentials
from app.models import User
from app.services.gbp import GBPService
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
gbp_service = GBPService()


@router.get("/locations")
async def get_locations(
    request: Request,
    accountId: Optional[int] = Query(None, alias="accountId"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener lista de ubicaciones de Google Business Profile
    
    Args:
        accountId: ID opcional de la cuenta específica
        current_user: Usuario autenticado (inyectado automáticamente)
        db: Sesión de base de datos (inyectada automáticamente)
    
    Returns:
        Lista de ubicaciones de GBP asociadas a la cuenta
    """
    credentials = get_gbp_credentials(
        db,
        current_user.organization_id,
        accountId
    )
    
    if not credentials:
        return error_response(
            message="No hay cuenta de Google Business Profile configurada. Configúrala en Settings > Cuentas.",
            status_code=400,
            error="No GBP account configured",
            path=str(request.url.path)
        )
    
    try:
        # Cache para ubicaciones (6 horas, cambian raramente)
        cache_key_str = cache_key("gbp:locations", accountId=accountId)
        cached_locations = get_from_cache(cache_key_str)
        
        if cached_locations:
            return success_response(
                data=cached_locations,
                message="Ubicaciones obtenidas exitosamente (cache)",
                status_code=200,
                path=str(request.url.path)
            )
        
        # Obtener ubicaciones usando el servicio
        locations = await gbp_service.list_locations(credentials)
        
        set_to_cache(cache_key_str, locations, ttl=21600)
        
        return success_response(
            data=locations,
            message="Ubicaciones obtenidas exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        logger.error(f"Error al obtener ubicaciones de GBP: {str(e)}")
        return error_response(
            message=str(e),
            status_code=500,
            error="Error al obtener ubicaciones",
            path=str(request.url.path)
        )


@router.get("/metrics")
async def get_gbp_metrics(
    request: Request,
    startDate: Optional[str] = Query(None, alias="startDate"),
    endDate: Optional[str] = Query(None, alias="endDate"),
    accountId: Optional[int] = Query(None, alias="accountId"),
    locationId: Optional[str] = Query(None, alias="locationId"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener métricas de Google Business Profile
    
    Args:
        startDate: Fecha de inicio (formato: YYYY-MM-DD)
        endDate: Fecha de fin (formato: YYYY-MM-DD)
        accountId: ID opcional de la cuenta específica
        locationId: ID opcional de la ubicación específica
        current_user: Usuario autenticado (inyectado automáticamente)
        db: Sesión de base de datos (inyectada automáticamente)
    
    Returns:
        Métricas de GBP para el período especificado
    """
    if not startDate or not endDate:
        return error_response(
            message="startDate and endDate are required",
            status_code=400,
            error="Missing required parameters",
            path=str(request.url.path)
        )
    
    credentials = get_gbp_credentials(
        db,
        current_user.organization_id,
        accountId
    )
    
    if not credentials:
        return error_response(
            message="No hay cuenta de Google Business Profile configurada. Configúrala en Settings > Cuentas.",
            status_code=400,
            error="No GBP account configured",
            path=str(request.url.path)
        )
    
    try:
        # Cache para métricas (30 minutos)
        cache_key_str = cache_key(
            "gbp:metrics",
            startDate,
            endDate,
            accountId=accountId,
            locationId=locationId
        )
        cached_metrics = get_from_cache(cache_key_str)
        
        if cached_metrics:
            return success_response(
                data=cached_metrics,
                message="Métricas obtenidas exitosamente (cache)",
                status_code=200,
                path=str(request.url.path)
            )
        
        # Obtener métricas usando el servicio
        metrics = await gbp_service.get_metrics(
            startDate,
            endDate,
            locationId,
            credentials
        )
        
        set_to_cache(cache_key_str, metrics, ttl=1800)
        
        return success_response(
            data=metrics,
            message="Métricas obtenidas exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        logger.error(f"Error al obtener métricas de GBP: {str(e)}")
        return error_response(
            message=str(e),
            status_code=500,
            error="Error al obtener métricas",
            path=str(request.url.path)
        )



