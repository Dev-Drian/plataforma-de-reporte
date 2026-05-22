"""
Rutas para configuración OAuth (Providers y Configs)
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth_middleware import get_current_user
from app.core.response import success_response, created_response, error_response
from app.models import User, OAuthConfig, OAuthProvider
from app.core.permissions import require_admin
from app.schemas.oauth import (
    OAuthConfigCreate,
    OAuthConfigUpdate,
)
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/providers")
async def get_oauth_providers(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene todos los proveedores OAuth disponibles
    Solo para administradores
    """
    try:
        # Verificar que el usuario sea admin
        require_admin(current_user, db)
        
        providers = db.query(OAuthProvider).filter(
            OAuthProvider.is_active == True
        ).all()
        
        providers_data = []
        for provider in providers:
            required_fields = provider.get_required_fields()
            providers_data.append({
                "id": provider.id,
                "name": provider.name,
                "display_name": provider.display_name,
                "icon": provider.icon,
                "color": provider.color,
                "required_fields": required_fields,
                "is_active": provider.is_active,
                "created_at": provider.created_at.isoformat() if provider.created_at else None,
                "updated_at": provider.updated_at.isoformat() if provider.updated_at else None
            })
        
        return success_response(
            data=providers_data,
            message="Proveedores OAuth obtenidos exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error al obtener proveedores OAuth: {str(e)}\n{traceback.format_exc()}")
        return error_response(
            "Error al obtener proveedores OAuth",
            500,
            str(e),
            str(request.url.path)
        )


