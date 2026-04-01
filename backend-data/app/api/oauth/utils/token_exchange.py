"""
Utilidades para intercambio de tokens OAuth
"""
from typing import Optional
from fastapi import HTTPException, status
from app.models import OAuthConfig
from app.core.config import settings
from app.api.oauth.utils.redirect_uri import resolve_oauth_redirect_uri
import httpx
import logging

logger = logging.getLogger(__name__)


async def exchange_code_for_tokens(platform: str, config: OAuthConfig, code: str, account_type: str, selected_customer_id: Optional[str] = None) -> dict:
    """
    Intercambia el authorization code por tokens
    Implementación para Google OAuth 2.0
    """
    # Importar funciones de Google dinámicamente
    from app.api.oauth.google import (
        get_google_user_info,
        get_account_id_for_type,
        get_google_ads_customer_id
    )
    
    if platform.lower() == "google":
        token_url = "https://oauth2.googleapis.com/token"
        
        # Obtener redirect_uri (debe ser EXACTAMENTE el mismo que se usó en auth_url)
        redirect_uri = resolve_oauth_redirect_uri(config, "google")
        
        # Preparar datos para el intercambio de tokens
        data = {
            "code": code,
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "redirect_uri": redirect_uri,  # DEBE ser exactamente el mismo que en auth_url
            "grant_type": "authorization_code"
        }
        
        # Logging detallado de los datos (sin mostrar secrets completos)
        logger.info(f"🔐 ========== Datos del intercambio de tokens ==========")
        logger.info(f"🔐 Code presente: {bool(code)}")
        logger.info(f"🔐 Code length: {len(code) if code else 0}")
        logger.info(f"🔐 Client ID: {config.client_id[:20] if config.client_id else 'N/A'}...")
        logger.info(f"🔐 Client Secret presente: {bool(config.client_secret)}")
        logger.info(f"🔐 Redirect URI: {redirect_uri}")
        logger.info(f"🔐 Grant type: authorization_code")
        logger.info(f"🔐 ===================================================")
        
        async with httpx.AsyncClient() as client:
            try:
                logger.info(f"🔐 OAuth Google - Intercambiando código por tokens...")
                logger.info(f"🔐 Token URL: {token_url}")
                logger.info(f"🔐 Client ID: {config.client_id[:20]}...")  # Solo primeros 20 chars por seguridad
                logger.info(f"🔐 Client ID completo presente: {bool(config.client_id)}")
                logger.info(f"🔐 Client Secret presente: {bool(config.client_secret)}")
                logger.info(f"🔐 Redirect URI: {config.redirect_uri}")
                logger.info(f"🔐 Code presente: {bool(code)}")
                logger.info(f"🔐 Code length: {len(code) if code else 0}")
                logger.info(f"🔐 Account type: {account_type}")
                
                # Validar que todos los parámetros requeridos estén presentes
                if not config.client_id:
                    raise ValueError("client_id es requerido")
                if not config.client_secret:
                    raise ValueError("client_secret es requerido")
                if not code:
                    raise ValueError("code es requerido")
                if not config.redirect_uri:
                    logger.warning(f"⚠️ Redirect URI no configurado, usando default")
                
                # Intercambiar código por tokens
                response = await client.post(
                    token_url,
                    data=data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=30.0
                )
                
                logger.info(f"🔐 Response status: {response.status_code}")
                
                # Si hay error, loggear el detalle ANTES de raise_for_status
                if response.status_code != 200:
                    error_text = response.text
                    error_json = {}
                    try:
                        error_json = response.json()
                    except:
                        pass
                    
                    logger.error(f"❌ ========== Error de Google OAuth (antes de raise) ==========")
                    logger.error(f"❌ Status: {response.status_code}")
                    logger.error(f"❌ Response text: {error_text}")
                    logger.error(f"❌ Response JSON: {error_json}")
                    logger.error(f"❌ Request data (sin secrets): code={'presente' if code else 'faltante'}, redirect_uri={config.redirect_uri}")
                    logger.error(f"❌ =============================================================")
                
                response.raise_for_status()
                token_data = response.json()
                
                # Imprimir la respuesta completa de Google para debugging
                logger.info(f"🔐 ========== RESPUESTA COMPLETA DE GOOGLE ==========")
                logger.info(f"🔐 Response status code: {response.status_code}")
                logger.info(f"🔐 Response headers: {dict(response.headers)}")
                logger.info(f"🔐 Response body (token_data): {token_data}")
                logger.info(f"🔐 Keys en token_data: {list(token_data.keys())}")
                logger.info(f"🔐 ===================================================")
                
                logger.info(f"🔐 Tokens obtenidos exitosamente")
                logger.info(f"🔐 Access token presente: {bool(token_data.get('access_token'))}")
                logger.info(f"🔐 Access token (primeros 20 chars): {token_data.get('access_token', '')[:20] if token_data.get('access_token') else 'N/A'}...")
                logger.info(f"🔐 Refresh token presente: {bool(token_data.get('refresh_token'))}")
                logger.info(f"🔐 Refresh token (primeros 20 chars): {token_data.get('refresh_token', '')[:20] if token_data.get('refresh_token') else 'N/A'}...")
                logger.info(f"🔐 Expires in: {token_data.get('expires_in', 'N/A')} segundos")
                logger.info(f"🔐 Token type: {token_data.get('token_type', 'N/A')}")
                logger.info(f"🔐 Scope: {token_data.get('scope', 'N/A')}")
                
                # Verificar que tenemos refresh_token (crítico para Google Ads)
                refresh_token = token_data.get("refresh_token")
                logger.info(f"🔐 ========== VERIFICACIÓN DE REFRESH TOKEN ==========")
                logger.info(f"🔐 Refresh token presente: {bool(refresh_token)}")
                logger.info(f"🔐 Token data completo: {token_data}")
                logger.info(f"🔐 Token data keys: {list(token_data.keys())}")
                logger.info(f"🔐 Account type: {account_type}")
                logger.info(f"🔐 ===================================================")
                
                if not refresh_token:
                    logger.warning(f"⚠️ ========== ADVERTENCIA: No se obtuvo refresh_token ==========")
                    logger.warning(f"⚠️ Account type: {account_type}")
                    logger.warning(f"⚠️ Token data keys: {list(token_data.keys())}")
                    logger.warning(f"⚠️ Token data completo: {token_data}")
                    logger.warning(f"⚠️ Esto puede suceder si:")
                    logger.warning(f"⚠️ 1. El usuario ya autorizó la app antes y Google no devuelve un nuevo refresh_token")
                    logger.warning(f"⚠️ 2. El parámetro 'prompt=consent' no se usó en la URL de autorización")
                    logger.warning(f"⚠️ 3. El scope no está correctamente configurado")
                    logger.warning(f"⚠️ 4. El access_type no está configurado como 'offline'")
                    logger.warning(f"⚠️ =============================================================")
                    
                    # Para Google Ads, el refresh_token es obligatorio
                    if account_type == "ads":
                        error_msg = (
                            "No se obtuvo refresh_token de Google. Esto es requerido para Google Ads API. "
                            "Por favor, asegúrate de usar 'prompt=consent' en la URL de autorización y "
                            "que el usuario autorice la aplicación nuevamente. Si el problema persiste, "
                            "el usuario debe revocar el acceso de la aplicación en su cuenta de Google y "
                            "autorizarla nuevamente."
                        )
                        logger.error(f"❌ {error_msg}")
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=error_msg
                        )
                
                # Obtener información del usuario desde Google
                logger.info(f"🔐 OAuth - Intercambiando código por tokens exitoso para {account_type}")
                logger.info(f"🔐 Token recibido, obteniendo información del usuario...")
                
                try:
                    user_info = await get_google_user_info(token_data.get("access_token"))
                    logger.info(f"🔐 User info obtenido: {user_info}")
                    
                    # Validar que user_info no esté vacío
                    if not user_info or not user_info.get("email"):
                        error_msg = (
                            "No se pudo obtener información del usuario de Google. "
                            "El token no tiene los permisos necesarios para acceder a la información del perfil. "
                            "Asegúrate de que los scopes incluyan 'openid' y 'email'."
                        )
                        logger.error(f"❌ {error_msg}")
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=error_msg
                        )
                except ValueError as ve:
                    # Error de validación de get_google_user_info
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=str(ve)
                    )
                except Exception as e:
                    error_msg = f"Error al obtener información del usuario: {str(e)}"
                    logger.error(f"❌ {error_msg}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=error_msg
                    )
                
                # Para "all": solo devolver tokens + user_info; el callback procesará Ads, Analytics y Search Console
                if account_type == "all":
                    account_name = user_info.get("email", "Google Account") if user_info else "Google Account"
                    result = {
                        "access_token": token_data.get("access_token"),
                        "refresh_token": token_data.get("refresh_token"),
                        "expires_in": token_data.get("expires_in", 3600),
                        "token_type": token_data.get("token_type", "Bearer"),
                        "account_id": "all",
                        "account_name": account_name
                    }
                    logger.info(f"🔐 OAuth Google 'all' - tokens listos para procesar Ads + Analytics + Search Console en callback")
                    return result
                
                # Determinar account_id según el tipo de cuenta
                logger.info(f"🔐 Determinando account_id para tipo: {account_type}")
                
                # Para Google Ads, obtener información adicional (customer_id e is_mcc)
                ads_info = None
                if account_type == "ads":
                    logger.info(f"🔐 Obteniendo información adicional de Google Ads...")
                    if not refresh_token:
                        logger.error(f"❌ No se puede obtener información de Google Ads sin refresh_token")
                    else:
                        ads_info = await get_google_ads_customer_id(
                            token_data.get("access_token"), 
                            config,
                            refresh_token,
                            selected_customer_id=selected_customer_id
                        )
                        if ads_info and isinstance(ads_info, dict):
                            logger.info(f"🔐 Información de Google Ads obtenida: {ads_info}")
                
                account_id = await get_account_id_for_type(
                    account_type, 
                    token_data.get("access_token"), 
                    user_info,
                    config,
                    refresh_token  # Pasar refresh_token también
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
                error_text = e.response.text if e.response else 'N/A'
                error_json = {}
                try:
                    if e.response:
                        error_json = e.response.json()
                except:
                    pass
                
                logger.error(f"❌ ========== Error HTTP en OAuth ==========")
                logger.error(f"❌ Status code: {e.response.status_code if e.response else 'N/A'}")
                logger.error(f"❌ URL: {token_url}")
                logger.error(f"❌ Response headers: {dict(e.response.headers) if e.response else {}}")
                logger.error(f"❌ Response text: {error_text}")
                logger.error(f"❌ Response JSON: {error_json}")
                
                # Extraer mensaje de error detallado de Google
                error_message = "Error desconocido de Google"
                
                if isinstance(error_json, dict):
                    # Google OAuth devuelve error y error_description
                    error_code = error_json.get("error", "")
                    error_description = error_json.get("error_description", "")
                    
                    if error_code:
                        error_message = f"{error_code}"
                        if error_description:
                            error_message += f": {error_description}"
                    else:
                        error_message = error_description or str(e)
                elif error_text and error_text != 'N/A':
                    error_message = error_text
                else:
                    error_message = str(e)
                
                # Mensajes más amigables según el error de Google
                if "invalid_grant" in error_message.lower():
                    error_message = "El código de autorización es inválido o ya fue usado. Por favor, intenta conectar la cuenta nuevamente."
                elif "redirect_uri_mismatch" in error_message.lower():
                    error_message = f"El redirect_uri no coincide. Verifica que en Google Cloud Console el redirect_uri esté configurado como: {redirect_uri}"
                elif "invalid_client" in error_message.lower():
                    error_message = "Client ID o Client Secret inválidos. Verifica la configuración OAuth en Settings."
                
                logger.error(f"❌ Error message final: {error_message}")
                logger.error(f"❌ ===========================================")
                
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error al intercambiar código por tokens de Google: {error_message}"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error inesperado al obtener tokens: {str(e)}"
                )
    
    elif platform.lower() == "meta":
        # Implementación para Meta (Facebook) OAuth 2.0
        from app.api.oauth.meta import (
            get_meta_user_info,
            get_account_id_for_type,
            get_meta_ads_accounts
        )
        
        token_url = "https://graph.facebook.com/v18.0/oauth/access_token"
        
        # Obtener redirect_uri (debe ser EXACTAMENTE el mismo que se usó en auth_url)
        redirect_uri = resolve_oauth_redirect_uri(config, "meta")
        
        logger.info(f"🔐 ========== Intercambio de tokens Meta ==========")
        logger.info(f"🔐 Code presente: {bool(code)}")
        logger.info(f"🔐 Client ID: {config.client_id[:10] if config.client_id else 'N/A'}...")
        logger.info(f"🔐 Redirect URI: {redirect_uri}")
        logger.info(f"🔐 ===================================================")
        
        async with httpx.AsyncClient() as client:
            try:
                logger.info(f"🔐 OAuth Meta - Intercambiando código por tokens...")
                
                # Validar que todos los parámetros requeridos estén presentes
                if not config.client_id:
                    raise ValueError("client_id es requerido")
                if not config.client_secret:
                    raise ValueError("client_secret es requerido")
                if not code:
                    raise ValueError("code es requerido")
                
                # Intercambiar código por tokens
                # Facebook usa parámetros de query string, no form data
                response = await client.get(
                    token_url,
                    params={
                        "client_id": config.client_id,
                        "redirect_uri": redirect_uri,
                        "client_secret": config.client_secret,
                        "code": code
                    },
                    timeout=30.0
                )
                
                logger.info(f"🔐 Response status: {response.status_code}")
                
                if response.status_code != 200:
                    error_text = response.text
                    error_json = {}
                    try:
                        error_json = response.json()
                    except:
                        pass
                    
                    logger.error(f"❌ ========== Error de Facebook OAuth ==========")
                    logger.error(f"❌ Status: {response.status_code}")
                    logger.error(f"❌ Response text: {error_text}")
                    logger.error(f"❌ Response JSON: {error_json}")
                    logger.error(f"❌ =============================================================")
                
                response.raise_for_status()
                token_data = response.json()
                
                logger.info(f"🔐 ========== RESPUESTA COMPLETA DE FACEBOOK ==========")
                logger.info(f"🔐 Response status code: {response.status_code}")
                logger.info(f"🔐 Keys en token_data: {list(token_data.keys())}")
                logger.info(f"🔐 ===================================================")
                
                access_token = token_data.get("access_token")
                expires_in = token_data.get("expires_in", 3600)
                
                logger.info(f"🔐 Access token presente: {bool(access_token)}")
                logger.info(f"🔐 Expires in: {expires_in} segundos")
                
                if not access_token:
                    raise ValueError("No se obtuvo access_token de Facebook")
                
                # Obtener información del usuario desde Facebook
                logger.info(f"🔐 Obteniendo información del usuario de Facebook...")
                
                try:
                    user_info = await get_meta_user_info(access_token)
                    logger.info(f"🔐 User info obtenido: {user_info}")
                    
                    if not user_info or not user_info.get("id"):
                        error_msg = "No se pudo obtener información del usuario de Facebook"
                        logger.error(f"❌ {error_msg}")
                        raise ValueError(error_msg)
                except ValueError as ve:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=str(ve)
                    )
                except Exception as e:
                    error_msg = f"Error al obtener información del usuario: {str(e)}"
                    logger.error(f"❌ {error_msg}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=error_msg
                    )
                
                # Determinar account_id según el tipo de cuenta
                logger.info(f"🔐 Determinando account_id para tipo: {account_type}")
                
                account_id = await get_account_id_for_type(
                    account_type,
                    access_token,
                    user_info,
                    config
                )
                logger.info(f"🔐 Account ID determinado: {account_id}")
                
                # Para Meta Ads, obtener las cuentas disponibles
                ads_accounts = None
                if account_type == "ads":
                    logger.info(f"🔐 Obteniendo cuentas de Meta Ads...")
                    try:
                        ads_accounts = await get_meta_ads_accounts(access_token, config)
                        logger.info(f"🔐 Total de cuentas de Meta Ads: {len(ads_accounts) if ads_accounts else 0}")
                    except Exception as e:
                        logger.warning(f"⚠️ Error al obtener cuentas de Meta Ads: {str(e)}")
                        # No fallar el flujo completo, solo advertir
                
                account_name = user_info.get("name", user_info.get("email", "Facebook Account"))
                
                result = {
                    "access_token": access_token,
                    "refresh_token": None,  # Facebook no proporciona refresh token en este flujo
                    "expires_in": expires_in,
                    "token_type": "Bearer",
                    "account_id": account_id,
                    "account_name": account_name
                }
                
                # Agregar información de cuentas de Ads si está disponible
                if ads_accounts:
                    result["ads_accounts"] = ads_accounts
                
                logger.info(f"🔐 ========== Resultado final OAuth Meta ==========")
                logger.info(f"🔐 Account ID: {account_id}")
                logger.info(f"🔐 Account Name: {account_name}")
                logger.info(f"🔐 Ads Accounts: {len(ads_accounts) if ads_accounts else 0}")
                logger.info(f"🔐 ===========================================")
                
                return result
                
            except httpx.HTTPStatusError as e:
                error_text = e.response.text if e.response else 'N/A'
                error_json = {}
                try:
                    if e.response:
                        error_json = e.response.json()
                except:
                    pass
                
                logger.error(f"❌ ========== Error HTTP en OAuth Meta ==========")
                logger.error(f"❌ Status code: {e.response.status_code if e.response else 'N/A'}")
                logger.error(f"❌ URL: {token_url}")
                logger.error(f"❌ Response text: {error_text}")
                logger.error(f"❌ Response JSON: {error_json}")
                
                # Extraer mensaje de error de Facebook
                error_message = "Error desconocido de Facebook"
                
                if isinstance(error_json, dict):
                    error_detail = error_json.get("error", {})
                    if isinstance(error_detail, dict):
                        error_code = error_detail.get("code", "")
                        error_msg = error_detail.get("message", "")
                        if error_code:
                            error_message = f"{error_code}: {error_msg}"
                        elif error_msg:
                            error_message = error_msg
                    elif isinstance(error_detail, str):
                        error_message = error_detail
                elif error_text and error_text != 'N/A':
                    error_message = error_text
                else:
                    error_message = str(e)
                
                # Mensajes más amigables según el error de Facebook
                if "invalid" in error_message.lower() and "code" in error_message.lower():
                    error_message = "El código de autorización es inválido o ya fue usado. Por favor, intenta conectar la cuenta nuevamente."
                elif "redirect_uri" in error_message.lower():
                    error_message = f"El redirect_uri no coincide. Verifica que en Facebook App el redirect_uri esté configurado como: {redirect_uri}"
                
                logger.error(f"❌ Error message final: {error_message}")
                logger.error(f"❌ ===========================================")
                
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error al intercambiar código por tokens de Facebook: {error_message}"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error inesperado al obtener tokens de Facebook: {str(e)}"
                )
    
    elif platform.lower() == "tiktok":
        from app.api.oauth.tiktok.oauth_flow import TikTokOAuthFlowManager
        manager = TikTokOAuthFlowManager(
            config.client_id,
            config.client_secret,
            resolve_oauth_redirect_uri(config, "tiktok"),
        )
        try:
            token_data = await manager.exchange_code_for_token(code)
            access_token = token_data.get("data", {}).get("access_token")
            refresh_token = token_data.get("data", {}).get("refresh_token")
            expires_in = token_data.get("data", {}).get("expires_in", 3600)
            open_id = token_data.get("data", {}).get("open_id")
            if not access_token:
                raise ValueError("No se obtuvo access_token de TikTok")
            # TikTok no devuelve info de usuario aquí, se debe hacer otra llamada si se requiere
            result = {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_in": expires_in,
                "token_type": "Bearer",
                "account_id": open_id,
                "account_name": f"TikTok User {open_id}" if open_id else "TikTok Account"
            }
            return result
        except Exception as e:
            logger.error(f"❌ Error en TikTok OAuth: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error inesperado al obtener tokens de TikTok: {str(e)}"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Plataforma {platform} no soportada"
        )



