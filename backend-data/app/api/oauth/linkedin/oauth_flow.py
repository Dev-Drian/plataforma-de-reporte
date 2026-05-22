"""
LinkedIn OAuth Flow Manager
Gestiona el flujo completo de autenticación OAuth 2.0 con LinkedIn
"""

import httpx
import logging
from typing import Dict, Optional, List
from fastapi import APIRouter, Query, HTTPException, Request
from app.api.oauth.linkedin.functions import (
    generate_linkedin_auth_url,
    exchange_linkedin_code_for_token,
    get_linkedin_user_info
)
from app.api.oauth.linkedin.config import (
    LINKEDIN_REDIRECT_URI_PATH,
    LINKEDIN_DEFAULT_SCOPES,
    LINKEDIN_ERROR_MESSAGES
)

logger = logging.getLogger(__name__)


class LinkedInOAuthFlowManager:
    """
    Gestiona el flujo OAuth 2.0 con LinkedIn
    """
    
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        """
        Inicializa el manager de OAuth
        
        Args:
            client_id: LinkedIn Client ID
            client_secret: LinkedIn Client Secret
            redirect_uri: URI de redirección configurada en LinkedIn
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
    
    def get_authorization_url(
        self, 
        scopes: Optional[List[str]] = None,
        state: Optional[str] = None
    ) -> str:
        """
        Genera la URL de autorización para redirigir al usuario a LinkedIn
        
        Args:
            scopes: Lista de permisos solicitados (usa default si no se especifica)
            state: Token de seguridad CSRF
        
        Returns:
            URL para redirigir al usuario
        """
        if scopes is None:
            scopes = LINKEDIN_DEFAULT_SCOPES
        
        logger.info(f"Generating LinkedIn authorization URL with scopes: {scopes}")
        
        return generate_linkedin_auth_url(
            client_id=self.client_id,
            redirect_uri=self.redirect_uri,
            scopes=scopes,
            state=state
        )
    
    async def handle_callback(
        self,
        code: str,
        state: Optional[str] = None
    ) -> Dict:
        """
        Maneja el callback de LinkedIn después de que el usuario autoriza
        
        Args:
            code: Código de autorización de LinkedIn
            state: Token de seguridad CSRF (para validación)
        
        Returns:
            Diccionario con:
            - access_token: Token para acceder a APIs de LinkedIn
            - user_info: Información del usuario autenticado
            - token_expires_in: Tiempo de expiración del token
        
        Raises:
            HTTPException: Si hay error en el flujo OAuth
        """
        try:
            logger.info("Processing LinkedIn OAuth callback")
            
            # Intercambiar código por token
            token_response = await exchange_linkedin_code_for_token(
                client_id=self.client_id,
                client_secret=self.client_secret,
                code=code,
                redirect_uri=self.redirect_uri
            )
            
            access_token = token_response.get("access_token")
            if not access_token:
                logger.error("No access token in LinkedIn response")
                raise Exception("No access token received from LinkedIn")
            
            # Obtener información del usuario
            user_info = await get_linkedin_user_info(access_token)
            
            logger.info(f"LinkedIn OAuth flow completed successfully for user")
            
            return {
                "access_token": access_token,
                "token_type": token_response.get("token_type", "Bearer"),
                "expires_in": token_response.get("expires_in", 5184000),
                "scope": token_response.get("scope"),
                "user_info": user_info
            }
            
        except Exception as e:
            logger.error(f"Error in LinkedIn OAuth callback: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"LinkedIn authentication failed: {str(e)}"
            )
    
    async def refresh_token(self, refresh_token: str) -> Dict:
        """
        Refresca un token de LinkedIn expirado
        
        Args:
            refresh_token: Token de refresco de LinkedIn
        
        Returns:
            Nuevo access token y metadata
        
        Note:
            LinkedIn no proporciona refresh tokens. Los tokens de LinkedIn
            son de larga duración (2 meses por defecto). Para renovar acceso,
            se debe repetir el flujo OAuth completo.
        """
        logger.warning("LinkedIn OAuth does not support refresh tokens. Use new authorization flow.")
        raise HTTPException(
            status_code=400,
            detail="LinkedIn OAuth does not support token refresh. Please re-authorize."
        )