@router.get("/providers/{provider_name}")
async def get_oauth_provider(
    provider_name: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene un proveedor OAuth específico por nombre
    Solo para administradores
    """
    try:
        # Verificar que el usuario sea admin
        require_admin(current_user, db)
        
        provider = db.query(OAuthProvider).filter(
            OAuthProvider.name == provider_name.lower(),
            OAuthProvider.is_active == True
        ).first()
        
        if not provider:
            return error_response(
                f"No se encontró el proveedor OAuth: {provider_name}",
                404,
                f"OAuth provider not found: {provider_name}",
                str(request.url.path)
            )
        
        required_fields = provider.get_required_fields()
        provider_data = {
            "id": provider.id,
            "name": provider.name,
            "display_name": provider.display_name,
            "icon": provider.icon,
            "color": provider.color,
            "required_fields": required_fields,
            "is_active": provider.is_active,
            "created_at": provider.created_at.isoformat() if provider.created_at else None,
            "updated_at": provider.updated_at.isoformat() if provider.updated_at else None
        }
        
        return success_response(
            data=provider_data,
            message="Proveedor OAuth obtenido exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error al obtener proveedor OAuth: {str(e)}\n{traceback.format_exc()}")
        return error_response(
            f"Error al obtener proveedor OAuth: {provider_name}",
            500,
            str(e),
            str(request.url.path)
        )


@router.get("/configs")
async def get_oauth_configs(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene todas las configuraciones OAuth de la organización"""
    try:
        configs = db.query(OAuthConfig).filter(
            OAuthConfig.organization_id == current_user.organization_id,
            OAuthConfig.is_active == True
        ).all()
        
        # Convertir a formato de respuesta
        configs_data = []
        for config in configs:
            scopes = json.loads(config.scopes) if config.scopes else []
            configs_data.append({
                "id": config.id,
                "organization_id": config.organization_id,
                "platform": config.platform,
                "client_id": config.client_id,
                "client_secret": "***" if config.client_secret else None,  # Ocultar secret en listado
                "redirect_uri": config.redirect_uri,
                "scopes": scopes,
                "developer_token": "***" if config.developer_token else None,  # Ocultar token en listado
                "is_active": config.is_active,
                "created_at": config.created_at.isoformat() if config.created_at else None,
                "updated_at": config.updated_at.isoformat() if config.updated_at else None
            })
        
        return success_response(
            data=configs_data,
            message="Configuraciones OAuth obtenidas exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        import traceback
        logger.error(f"Error al obtener configuraciones OAuth: {str(e)}\n{traceback.format_exc()}")
        return error_response(
            "Error al obtener configuraciones OAuth",
            500,
            str(e),
            str(request.url.path)
        )


@router.get("/configs/{platform}")
async def get_oauth_config(
    platform: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene la configuración OAuth de una plataforma específica"""
    try:
        config = db.query(OAuthConfig).filter(
            OAuthConfig.organization_id == current_user.organization_id,
            OAuthConfig.platform == platform.lower(),
            OAuthConfig.is_active == True
        ).first()
        
        if not config:
            return error_response(
                f"No hay configuración OAuth para la plataforma {platform}",
                404,
                f"OAuth config not found for platform: {platform}",
                str(request.url.path)
            )
        
        scopes = json.loads(config.scopes) if config.scopes else []
        config_data = {
            "id": config.id,
            "organization_id": config.organization_id,
            "platform": config.platform,
            "client_id": config.client_id,
            "client_secret": config.client_secret,  # Mostrar completo en detalle
            "redirect_uri": config.redirect_uri,
            "scopes": scopes,
            "developer_token": config.developer_token if hasattr(config, 'developer_token') else None,  # Mostrar completo en detalle
            "is_active": config.is_active,
            "created_at": config.created_at.isoformat() if config.created_at else None,
            "updated_at": config.updated_at.isoformat() if config.updated_at else None
        }
        
        return success_response(
            data=config_data,
            message="Configuración OAuth obtenida exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        import traceback
        logger.error(f"Error al obtener configuración OAuth: {str(e)}\n{traceback.format_exc()}")
        return error_response(
            f"Error al obtener configuración OAuth para {platform}",
            500,
            str(e),
            str(request.url.path)
        )


@router.post("/configs")
async def create_oauth_config(
    config_data: OAuthConfigCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crea la configuración OAuth para una plataforma"""
    try:
        # Validar que la plataforma sea válida y obtener el provider
        platform_lower = config_data.platform.lower()
        provider = db.query(OAuthProvider).filter(
            OAuthProvider.name == platform_lower,
            OAuthProvider.is_active == True
        ).first()
        
        if not provider:
            return error_response(
                f"Plataforma inválida o no disponible: {config_data.platform}",
                400,
                f"Invalid or inactive platform: {config_data.platform}",
                str(request.url.path)
            )
        
        # Verificar si ya existe
        existing = db.query(OAuthConfig).filter(
            OAuthConfig.organization_id == current_user.organization_id,
            OAuthConfig.platform == platform_lower
        ).first()
        
        if existing:
            return error_response(
                f"Ya existe una configuración OAuth para la plataforma {provider.display_name}. "
                f"Utiliza el endpoint PUT /configs/{platform_lower} para actualizarla.",
                409,
                f"OAuth config already exists for platform: {platform_lower}",
                str(request.url.path)
            )
        
        # Validar scopes según la plataforma
        if config_data.scopes:
            if platform_lower == "google":
                invalid_scopes = [s for s in config_data.scopes if not s.startswith("https://www.googleapis.com/auth/")]
                if invalid_scopes:
                    return error_response(
                        f"Scopes inválidos para Google: {', '.join(invalid_scopes)}. "
                        f"Los scopes deben comenzar con 'https://www.googleapis.com/auth/'",
                        400,
                        f"Invalid Google OAuth scopes: {invalid_scopes}",
                        str(request.url.path)
                    )
        
        # Crear nuevo
        config = OAuthConfig(
            organization_id=current_user.organization_id,
            provider_id=provider.id,
            platform=platform_lower,
            client_id=config_data.client_id,
            client_secret=config_data.client_secret,
            redirect_uri=config_data.redirect_uri,
            scopes=json.dumps(config_data.scopes) if config_data.scopes else None,
            developer_token=config_data.developer_token if hasattr(config_data, 'developer_token') else None
        )
        
        db.add(config)
        db.commit()
        db.refresh(config)
        
        scopes = json.loads(config.scopes) if config.scopes else []
        config_response = {
            "id": config.id,
            "organization_id": config.organization_id,
            "platform": config.platform,
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "redirect_uri": config.redirect_uri,
            "scopes": scopes,
            "developer_token": config.developer_token if hasattr(config, 'developer_token') else None,
            "is_active": config.is_active,
            "created_at": config.created_at.isoformat() if config.created_at else None,
            "updated_at": config.updated_at.isoformat() if config.updated_at else None
        }
        
        return created_response(
            data=config_response,
            message=f"Configuración OAuth para {platform_lower} creada exitosamente",
            path=str(request.url.path)
        )
    except Exception as e:
        import traceback
        logger.error(f"Error al crear configuración OAuth: {str(e)}\n{traceback.format_exc()}")
        return error_response(
            "Error al guardar la configuración OAuth",
            500,
            str(e),
            str(request.url.path)
        )


@router.put("/configs/{platform}")
async def update_oauth_config(
    platform: str,
    config_data: OAuthConfigUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualiza la configuración OAuth de una plataforma"""
    try:
        config = db.query(OAuthConfig).filter(
            OAuthConfig.organization_id == current_user.organization_id,
            OAuthConfig.platform == platform.lower()
        ).first()
        
        if not config:
            return error_response(
                f"No hay configuración OAuth para la plataforma {platform}",
                404,
                f"OAuth config not found for platform: {platform}",
                str(request.url.path)
            )
        
        # Validar scopes si se están actualizando
        if config_data.scopes is not None:
            platform_lower = platform.lower()
            if platform_lower == "google":
                invalid_scopes = [s for s in config_data.scopes if not s.startswith("https://www.googleapis.com/auth/")]
                if invalid_scopes:
                    return error_response(
                        f"Scopes inválidos para Google: {', '.join(invalid_scopes)}. "
                        f"Los scopes deben comenzar con 'https://www.googleapis.com/auth/'",
                        400,
                        f"Invalid Google OAuth scopes: {invalid_scopes}",
                        str(request.url.path)
                    )
        
        if config_data.client_id is not None:
            config.client_id = config_data.client_id
        if config_data.client_secret is not None:
            config.client_secret = config_data.client_secret
        if config_data.redirect_uri is not None:
            config.redirect_uri = config_data.redirect_uri
        if config_data.scopes is not None:
            config.scopes = json.dumps(config_data.scopes)
        if config_data.developer_token is not None:
            config.developer_token = config_data.developer_token
        if config_data.is_active is not None:
            config.is_active = config_data.is_active
        
        db.commit()
        db.refresh(config)
        
        scopes = json.loads(config.scopes) if config.scopes else []
        config_response = {
            "id": config.id,
            "organization_id": config.organization_id,
            "platform": config.platform,
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "redirect_uri": config.redirect_uri,
            "scopes": scopes,
            "developer_token": config.developer_token if hasattr(config, 'developer_token') else None,
            "is_active": config.is_active,
            "created_at": config.created_at.isoformat() if config.created_at else None,
            "updated_at": config.updated_at.isoformat() if config.updated_at else None
        }
        
        return success_response(
            data=config_response,
            message=f"Configuración OAuth para {platform} actualizada exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        import traceback
        logger.error(f"Error al actualizar configuración OAuth: {str(e)}\n{traceback.format_exc()}")
        return error_response(
            f"Error al actualizar configuración OAuth para {platform}",
            500,
            str(e),
            str(request.url.path)
        )





