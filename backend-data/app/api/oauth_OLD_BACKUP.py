"""
Endpoints para configuración OAuth y flujo de autenticación
Diseñado para SaaS multi-tenant
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.auth_middleware import get_current_user
from app.core.response import success_response, created_response, error_response
from app.models import User, OAuthConfig, Account, OAuthProvider
from app.core.permissions import require_admin
from app.schemas.oauth import (
    OAuthConfigCreate,
    OAuthConfigUpdate,
    OAuthConfigResponse,
    OAuthInitRequest,
    OAuthInitResponse,
    OAuthCallbackRequest,
    OAuthCallbackResponse
)
import secrets
import json
import httpx
import logging
from urllib.parse import urlencode
from datetime import datetime, timedelta

# Importar funciones de Google desde el módulo organizado
from app.api.oauth.google import (
    get_google_ads_customer_id,
    get_google_user_info,
    get_account_id_for_type,
    get_first_analytics_property,
    get_search_console_sites
)

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
        import logging
        logger = logging.getLogger(__name__)
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
        import logging
        logger = logging.getLogger(__name__)
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
        import logging
        logger = logging.getLogger(__name__)
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
    """Crea o actualiza la configuración OAuth para una plataforma"""
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
            # Devolver error indicando que ya existe
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
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error al crear/actualizar configuración OAuth: {str(e)}\n{traceback.format_exc()}")
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
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error al actualizar configuración OAuth: {str(e)}\n{traceback.format_exc()}")
        return error_response(
            f"Error al actualizar configuración OAuth para {platform}",
            500,
            str(e),
            str(request.url.path)
        )


@router.post("/init", response_model=OAuthInitResponse)
async def init_oauth_flow(
    oauth_data: OAuthInitRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Inicia el flujo OAuth
    Retorna la URL de autorización y un state token
    """
    try:
        logger.info(f"🔐 ========== Iniciando flujo OAuth ==========")
        logger.info(f"🔐 Platform: {oauth_data.platform}")
        logger.info(f"🔐 Account type: {oauth_data.account_type}")
        logger.info(f"🔐 Organization ID: {current_user.organization_id}")
        logger.info(f"🔐 User ID: {current_user.id}")
        
        # Obtener configuración OAuth
        config = db.query(OAuthConfig).filter(
            OAuthConfig.organization_id == current_user.organization_id,
            OAuthConfig.platform == oauth_data.platform.lower(),
            OAuthConfig.is_active == True
        ).first()
        
        if not config:
            logger.warning(f"⚠️ No se encontró configuración OAuth para {oauth_data.platform}")
            return error_response(
                f"No hay configuración OAuth para {oauth_data.platform}. Configúrala primero.",
                400,
                "OAuth config not found",
                str(request.url.path)
            )
        
        logger.info(f"🔐 Config OAuth encontrada - ID: {config.id}")
        logger.info(f"🔐 Client ID presente: {bool(config.client_id)}")
        logger.info(f"🔐 Redirect URI: {config.redirect_uri}")
        
        # Generar state token (debería guardarse en Redis/sesión para validar después)
        state_token = secrets.token_urlsafe(32)
        logger.info(f"🔐 State token generado: {state_token[:20]}...")
        
        # Construir URL de autorización según la plataforma
        logger.info(f"🔐 Construyendo URL de autorización...")
        auth_url = _build_auth_url(oauth_data.platform, config, state_token, oauth_data.account_type)
        logger.info(f"🔐 URL de autorización construida exitosamente")
        logger.info(f"🔐 URL length: {len(auth_url)} caracteres")
        
        logger.info(f"✅ ========== Flujo OAuth iniciado exitosamente ==========")
        
        return success_response(
            data={
                "auth_url": auth_url,
                "state": state_token
            },
            message="OAuth flow iniciado",
            status_code=200,
            path=str(request.url.path)
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"❌ ========== Error al iniciar OAuth ==========")
        logger.error(f"❌ Error: {str(e)}")
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        logger.error(f"❌ ===========================================")
        return error_response(
            f"Error al iniciar OAuth: {str(e)}",
            500,
            str(e),
            str(request.url.path)
        )


