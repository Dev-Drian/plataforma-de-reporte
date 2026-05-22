"""
Funciones específicas de Google Analytics para OAuth
"""
from typing import Optional, List
import logging
import httpx
from app.models import OAuthConfig

logger = logging.getLogger(__name__)


async def get_all_analytics_properties(access_token: str) -> List[dict]:
    """
    Lista todas las propiedades de Google Analytics (GA4) accesibles.
    Devuelve lista de { "property_id", "property_name", "account_name" }.
    """
    result = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0,
            )
            if response.status_code != 200:
                if response.status_code == 403:
                    raise ValueError("Sin permisos para Google Analytics.")
                return []
            data = response.json()
            for acc in data.get("accountSummaries", []):
                account_name = acc.get("name", "").replace("accountSummaries/", "") or "Cuenta"
                for prop in acc.get("propertySummaries", []):
                    prop_name = prop.get("property", "")
                    if prop_name.startswith("properties/"):
                        property_id = prop_name.split("/")[-1]
                        display = prop.get("displayName") or f"Propiedad {property_id}"
                        result.append({
                            "property_id": property_id,
                            "property_name": display,
                            "account_name": account_name,
                        })
            return result
    except ValueError:
        raise
    except Exception as e:
        logger.warning(f"Error al listar propiedades Analytics: {e}")
        return []


async def get_first_analytics_property(access_token: str, config: OAuthConfig) -> Optional[str]:
    """
    Obtiene la primera propiedad de Google Analytics disponible
    """
    try:
        async with httpx.AsyncClient() as client:
            # Primero obtener las cuentas
            accounts_response = await client.get(
                "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0
            )
            
            logger.info(f"🔍 Analytics API Response status: {accounts_response.status_code}")
            
            if accounts_response.status_code == 200:
                accounts_data = accounts_response.json()
                account_summaries = accounts_data.get("accountSummaries", [])
                
                logger.info(f"🔍 Account summaries encontrados: {len(account_summaries)}")
                
                # Obtener la primera propiedad de la primera cuenta
                for account_summary in account_summaries:
                    properties = account_summary.get("propertySummaries", [])
                    if properties and len(properties) > 0:
                        property_name = properties[0].get("property", "")
                        # Extraer el ID de la propiedad del nombre (formato: properties/123456789)
                        if property_name.startswith("properties/"):
                            property_id = property_name.split("/")[-1]
                            logger.info(f"✅ Property ID obtenido: {property_id}")
                            return property_id
                
            elif accounts_response.status_code == 403:
                error_text = accounts_response.text
                error_json = {}
                try:
                    error_json = accounts_response.json()
                except:
                    pass
                
                logger.error(f"❌ ========== Error 403 Forbidden al obtener propiedades de Analytics ==========")
                logger.error(f"❌ Response status: {accounts_response.status_code}")
                logger.error(f"❌ Response headers: {dict(accounts_response.headers)}")
                logger.error(f"❌ Response text: {error_text}")
                logger.error(f"❌ Response JSON: {error_json}")
                logger.error(f"❌ =============================================================")
                
                error_detail = error_json.get("error", {})
                error_message = error_detail.get("message", error_text) if error_detail else error_text
                
                error_msg = (
                    f"No tienes permisos para acceder a Google Analytics. "
                    f"Asegúrate de que los scopes incluyan 'https://www.googleapis.com/auth/analytics.readonly' "
                    f"y que la cuenta tenga acceso a Analytics. "
                    f"Error de Google: {error_message}"
                )
                raise ValueError(error_msg)
            else:
                error_text = accounts_response.text
                error_json = {}
                try:
                    error_json = accounts_response.json()
                except:
                    pass
                
                logger.error(f"❌ ========== Error {accounts_response.status_code} al obtener propiedades de Analytics ==========")
                logger.error(f"❌ Response status: {accounts_response.status_code}")
                logger.error(f"❌ Response headers: {dict(accounts_response.headers)}")
                logger.error(f"❌ Response text: {error_text}")
                logger.error(f"❌ Response JSON: {error_json}")
                logger.error(f"❌ =============================================================")
                
                error_detail = error_json.get("error", {}) if error_json else {}
                error_message = error_detail.get("message", error_text) if error_detail else error_text
                
                raise Exception(f"Error al obtener propiedades de Analytics: {accounts_response.status_code} - {error_message}")
                
            return None
            
    except ValueError:
        # Re-lanzar errores de validación
        raise
    except Exception as e:
        logger.error(f"❌ Error al obtener propiedad de Analytics: {str(e)}")
        logger.exception(e)
        raise Exception(f"Error al obtener propiedad de Analytics: {str(e)}")

