"""
Funciones comunes de Google para OAuth
"""
from typing import Optional
import logging
import httpx
from app.models import OAuthConfig

logger = logging.getLogger(__name__)


async def get_google_user_info(access_token: str) -> dict:
    """
    Obtiene información del usuario de Google usando el access_token
    """
    try:
        logger.info(f"🔍 Obteniendo user_info de Google...")
        logger.info(f"🔍 Access token presente: {bool(access_token)}")
        logger.info(f"🔍 Access token (primeros 20 chars): {access_token[:20] if access_token else 'N/A'}...")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0
            )
            
            logger.info(f"🔍 Response status: {response.status_code}")
            logger.info(f"🔍 Response headers: {dict(response.headers)}")
            
            response.raise_for_status()
            user_info = response.json()
            
            logger.info(f"🔍 User info obtenido exitosamente: {user_info}")
            logger.info(f"🔍 Email en user_info: {user_info.get('email', 'N/A')}")
            
            return user_info
    except httpx.HTTPStatusError as e:
        error_text = e.response.text if e.response else 'N/A'
        error_json = {}
        try:
            if e.response:
                error_json = e.response.json()
        except:
            pass
        
        logger.error(f"❌ ========== Error HTTP al obtener información del usuario de Google ==========")
        logger.error(f"❌ Status code: {e.response.status_code if e.response else 'N/A'}")
        logger.error(f"❌ Response headers: {dict(e.response.headers) if e.response else {}}")
        logger.error(f"❌ Response text: {error_text}")
        logger.error(f"❌ Response JSON: {error_json}")
        logger.error(f"❌ =============================================================")
        
        # Si es 401 o 403, el token no tiene los permisos necesarios
        if e.response and e.response.status_code in [401, 403]:
            error_detail = error_json.get("error", {}) if error_json else {}
            error_message = error_detail.get("message", error_text) if error_detail else error_text
            
            error_msg = (
                f"No se pudo obtener información del usuario. El token no tiene los permisos necesarios. "
                f"Asegúrate de que los scopes incluyan 'openid' y 'email'. "
                f"Error {e.response.status_code} de Google: {error_message}"
            )
            logger.error(f"❌ {error_msg}")
            raise ValueError(error_msg)
        
        # Para otros errores, lanzar excepción
        error_detail = error_json.get("error", {}) if error_json else {}
        error_message = error_detail.get("message", error_text) if error_detail else error_text
        raise Exception(f"Error al obtener información del usuario: {e.response.status_code if e.response else 'N/A'} - {error_message}")
    except Exception as e:
        logger.error(f"❌ Error al obtener información del usuario de Google: {str(e)}")
        logger.exception(e)
        raise


async def get_account_id_for_type(
    account_type: str, 
    access_token: str, 
    user_info: dict,
    config: OAuthConfig,
    refresh_token: Optional[str] = None,
    ads_info: Optional[dict] = None  # Agregar parámetro para evitar llamada duplicada
) -> str:
    """
    Obtiene el ID de cuenta específico según el tipo de cuenta
    Para Analytics, intenta obtener el property_id
    Para Search Console, el site_url
    Para Ads, el customer_id
    Por ahora usa el email como identificador base
    """
    import logging
    logger = logging.getLogger(__name__)
    
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
            from ..analytics import get_first_analytics_property
            property_id = await get_first_analytics_property(access_token, config)
            if property_id:
                logger.info(f"✅ Property ID obtenido: {property_id}")
                return f"{user_email}_analytics_{property_id}"
            else:
                logger.warning(f"⚠️ No se obtuvo property_id - no hay propiedades disponibles")
                # Retornar unknown para que se valide en el callback
                return f"unknown_analytics"
        except ValueError as ve:
            # Error de validación (permisos, etc.) - re-lanzar
            logger.error(f"❌ Error de validación al obtener property_id: {str(ve)}")
            raise
        except Exception as e:
            logger.error(f"❌ Error al obtener property_id de Analytics: {str(e)}")
            logger.exception(e)
            # Retornar unknown para que se valide en el callback
            return f"unknown_analytics"
    
    elif account_type == "search_console":
        logger.info(f"🔍 Procesando tipo: search_console")
        # Intentar obtener los sitios de Search Console
        try:
            logger.info(f"🔍 Intentando obtener sitios de Search Console...")
            from ..search_console import get_search_console_sites
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
        logger.info(f"🔍 Refresh token presente para get_account_id_for_type: {bool(refresh_token)}")
        try:
            from ..ads import get_google_ads_customer_id
            ads_info = await get_google_ads_customer_id(access_token, config, refresh_token)
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

