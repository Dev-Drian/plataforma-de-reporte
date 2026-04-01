"""
Funciones específicas para Meta (Facebook) Ads
"""
from typing import List, Dict
import logging
import httpx
from app.models import OAuthConfig

logger = logging.getLogger(__name__)


async def get_meta_ads_accounts(access_token: str, config: OAuthConfig) -> List[Dict]:
    """
    Obtiene las cuentas de anuncios de Meta (Facebook Ads) accesibles
    
    Returns:
        Lista de cuentas con formato:
        [
            {
                "account_id": "act_123456789",
                "account_name": "Mi Cuenta de Anuncios",
                "account_status": 1,  # 1 = ACTIVE, 2 = DISABLED, etc.
                "business_id": "123456789" (opcional)
            }
        ]
    """
    try:
        logger.info(f"🔍 Obteniendo cuentas de Meta Ads...")
        
        async with httpx.AsyncClient() as client:
            # Primero obtenemos el User ID
            me_response = await client.get(
                "https://graph.facebook.com/v18.0/me",
                params={
                    "access_token": access_token
                },
                timeout=10.0
            )
            me_response.raise_for_status()
            user_data = me_response.json()
            user_id = user_data.get("id")
            
            logger.info(f"🔍 User ID: {user_id}")
            
            if not user_id:
                raise ValueError("No se pudo obtener el User ID de Facebook")
            
            # Obtener las cuentas de anuncios del usuario
            # Endpoint: GET /{user-id}/adaccounts
            response = await client.get(
                f"https://graph.facebook.com/v18.0/{user_id}/adaccounts",
                params={
                    "fields": "id,name,account_status,business",
                    "access_token": access_token,
                    "limit": 100  # Máximo por página
                },
                timeout=30.0
            )
            
            logger.info(f"🔍 Response status: {response.status_code}")
            
            response.raise_for_status()
            accounts_data = response.json()
            
            accounts = accounts_data.get("data", [])
            logger.info(f"🔍 Total de cuentas encontradas: {len(accounts)}")
            
            if not accounts:
                logger.warning(f"⚠️ No se encontraron cuentas de Meta Ads")
                return []
            
            # Formatear las cuentas
            formatted_accounts = []
            for account in accounts:
                account_id = account.get("id")  # Formato: act_123456789
                account_name = account.get("name", "Unnamed Account")
                account_status = account.get("account_status", 1)
                business = account.get("business", {})
                business_id = business.get("id") if business else None
                
                logger.info(f"📊 Cuenta: {account_name} ({account_id})")
                logger.info(f"   Status: {account_status}")
                if business_id:
                    logger.info(f"   Business ID: {business_id}")
                
                formatted_accounts.append({
                    "account_id": account_id,
                    "account_name": account_name,
                    "account_status": account_status,
                    "business_id": business_id
                })
            
            logger.info(f"✅ Total de {len(formatted_accounts)} cuentas de Meta Ads formateadas")
            return formatted_accounts
            
    except httpx.HTTPStatusError as e:
        error_text = e.response.text if e.response else 'N/A'
        error_json = {}
        try:
            if e.response:
                error_json = e.response.json()
        except:
            pass
        
        logger.error(f"❌ ========== Error HTTP al obtener cuentas de Meta Ads ==========")
        logger.error(f"❌ Status code: {e.response.status_code if e.response else 'N/A'}")
        logger.error(f"❌ Response text: {error_text}")
        logger.error(f"❌ Response JSON: {error_json}")
        logger.error(f"❌ =============================================================")
        
        # Extraer mensaje de error de Facebook
        error_detail = error_json.get("error", {}) if error_json else {}
        error_message = error_detail.get("message", error_text) if error_detail else error_text
        error_code = error_detail.get("code", "") if error_detail else ""
        
        if e.response and e.response.status_code in [401, 403]:
            error_msg = (
                f"No se pudieron obtener las cuentas de Meta Ads. "
                f"El token no tiene los permisos necesarios. "
                f"Verifica que los scopes incluyan 'ads_read' o 'ads_management'. "
                f"Error {error_code}: {error_message}"
            )
            logger.error(f"❌ {error_msg}")
            raise ValueError(error_msg)
        
        raise Exception(f"Error al obtener cuentas de Meta Ads: {error_code} - {error_message}")
        
    except Exception as e:
        logger.error(f"❌ Error al obtener cuentas de Meta Ads: {str(e)}")
        logger.exception(e)
        raise