@router.post("/callback", response_model=OAuthCallbackResponse)
async def oauth_callback(
    callback_data: OAuthCallbackRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Callback del flujo OAuth
    Intercambia el authorization code por tokens y crea/actualiza la cuenta
    """
    # Validar state token (en producción, validar contra Redis/sesión)
    # Por ahora solo verificamos que existe
    
    # Obtener configuración OAuth
    config = db.query(OAuthConfig).filter(
        OAuthConfig.organization_id == current_user.organization_id,
        OAuthConfig.platform == callback_data.platform.lower(),
        OAuthConfig.is_active == True
    ).first()
    
    if not config:
        return error_response(
            f"No hay configuración OAuth para {callback_data.platform}",
            400,
            "OAuth config not found",
            str(request.url.path)
        )
    
    # Intercambiar code por tokens
    try:
        tokens = await _exchange_code_for_tokens(
            callback_data.platform,
            config,
            callback_data.code,
            callback_data.account_type
        )
    except Exception as e:
        logger.error(f"Error al obtener tokens OAuth: {str(e)}")
        raise
    
    if not tokens:
        return error_response(
            "Error al obtener tokens OAuth",
            500,
            "Token exchange failed",
            str(request.url.path)
        )
    
    # Verificar si la cuenta ya existe
    existing_account = db.query(Account).filter(
        Account.organization_id == current_user.organization_id,
        Account.platform == callback_data.platform.lower(),
        Account.account_type == callback_data.account_type,
        Account.account_id == (callback_data.account_id or tokens.get("account_id", ""))
    ).first()
    
    if existing_account:
        # Actualizar tokens
        existing_account.access_token = tokens.get("access_token")
        existing_account.refresh_token = tokens.get("refresh_token")
        if tokens.get("expires_in"):
            existing_account.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
        if callback_data.account_name:
            existing_account.account_name = callback_data.account_name
        
        # Actualizar extra_data con información adicional (especialmente para Google Ads)
        if tokens.get("ads_info"):
            ads_info = tokens.get("ads_info")
            extra_data_dict = {}
            try:
                if existing_account.extra_data:
                    extra_data_dict = json.loads(existing_account.extra_data)
                    logger.info(f"🔐 Extra_data existente cargado: {extra_data_dict}")
            except Exception as e:
                logger.warning(f"⚠️ Error al parsear extra_data existente: {str(e)}")
                pass
            extra_data_dict["is_mcc"] = ads_info.get("is_mcc", False)
            extra_data_dict["customer_id"] = ads_info.get("customer_id")
            extra_data_dict["descriptive_name"] = ads_info.get("descriptive_name")
            existing_account.extra_data = json.dumps(extra_data_dict)
            logger.info(f"🔐 ========== Actualizando información de Google Ads ==========")
            logger.info(f"🔐 is_mcc: {extra_data_dict.get('is_mcc')}")
            logger.info(f"🔐 customer_id: {extra_data_dict.get('customer_id')}")
            logger.info(f"🔐 descriptive_name: {extra_data_dict.get('descriptive_name')}")
            logger.info(f"🔐 extra_data JSON: {existing_account.extra_data}")
            logger.info(f"🔐 =============================================================")
        
        existing_account.is_active = True
        db.commit()
        db.refresh(existing_account)
        
        return success_response(
            data={
                "account_id": existing_account.id,
                "account_name": existing_account.account_name,
                "platform": existing_account.platform,
                "account_type": existing_account.account_type,
                "message": "Cuenta actualizada exitosamente"
            },
            message="Cuenta actualizada exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    
    # Crear nueva cuenta
    account_id_final = callback_data.account_id or tokens.get("account_id", "")
    account_name_final = callback_data.account_name or tokens.get("account_name")
    
    # Validar que para Search Console haya sitios configurados
    if callback_data.account_type == "search_console" and account_id_final.startswith("unknown_"):
        return error_response(
            "No se encontraron sitios en Google Search Console. "
            "Por favor, primero configura y verifica al menos un sitio en Google Search Console "
            "(https://search.google.com/search-console), y luego intenta conectar la cuenta nuevamente.",
            400,
            "No Search Console sites found",
            str(request.url.path)
        )
    
    # Preparar extra_data con información adicional (especialmente para Google Ads)
    extra_data_dict = {}
    if tokens.get("ads_info"):
        ads_info = tokens.get("ads_info")
        extra_data_dict["is_mcc"] = ads_info.get("is_mcc", False)
        extra_data_dict["customer_id"] = ads_info.get("customer_id")
        extra_data_dict["descriptive_name"] = ads_info.get("descriptive_name")
        logger.info(f"🔐 ========== Guardando información de Google Ads ==========")
        logger.info(f"🔐 is_mcc: {extra_data_dict.get('is_mcc')}")
        logger.info(f"🔐 customer_id: {extra_data_dict.get('customer_id')}")
        logger.info(f"🔐 descriptive_name: {extra_data_dict.get('descriptive_name')}")
        logger.info(f"🔐 extra_data JSON: {json.dumps(extra_data_dict)}")
        logger.info(f"🔐 =========================================================")
    
    new_account = Account(
        organization_id=current_user.organization_id,
        platform=callback_data.platform.lower(),
        account_type=callback_data.account_type,
        account_id=account_id_final,
        account_name=account_name_final,
        user_email=current_user.email,
        access_token=tokens.get("access_token"),
        refresh_token=tokens.get("refresh_token"),
        is_active=True,
        extra_data=json.dumps(extra_data_dict) if extra_data_dict else None
    )
    
    if tokens.get("expires_in"):
        new_account.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
    
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    
    return created_response(
        data={
            "account_id": new_account.id,
            "account_name": new_account.account_name,
            "platform": new_account.platform,
            "account_type": new_account.account_type,
            "message": "Cuenta conectada exitosamente"
        },
        message="Cuenta conectada exitosamente",
        path=str(request.url.path)
    )


def _build_auth_url(platform: str, config: OAuthConfig, state: str, account_type: str) -> str:
    """Construye la URL de autorización según la plataforma"""
    try:
        logger.info(f"🔐 _build_auth_url - Iniciando construcción de URL")
        logger.info(f"🔐 Platform: {platform}")
        logger.info(f"🔐 Account type: {account_type}")
        logger.info(f"🔐 State: {state[:20] if state else 'None'}...")
        logger.info(f"🔐 Config type: {type(config)}")
        logger.info(f"🔐 Config ID: {config.id if hasattr(config, 'id') else 'N/A'}")
        
        # Parsear scopes
        scopes = []
        try:
            logger.info(f"🔐 Verificando scopes...")
            logger.info(f"🔐 config.scopes type: {type(config.scopes)}")
            logger.info(f"🔐 config.scopes value: {config.scopes}")
            
            if config.scopes:
                try:
                    scopes = json.loads(config.scopes)
                    logger.info(f"🔐 Scopes parseados exitosamente: {len(scopes)} scopes")
                    logger.info(f"🔐 Scopes: {scopes}")
                except json.JSONDecodeError as e:
                    logger.warning(f"⚠️ Error al parsear scopes como JSON: {str(e)}")
                    logger.warning(f"⚠️ Scopes raw: {config.scopes}")
                    # Intentar como lista de Python si es string
                    if isinstance(config.scopes, str) and config.scopes.startswith('['):
                        try:
                            import ast
                            scopes = ast.literal_eval(config.scopes)
                            logger.info(f"🔐 Scopes parseados con ast: {len(scopes)} scopes")
                        except:
                            scopes = []
                    else:
                        scopes = []
            else:
                logger.info(f"🔐 No hay scopes configurados, usando defaults")
        except Exception as e:
            logger.error(f"❌ Error al procesar scopes: {str(e)}")
            logger.exception(e)
            scopes = []
        
        if platform.lower() == "google":
            base_url = "https://accounts.google.com/o/oauth2/v2/auth"
            # Determinar scope por defecto según account_type
            if not scopes:
                if account_type == "ads":
                    scope_string = "https://www.googleapis.com/auth/adwords"
                else:
                    scope_string = "https://www.googleapis.com/auth/webmasters.readonly"
            else:
                scope_string = " ".join(scopes)
            redirect_uri = config.redirect_uri or "http://localhost:3000/oauth/callback"
            
            logger.info(f"🔐 Base URL: {base_url}")
            logger.info(f"🔐 Scope string: {scope_string[:100]}...")  # Primeros 100 chars
            logger.info(f"🔐 Redirect URI: {redirect_uri}")
            logger.info(f"🔐 Client ID presente: {bool(config.client_id)}")
            
            if not config.client_id:
                raise ValueError("client_id es requerido para Google OAuth")
            
            params = {
                "client_id": config.client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": scope_string,
                "access_type": "offline",
                "prompt": "consent",
                "state": state
            }
            
            logger.info(f"🔐 Parámetros preparados: {list(params.keys())}")
            
            # Codificar correctamente los parámetros de la URL
            auth_url = f"{base_url}?{urlencode(params)}"
            logger.info(f"🔐 URL construida exitosamente - Longitud: {len(auth_url)}")
            return auth_url
        
        elif platform.lower() == "meta":
            base_url = "https://www.facebook.com/v18.0/dialog/oauth"
            scope_string = ",".join(scopes) if scopes else "ads_read"
            redirect_uri = config.redirect_uri or "http://localhost:3000/oauth/callback"
            
            logger.info(f"🔐 Base URL: {base_url}")
            logger.info(f"🔐 Scope string: {scope_string}")
            logger.info(f"🔐 Redirect URI: {redirect_uri}")
            
            params = {
                "client_id": config.client_id,
                "redirect_uri": redirect_uri,
                "state": state,
                "scope": scope_string
            }
            
            auth_url = f"{base_url}?{'&'.join([f'{k}={v}' for k, v in params.items()])}"
            logger.info(f"🔐 URL construida exitosamente - Longitud: {len(auth_url)}")
            return auth_url
        
        # Agregar más plataformas según sea necesario
        else:
            error_msg = f"Plataforma {platform} no soportada aún"
            logger.error(f"❌ {error_msg}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
    except HTTPException as he:
        logger.error(f"❌ HTTPException en _build_auth_url: {he.detail}")
        raise
    except AttributeError as ae:
        logger.error(f"❌ AttributeError en _build_auth_url: {str(ae)}")
        logger.error(f"❌ Config object: {config}")
        logger.error(f"❌ Config attributes: {dir(config)}")
        logger.exception(ae)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al acceder a atributos de configuración: {str(ae)}"
        )
    except Exception as e:
        logger.error(f"❌ Error en _build_auth_url: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        logger.exception(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al construir URL de autorización: {str(e)}"
        )


async def _exchange_code_for_tokens(platform: str, config: OAuthConfig, code: str, account_type: str) -> dict:
    """
    Intercambia el authorization code por tokens
    Implementación para Google OAuth 2.0
    Un mismo OAuth puede servir para todas las APIs de Google (Search Console, Analytics, Ads, etc.)
    siempre que se incluyan los scopes necesarios
    """
    if platform.lower() == "google":
        token_url = "https://oauth2.googleapis.com/token"
        
        # Preparar datos para el intercambio de tokens
        data = {
            "code": code,
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "redirect_uri": config.redirect_uri or "http://localhost:3000/oauth/callback",
            "grant_type": "authorization_code"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                logger.info(f"🔐 OAuth Google - Intercambiando código por tokens...")
                logger.info(f"🔐 Token URL: {token_url}")
                logger.info(f"🔐 Client ID: {config.client_id[:20]}...")  # Solo primeros 20 chars por seguridad
                logger.info(f"🔐 Redirect URI: {config.redirect_uri}")
                logger.info(f"🔐 Account type: {account_type}")
                
                # Intercambiar código por tokens
                response = await client.post(
                    token_url,
                    data=data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=30.0
                )
                
                logger.info(f"🔐 Response status: {response.status_code}")
                response.raise_for_status()
                token_data = response.json()
                
                logger.info(f"🔐 Tokens obtenidos exitosamente")
                logger.info(f"🔐 Access token presente: {bool(token_data.get('access_token'))}")
                logger.info(f"🔐 Refresh token presente: {bool(token_data.get('refresh_token'))}")
                logger.info(f"🔐 Expires in: {token_data.get('expires_in', 'N/A')} segundos")
                
                # Obtener información del usuario desde Google
                logger.info(f"🔐 OAuth - Intercambiando código por tokens exitoso para {account_type}")
                logger.info(f"🔐 Token recibido, obteniendo información del usuario...")
                
                user_info = await get_google_user_info(token_data.get("access_token"))
                logger.info(f"🔐 User info obtenido: {user_info}")
                
                # Determinar account_id según el tipo de cuenta
                logger.info(f"🔐 Determinando account_id para tipo: {account_type}")
                
                # Para Google Ads, obtener información adicional (customer_id e is_mcc)
                ads_info = None
                if account_type == "ads":
                    logger.info(f"🔐 Obteniendo información adicional de Google Ads...")
                    ads_info = await get_google_ads_customer_id(
                        token_data.get("access_token"), 
                        config,
                        token_data.get("refresh_token")  # Pasar refresh_token también
                    )
                    if ads_info and isinstance(ads_info, dict):
                        logger.info(f"🔐 Información de Google Ads obtenida: {ads_info}")
                
                account_id = await get_account_id_for_type(
                    account_type, 
                    token_data.get("access_token"), 
                    user_info,
                    config
                )
                logger.info(f"🔐 Account ID determinado: {account_id}")
                
                # Si tenemos información de Ads, usar el customer_id real
                if ads_info and isinstance(ads_info, dict) and ads_info.get("customer_id"):
                    account_id = ads_info.get("customer_id")
                    logger.info(f"🔐 Usando customer_id de Google Ads: {account_id}")
                
                account_name = user_info.get("email", "Google Account") if user_info else "Google Account"
                # Si tenemos información de Ads, usar el nombre descriptivo
                if ads_info and isinstance(ads_info, dict) and ads_info.get("descriptive_name"):
                    account_name = ads_info.get("descriptive_name")
                    logger.info(f"🔐 Usando nombre descriptivo de Google Ads: {account_name}")
                
                result = {
                    "access_token": token_data.get("access_token"),
                    "refresh_token": token_data.get("refresh_token"),
                    "expires_in": token_data.get("expires_in", 3600),
                    "token_type": token_data.get("token_type", "Bearer"),
                    "account_id": account_id,
                    "account_name": account_name
                }
                
                # Agregar información adicional de Ads si está disponible
                if ads_info and isinstance(ads_info, dict):
                    result["ads_info"] = ads_info
                
                logger.info(f"🔐 ========== Resultado final OAuth ==========")
                logger.info(f"🔐 Account ID: {account_id}")
                logger.info(f"🔐 Account Name: {account_name}")
                logger.info(f"🔐 ===========================================")
                
                return result
            except httpx.HTTPStatusError as e:
                logger.error(f"❌ ========== Error HTTP en OAuth ==========")
                logger.error(f"❌ Status code: {e.response.status_code if e.response else 'N/A'}")
                logger.error(f"❌ URL: {token_url}")
                
                error_detail = {}
                try:
                    error_detail = e.response.json() if e.response else {}
                    logger.error(f"❌ Error detail: {error_detail}")
                except:
                    error_detail = {"error": str(e)}
                    logger.error(f"❌ Error (no JSON): {str(e)}")
                
                error_message = error_detail.get("error_description") or error_detail.get("error") or str(e)
                logger.error(f"❌ Error message final: {error_message}")
                logger.error(f"❌ ===========================================")
                
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error al intercambiar código por tokens: {error_message}"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error inesperado al obtener tokens: {str(e)}"
                )
    
    elif platform.lower() == "meta":
        # TODO: Implementar para Meta
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Meta OAuth aún no está implementado"
        )
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Plataforma {platform} no soportada"
        )


async def _get_google_user_info_DEPRECATED(access_token: str) -> dict:
    """Obtiene información del usuario desde Google"""
    
    logger.info(f"🔍 _get_google_user_info - Iniciando obtención de user info")
    logger.info(f"🔍 Access token presente: {bool(access_token)}")
    
    try:
        async with httpx.AsyncClient() as client:
            logger.info(f"🔍 Haciendo request a Google OAuth2 userinfo API...")
            response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0
            )
            
            logger.info(f"🔍 Response status: {response.status_code}")
            response.raise_for_status()
            user_info = response.json()
            
            logger.info(f"✅ User info obtenido exitosamente: {user_info}")
            logger.info(f"🔍 Email en user_data: {user_info.get('email', 'NO EMAIL')}")
            
            return user_info
    except Exception as e:
        # Si falla, retornar dict vacío (no es crítico)
        logger.warning(f"No se pudo obtener información del usuario de Google: {str(e)}")
        return {}


async def _get_account_id_for_type_DEPRECATED(
    account_type: str, 
    access_token: str, 
    user_info: dict,
    config: OAuthConfig
) -> str:
    """
    Obtiene el ID de cuenta específico según el tipo de cuenta
    Para Analytics, intenta obtener el property_id
    Para Search Console, el site_url
    Para Ads, el customer_id
    Por ahora usa el email como identificador base
    """
    logger.info(f"🔍 ========== _get_account_id_for_type ==========")
    logger.info(f"🔍 account_type: {account_type}")
    logger.info(f"🔍 access_token presente: {bool(access_token)}")
    logger.info(f"🔍 user_info recibido: {user_info}")
    logger.info(f"🔍 config platform: {config.platform if config else 'None'}")
    
    user_email = user_info.get("email", "unknown")
    logger.info(f"🔍 user_email extraído: {user_email}")
    
    if user_email == "unknown":
        logger.warning(f"⚠️ user_email es 'unknown' - esto puede causar problemas")
        logger.warning(f"⚠️ user_info completo: {user_info}")
    
    if account_type == "analytics":
        logger.info(f"🔍 Procesando tipo: analytics")
        # Intentar obtener el primer property_id disponible
        try:
            logger.info(f"🔍 Intentando obtener property_id de Analytics...")
            property_id = await get_first_analytics_property(access_token, config)
            if property_id:
                logger.info(f"✅ Property ID obtenido: {property_id}")
                return f"{user_email}_analytics_{property_id}"
            else:
                logger.warning(f"⚠️ No se obtuvo property_id")
        except Exception as e:
            logger.warning(f"⚠️ No se pudo obtener property_id de Analytics: {str(e)}")
            logger.exception(e)
        logger.info(f"📝 Usando fallback para analytics: {user_email}_analytics")
        return f"{user_email}_analytics"
    
    elif account_type == "search_console":
        logger.info(f"🔍 Procesando tipo: search_console")
        # Intentar obtener los sitios de Search Console
        try:
            logger.info(f"🔍 Intentando obtener sitios de Search Console...")
            sites = await get_search_console_sites(access_token)
            logger.info(f"🔍 Sitios obtenidos: {len(sites) if sites else 0}")
            
            if sites and len(sites) > 0:
                # Usar el primer sitio como account_id
                first_site = sites[0].get('siteUrl', '')
                logger.info(f"🔍 Primer sitio: {first_site}")
                if first_site:
                    logger.info(f"✅ Usando sitio como account_id: {first_site}")
                    return first_site
            else:
                logger.warning(f"⚠️ No se encontraron sitios")
        
        except Exception as e:
            logger.warning(f"⚠️ No se pudo obtener sitios de Search Console: {str(e)}")
            logger.exception(e)
        
        # Si no se encontraron sitios, usar fallback (será validado en el callback)
        logger.info(f"📝 Usando fallback para search_console: unknown_search_console")
        return f"unknown_search_console"
    
    elif account_type == "ads":
        # Intentar obtener el customer_id de Google Ads
        logger.info(f"🔍 Intentando obtener customer_id de Google Ads para: {user_email}")
        try:
            ads_info = await _get_google_ads_customer_id(access_token, config)
            if ads_info and isinstance(ads_info, dict) and ads_info.get("customer_id"):
                customer_id = ads_info.get("customer_id")
                logger.info(f"✅ Customer ID obtenido exitosamente: {customer_id}")
                # Guardar información adicional en el contexto para usarla después
                # La información de MCC se guardará en extra_data en el callback
                return customer_id
            else:
                logger.warning(f"⚠️ No se pudo obtener customer_id, usando fallback con email")
        except Exception as e:
            logger.error(f"❌ Error al obtener customer_id de Google Ads: {str(e)}")
            logger.exception(e)  # Log completo del stack trace
        # Fallback: usar email si no se puede obtener customer_id
        logger.info(f"📝 Usando fallback: {user_email}_ads")
        return f"{user_email}_ads"
    
    elif account_type == "gbp":
        # Google Business Profile
        return f"{user_email}_gbp"
    
    else:
        return f"{user_email}_{account_type}"


async def _get_first_analytics_property_DEPRECATED(access_token: str, config: OAuthConfig) -> str:
    """
    Obtiene el primer property_id de Analytics disponible
    Usa la Admin API de Google Analytics
    """
    try:
        async with httpx.AsyncClient() as client:
            # Listar accounts
            accounts_url = "https://analyticsadmin.googleapis.com/v1beta/accounts"
            response = await client.get(
                accounts_url,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0
            )
            
            if response.status_code == 200:
                accounts_data = response.json()
                accounts = accounts_data.get("accounts", [])
                
                if accounts:
                    account_name = accounts[0].get("name")
                    # Listar properties del primer account
                    properties_url = f"https://analyticsadmin.googleapis.com/v1beta/{account_name}/properties"
                    props_response = await client.get(
                        properties_url,
                        headers={"Authorization": f"Bearer {access_token}"},
                        timeout=10.0
                    )
                    
                    if props_response.status_code == 200:
                        properties_data = props_response.json()
                        properties = properties_data.get("properties", [])
                        
                        if properties:
                            # Extraer el property_id del nombre (formato: properties/123456789)
                            property_name = properties[0].get("name", "")
                            if "/" in property_name:
                                return property_name.split("/")[-1]
                            return property_name
    except Exception as e:
        logger.debug(f"Error al obtener property_id de Analytics: {str(e)}")
    
    return None


async def _get_search_console_sites_DEPRECATED(access_token: str) -> list:
    """
    Obtiene la lista de sitios de Google Search Console
    Usa la Search Console API
    """
    try:
        async with httpx.AsyncClient() as client:
            sites_url = "https://www.googleapis.com/webmasters/v3/sites"
            response = await client.get(
                sites_url,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0
            )
            
            if response.status_code == 200:
                sites_data = response.json()
                sites = sites_data.get("siteEntry", [])
                return sites
            else:
                logger.warning(f"Error al obtener sitios de Search Console. Status: {response.status_code}")
                return []
    except Exception as e:
        logger.warning(f"Error al obtener sitios de Search Console: {str(e)}")
        return []


# Importar funciones de Google desde el módulo organizado
from app.api.oauth.google import (
    get_google_ads_customer_id,
    get_google_user_info,
    get_account_id_for_type,
    get_first_analytics_property,
    get_search_console_sites
)

# Mantener alias para compatibilidad
_get_google_ads_customer_id = get_google_ads_customer_id
_get_google_user_info = get_google_user_info
_get_account_id_for_type = get_account_id_for_type
_get_first_analytics_property = get_first_analytics_property
_get_search_console_sites = get_search_console_sites

async def _get_google_ads_customer_id_OLD(access_token: str, config: OAuthConfig, refresh_token: Optional[str] = None) -> Optional[dict]:
    """
    Obtiene el customer_id de Google Ads y valida si es MCC
    Retorna un dict con customer_id e is_mcc
    Usa list_accessible_customers para obtener el customer_id inicial
    """
    
    logger.info(f"🔍 _get_google_ads_customer_id - Iniciando obtención de customer_id")
    logger.info(f"🔍 Access token presente: {bool(access_token)}")
    logger.info(f"🔍 Refresh token presente: {bool(refresh_token)}")
    logger.info(f"🔍 Config OAuth presente: {bool(config)}")
    
    # Verificar que tenemos developer_token
    developer_token = config.developer_token if hasattr(config, 'developer_token') and config.developer_token else None
    
    if not developer_token:
        logger.warning(f"⚠️ Developer token no disponible en configuración OAuth")
        logger.warning(f"⚠️ Platform: {config.platform if config else 'None'}")
        logger.warning(f"⚠️ Config ID: {config.id if config else 'None'}")
        return None
    
    logger.info(f"🔍 Developer token presente: {bool(developer_token)}")
    logger.info(f"🔍 Developer token (primeros 10 chars): {developer_token[:10] if developer_token else 'None'}...")
    
    try:
        # Importar GoogleAdsClient
        from google.ads.googleads.client import GoogleAdsClient
        
        # Configurar Google Ads Client
        # Google Ads Client REQUIERE refresh_token para OAuth2 flow
        if not refresh_token:
            logger.error(f"❌ Refresh token es requerido para Google Ads API")
            raise ValueError("Refresh token es requerido para Google Ads API. El flujo OAuth debe incluir refresh_token.")
        
        ads_config = {
            "developer_token": developer_token,
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "refresh_token": refresh_token,  # REQUERIDO para OAuth2
            "use_proto_plus": True
        }
        
        logger.info(f"🔍 Construyendo cliente de Google Ads...")
        logger.info(f"🔍 Config contiene refresh_token: {'refresh_token' in ads_config}")
        client = GoogleAdsClient.load_from_dict(ads_config)
        
        logger.info(f"🔍 Cliente de Google Ads construido exitosamente")
        
        # Usar CustomerService para listar cuentas accesibles
        # El método list_accessible_customers no requiere customer_id
        try:
            customer_service = client.get_service("CustomerService")
            
            logger.info(f"🔍 Obteniendo cuentas accesibles...")
            # Usar el método list_accessible_customers
            accessible_customers = customer_service.list_accessible_customers()
            
            if not accessible_customers or not accessible_customers.resource_names:
                logger.warning(f"⚠️ No se encontraron cuentas accesibles")
                logger.warning(f"⚠️ accessible_customers es None: {accessible_customers is None}")
                if accessible_customers:
                    logger.warning(f"⚠️ resource_names es None: {accessible_customers.resource_names is None if hasattr(accessible_customers, 'resource_names') else 'No tiene resource_names'}")
                return None
            
            total_customers = len(accessible_customers.resource_names) if accessible_customers.resource_names else 0
            logger.info(f"🔍 Total de cuentas accesibles encontradas: {total_customers}")
            
            # Obtener el primer customer_id accesible
            first_customer_resource = accessible_customers.resource_names[0]
            logger.info(f"🔍 Primera cuenta accesible (resource): {first_customer_resource}")
            
            # El formato es "customers/1234567890", extraer el ID
            customer_id_raw = first_customer_resource.split("/")[-1]
            logger.info(f"🔍 Customer ID raw (sin formato): {customer_id_raw}")
            
            # Formatear customer_id con guiones (ej: 123-456-7890)
            customer_id = f"{customer_id_raw[:-10]}-{customer_id_raw[-10:-7]}-{customer_id_raw[-7:]}"
            
            logger.info(f"🔍 Customer ID formateado: {customer_id}")
            
            # Ahora obtener información detallada para saber si es MCC
            # Hacer query para obtener información del customer
            query = """
                SELECT
                    customer.id,
                    customer.descriptive_name,
                    customer.manager
                FROM customer
            """
            
            logger.info(f"🔍 Obteniendo información del customer {customer_id}...")
            response = customer_service.search(customer_id=customer_id, query=query)
            
            is_mcc = False
            descriptive_name = None
            
            for row in response:
                is_mcc = row.customer.manager if hasattr(row.customer, 'manager') else False
                descriptive_name = row.customer.descriptive_name if hasattr(row.customer, 'descriptive_name') else None
                break  # Solo necesitamos el primer resultado
            
            logger.info(f"✅ ========== Información de Google Ads obtenida ==========")
            logger.info(f"✅ Customer ID: {customer_id}")
            logger.info(f"✅ Es MCC: {is_mcc}")
            logger.info(f"✅ Nombre descriptivo: {descriptive_name}")
            logger.info(f"✅ =========================================================")
            
            result = {
                "customer_id": customer_id,
                "is_mcc": is_mcc,
                "descriptive_name": descriptive_name or f"Google Ads Account {customer_id}"
            }
            
            logger.info(f"🔍 Retornando resultado: {result}")
            return result
            
        except Exception as e:
            logger.warning(f"⚠️ Error al obtener información del customer: {str(e)}")
            logger.exception(e)
            # Si falla, al menos retornar el customer_id obtenido si lo tenemos
            if 'customer_id' in locals():
                return {
                    "customer_id": customer_id,
                    "is_mcc": False,  # No sabemos si es MCC
                    "descriptive_name": None
                }
            return None
        
    except ImportError as e:
        logger.error(f"❌ Error al importar librerías de Google Ads: {str(e)}")
        logger.error(f"❌ Asegúrate de que google-ads esté instalado")
        return None
    except Exception as e:
        logger.error(f"❌ Error al obtener customer_id de Google Ads: {str(e)}")
        logger.exception(e)
        return None

