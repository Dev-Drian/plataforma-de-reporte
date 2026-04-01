"""
Funciones específicas de Google Search Console para OAuth
"""
import logging
import httpx

logger = logging.getLogger(__name__)


async def get_search_console_sites(access_token: str) -> list:
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
                logger.info(f"🔍 Sitios de Search Console obtenidos: {len(sites)}")
                return sites
            else:
                error_text = response.text
                error_json = {}
                try:
                    error_json = response.json()
                except:
                    pass
                
                logger.error(f"❌ ========== Error al obtener sitios de Search Console ==========")
                logger.error(f"❌ Status code: {response.status_code}")
                logger.error(f"❌ Response headers: {dict(response.headers)}")
                logger.error(f"❌ Response text: {error_text}")
                logger.error(f"❌ Response JSON: {error_json}")
                logger.error(f"❌ =============================================================")
                
                error_detail = error_json.get("error", {}) if error_json else {}
                error_message = error_detail.get("message", error_text) if error_detail else error_text
                
                if response.status_code == 403:
                    raise ValueError(
                        f"No tienes permisos para acceder a Google Search Console. "
                        f"Asegúrate de que los scopes incluyan 'https://www.googleapis.com/auth/webmasters.readonly'. "
                        f"Error de Google: {error_message}"
                    )
                else:
                    raise Exception(f"Error al obtener sitios de Search Console: {response.status_code} - {error_message}")
    except Exception as e:
        logger.warning(f"Error al obtener sitios de Search Console: {str(e)}")
        return []

