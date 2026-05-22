"""
LinkedIn OAuth 2.0 Functions
Maneja autenticación y obtención de tokens para LinkedIn
"""
import httpx
import logging
from typing import Dict, Optional, List
from app.core.config import settings
from urllib.parse import urlencode
import json

logger = logging.getLogger(__name__)

# LinkedIn OAuth URLs
LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USER_INFO_URL = "https://api.linkedin.com/v2/me"


def generate_linkedin_auth_url(
    client_id: str,
    redirect_uri: str,
    scopes: Optional[List[str]] = None,
    state: Optional[str] = None
) -> str:
    """
    Genera la URL de autorización de LinkedIn
    
    Args:
        client_id: LinkedIn Client ID
        redirect_uri: URI de redirección después de autorizar
        scopes: Lista de permisos solicitados (por defecto: openid, profile, email)
        state: Token de seguridad CSRF (opcional)
    
    Returns:
        URL completa para redirigir al usuario a LinkedIn
    """
    if scopes is None:
        scopes = ["openid", "profile", "email"]
    
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": " ".join(scopes),
    }
    
    if state:
        params["state"] = state
    
    auth_url = f"{LINKEDIN_AUTH_URL}?{urlencode(params)}"
    logger.info(f"Generated LinkedIn auth URL with scopes: {scopes}")
    return auth_url


async def exchange_linkedin_code_for_token(
    client_id: str,
    client_secret: str,
    code: str,
    redirect_uri: str
) -> Dict:
    """
    Intercambia el código de autorización por un token de acceso
    
    Args:
        client_id: LinkedIn Client ID
        client_secret: LinkedIn Client Secret
        code: Código de autorización recibido de LinkedIn
        redirect_uri: URI de redirección utilizada en la solicitud inicial
    
    Returns:
        Diccionario con el token de acceso y metadatos
        {
            "access_token": "...",
            "token_type": "Bearer",
            "expires_in": 5184000,
            "scope": "openid profile email"
        }
    """
    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "grant_type": "authorization_code",
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
            }
            
            response = await client.post(
                LINKEDIN_TOKEN_URL,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code != 200:
                error_data = response.json() if response.text else {}
                logger.error(f"LinkedIn token exchange failed: {response.status_code} - {error_data}")
                raise Exception(f"Failed to exchange code for token: {response.status_code}")
            
            token_data = response.json()
            logger.info("Successfully exchanged LinkedIn authorization code for token")
            return token_data
            
    except Exception as e:
        logger.error(f"Error during LinkedIn token exchange: {str(e)}")
        raise


async def get_linkedin_user_info(access_token: str) -> Dict:
    """
    Obtiene información del usuario autenticado de LinkedIn
    
    Args:
        access_token: Token de acceso de LinkedIn
    
    Returns:
        Diccionario con información del usuario
    """
    try:
        async with httpx.AsyncClient() as client:
            # LinkedIn API v2 requiere headers específicos y proyecciones
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
                "X-Restli-Protocol-Version": "2.0.0"  # Header requerido para v2 API
            }
            
            # Usar el endpoint /userinfo que es parte del OpenID Connect standard
            # o usar /me con proyección específica
            userinfo_url = "https://api.linkedin.com/v2/userinfo"
            
            response = await client.get(userinfo_url, headers=headers)
            
            if response.status_code != 200:
                # Si /userinfo falla, intentar con /me con proyección básica
                logger.warning(f"Failed to get user info from /userinfo: {response.status_code}, trying /me")
                me_url = "https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)"
                response = await client.get(me_url, headers=headers)
                
                if response.status_code != 200:
                    error_text = response.text
                    error_json = {}
                    try:
                        error_json = response.json()
                    except:
                        pass
                    
                    logger.error(f"Failed to get LinkedIn user info: {response.status_code}")
                    logger.error(f"Response: {error_text}")
                    logger.error(f"Response JSON: {error_json}")
                    raise Exception(f"Failed to get user info: {response.status_code} - {error_text}")
            
            user_data = response.json()
            logger.info("Successfully retrieved LinkedIn user information")
            return user_data
            
    except Exception as e:
        logger.error(f"Error retrieving LinkedIn user info: {str(e)}")
        raise


async def get_linkedin_access_token(
    client_id: str,
    client_secret: str
) -> Dict:
    """
    Obtiene un token de acceso usando Client Credentials Flow
    (Útil para server-to-server communication)
    
    Args:
        client_id: LinkedIn Client ID
        client_secret: LinkedIn Client Secret
    
    Returns:
        Diccionario con el token de acceso
    """
    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
            }
            
            response = await client.post(
                LINKEDIN_TOKEN_URL,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to get access token: {response.status_code}")
                raise Exception(f"Failed to get access token: {response.status_code}")
            
            token_data = response.json()
            logger.info("Successfully obtained LinkedIn access token via Client Credentials")
            return token_data
            
    except Exception as e:
        logger.error(f"Error obtaining LinkedIn access token: {str(e)}")
        raise
