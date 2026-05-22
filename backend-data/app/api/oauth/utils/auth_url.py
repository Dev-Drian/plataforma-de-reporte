"""
Utilidades para construir URLs de autorización OAuth
"""
from fastapi import HTTPException, status
from app.models import OAuthConfig
from app.core.config import settings
from app.api.oauth.utils.redirect_uri import resolve_oauth_redirect_uri
import json
import logging
from urllib.parse import urlencode

logger = logging.getLogger(__name__)


def build_auth_url(platform: str, config: OAuthConfig, state: str, account_type: str) -> str:
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
            # Determinar scopes por defecto según account_type
            # Siempre incluir openid y email para obtener información del usuario
            default_scopes = ["openid", "email"]
            
            if not scopes:
                # Agregar scopes específicos según el tipo de cuenta
                if account_type == "all":
                    # Un solo "Conectar con Google" para Ads, Analytics, Search Console y Business Profile
                    default_scopes.extend([
                        "https://www.googleapis.com/auth/adwords",
                        "https://www.googleapis.com/auth/analytics.readonly",
                        "https://www.googleapis.com/auth/webmasters.readonly",
                        "https://www.googleapis.com/auth/business.manage",
                    ])
                    logger.info(
                        f"🔐 Usando scopes de Google (all): Ads + Analytics + Search Console + Business Profile"
                    )
                elif account_type == "ads":
                    default_scopes.append("https://www.googleapis.com/auth/adwords")
                    logger.info(f"🔐 Usando scopes de Google Ads por defecto")
                elif account_type == "analytics":
                    default_scopes.append("https://www.googleapis.com/auth/analytics.readonly")
                    logger.info(f"🔐 Usando scopes de Google Analytics por defecto")
                elif account_type == "search_console":
                    default_scopes.append("https://www.googleapis.com/auth/webmasters.readonly")
                    logger.info(f"🔐 Usando scopes de Search Console por defecto")
                elif account_type == "gbp":
                    default_scopes.append("https://www.googleapis.com/auth/business.manage")
                    logger.info(f"🔐 Usando scopes de Google Business Profile por defecto")
                else:
                    # Por defecto incluir todos los scopes comunes
                    default_scopes.extend([
                        "https://www.googleapis.com/auth/webmasters.readonly",
                        "https://www.googleapis.com/auth/analytics.readonly"
                    ])
                    logger.info(f"🔐 Usando scopes por defecto para tipo desconocido: {account_type}")
                
                scope_string = " ".join(default_scopes)
            else:
                # Si hay scopes configurados, asegurarse de incluir openid y email
                scope_list = scopes if isinstance(scopes, list) else [scopes]
                if "openid" not in scope_list:
                    scope_list.insert(0, "openid")
                if "email" not in scope_list:
                    scope_list.insert(1, "email")
                # Flujo "all": el Monitor necesita Business Profile además de lo configurado en BD
                if account_type == "all":
                    gbp_scope = "https://www.googleapis.com/auth/business.manage"
                    if gbp_scope not in scope_list:
                        scope_list.append(gbp_scope)
                        logger.info(f"🔐 Scope Business Profile añadido al flujo Google 'all'")
                scope_string = " ".join(scope_list)
            
            logger.info(f"🔐 Scopes finales: {scope_string}")
            redirect_uri = resolve_oauth_redirect_uri(config, "google")
            
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
            redirect_uri = resolve_oauth_redirect_uri(config, "meta")
            
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
        
        elif platform.lower() == "linkedin":
            base_url = "https://www.linkedin.com/oauth/v2/authorization"
            
            # Determinar scopes por defecto según account_type
            # LinkedIn requiere autorización especial para r_ads, así que por ahora solo usamos scopes básicos
            default_scopes = ["openid", "profile", "email"]
            
            if not scopes:
                # Nota: r_ads y r_ads_reporting requieren autorización especial de LinkedIn
                # Por ahora solo usar scopes básicos
                logger.info(f"🔐 Usando scopes por defecto para LinkedIn: {default_scopes}")
                scope_string = " ".join(default_scopes)
            else:
                # Si hay scopes configurados, usarlos
                scope_list = scopes if isinstance(scopes, list) else [scopes]
                # Filtrar solo scopes válidos (sin r_ads, r_ads_reporting)
                valid_scopes = [s for s in scope_list if s not in ["r_ads", "r_ads_reporting"]]
                if not valid_scopes:
                    valid_scopes = default_scopes
                scope_string = " ".join(valid_scopes)
            
            logger.info(f"🔐 Scopes finales: {scope_string}")
            redirect_uri = resolve_oauth_redirect_uri(config, "linkedin")
            
            logger.info(f"🔐 Base URL: {base_url}")
            logger.info(f"🔐 Scope string: {scope_string}")
            logger.info(f"🔐 Redirect URI: {redirect_uri}")
            logger.info(f"🔐 Client ID presente: {bool(config.client_id)}")
            
            if not config.client_id:
                raise ValueError("client_id es requerido para LinkedIn OAuth")
            
            params = {
                "client_id": config.client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": scope_string,
                "state": state
            }
            
            logger.info(f"🔐 Parámetros preparados: {list(params.keys())}")
            
            # Codificar correctamente los parámetros de la URL
            auth_url = f"{base_url}?{urlencode(params)}"
            logger.info(f"🔐 URL construida exitosamente - Longitud: {len(auth_url)}")
            return auth_url
        
        elif platform.lower() == "tiktok":
            base_url = "https://open-api.tiktok.com/platform/oauth/connect/"
            
            # Determinar scopes por defecto según account_type
            default_scopes = ["user.info.basic"]
            
            if account_type == "ads":
                default_scopes.extend([
                    "ad.account",
                    "ad.report.basic",
                    "ad.report.ad",
                    "ad.report.creative"
                ])
            
            if not scopes:
                logger.info(f"🔐 Usando scopes por defecto para TikTok: {default_scopes}")
                scope_string = ",".join(default_scopes)
            else:
                # Si hay scopes configurados, usarlos (TikTok usa comas)
                scope_list = scopes if isinstance(scopes, list) else [scopes]
                scope_string = ",".join(scope_list)
            
            logger.info(f"🔐 Scopes finales: {scope_string}")
            redirect_uri = resolve_oauth_redirect_uri(config, "tiktok")
            
            logger.info(f"🔐 Base URL: {base_url}")
            logger.info(f"🔐 Scope string: {scope_string}")
            logger.info(f"🔐 Redirect URI: {redirect_uri}")
            logger.info(f"🔐 Client ID presente: {bool(config.client_id)}")
            
            if not config.client_id:
                raise ValueError("client_id es requerido para TikTok OAuth")
            
            # TikTok usa client_key en lugar de client_id
            params = {
                "client_key": config.client_id,
                "scope": scope_string,
                "response_type": "code",
                "redirect_uri": redirect_uri,
                "state": state
            }
            
            logger.info(f"🔐 Parámetros preparados: {list(params.keys())}")
            
            # Codificar correctamente los parámetros de la URL
            auth_url = f"{base_url}?{urlencode(params)}"
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


