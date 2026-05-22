"""
Funciones comunes de Meta (Facebook) para OAuth
"""
from typing import Optional
import logging
import httpx
from app.models import OAuthConfig

logger = logging.getLogger(__name__)


async def get_meta_user_info(access_token: str) -> dict:
    """
    Obtiene información del usuario de Facebook usando el access_token
    """
    try:
        logger.info(f"🔍 Obteniendo user_info de Facebook...")
        logger.info(f"🔍 Access token presente: {bool(access_token)}")
        
        async with httpx.AsyncClient() as client:
            # Facebook Graph API v18.0 - obtener información básica del usuario
            response = await client.get(
                "https://graph.facebook.com/v18.0/me",
                params={
                    "fields": "id,name,email",
                    "access_token": access_token
                },
                timeout=10.0
            )
            
            logger.info(f"🔍 Response status: {response.status_code}")
            
            response.raise_for_status()
            user_info = response.json()
            
            logger.info(f"🔍 User info obtenido exitosamente")
            logger.info(f"🔍 User ID: {user_info.get('id', 'N/A')}")
            logger.info(f"🔍 Email: {user_info.get('email', 'N/A')}")
            
            # Validar que tengamos email
            if not user_info.get("email"):
                logger.warning(f"⚠️ No se obtuvo email del usuario")
                logger.warning(f"⚠️ User info: {user_info}")
            
            return user_info
    except httpx.HTTPStatusError as e:
        error_text = e.response.text if e.response else 'N/A'
        error_json = {}
        try:
            if e.response:
                error_json = e.response.json()
        except:
            pass
        
        logger.error(f"❌ ========== Error HTTP al obtener información del usuario de Facebook ==========")
        logger.error(f"❌ Status code: {e.response.status_code if e.response else 'N/A'}")
        logger.error(f"❌ Response text: {error_text}")
        logger.error(f"❌ Response JSON: {error_json}")
        logger.error(f"❌ =============================================================")
        
        # Si es 401 o 403, el token no tiene los permisos necesarios
        if e.response and e.response.status_code in [401, 403]:
            error_detail = error_json.get("error", {}) if error_json else {}
            error_message = error_detail.get("message", error_text) if error_detail else error_text
            
            error_msg = (
                f"No se pudo obtener información del usuario de Facebook. "
                f"El token no tiene los permisos necesarios. "
                f"Error {e.response.status_code}: {error_message}"
            )
            logger.error(f"❌ {error_msg}")
            raise ValueError(error_msg)
        
        # Para otros errores
        error_detail = error_json.get("error", {}) if error_json else {}
        error_message = error_detail.get("message", error_text) if error_detail else error_text
        raise Exception(f"Error al obtener información del usuario: {e.response.status_code if e.response else 'N/A'} - {error_message}")
    except Exception as e:
        logger.error(f"❌ Error al obtener información del usuario de Facebook: {str(e)}")
        logger.exception(e)
        raise


async def get_account_id_for_type(
    account_type: str,
    access_token: str,
    user_info: dict,
    config: OAuthConfig,
    refresh_token: Optional[str] = None
) -> str:
    """
    Obtiene el ID de cuenta específico según el tipo de cuenta de Meta
    Para ads: devuelve un placeholder que se reemplazará con las cuentas reales
    """
    logger.info(f"🔍 ========== Meta: get_account_id_for_type ==========")
    logger.info(f"🔍 account_type: {account_type}")
    logger.info(f"🔍 user_info: {user_info}")
    
    user_id = user_info.get("id", "unknown")
    user_email = user_info.get("email", user_info.get("name", "unknown"))
    
    logger.info(f"🔍 user_id: {user_id}")
    logger.info(f"🔍 user_email: {user_email}")
    
    if account_type == "ads":
        logger.info(f"🔍 Procesando tipo: ads (Meta)")
        # Para Meta Ads, retornamos un placeholder
        # Las cuentas reales se obtendrán en el callback con get_meta_ads_accounts
        return f"{user_id}_meta_ads"
    else:
        logger.warning(f"⚠️ Tipo de cuenta no soportado para Meta: {account_type}")
        return f"{user_id}_{account_type}"
