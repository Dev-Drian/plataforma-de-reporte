"""
TikTok OAuth Flow Manager
Gestiona el flujo completo de autenticación OAuth 2.0 con TikTok
"""

import httpx
import logging
from typing import Dict, Optional, List

TIKTOK_AUTHORIZATION_URL = "https://open-api.tiktok.com/platform/oauth/connect/"
TIKTOK_TOKEN_URL = "https://open-api.tiktok.com/oauth/access_token/"
TIKTOK_API_BASE_URL = "https://open-api.tiktok.com/"
TIKTOK_DEFAULT_SCOPES = [
    "user.info.basic",
    "ad.account",
    "ad.report.basic",
    "ad.report.ad",
    "ad.report.creative"
]

logger = logging.getLogger(__name__)

class TikTokOAuthFlowManager:
    """
    Gestiona el flujo OAuth 2.0 con TikTok
    """
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri

    def get_authorization_url(self, scopes: Optional[List[str]] = None, state: Optional[str] = None) -> str:
        scopes = scopes or TIKTOK_DEFAULT_SCOPES
        scope_str = ",".join(scopes)
        url = (
            f"{TIKTOK_AUTHORIZATION_URL}?client_key={self.client_id}"
            f"&scope={scope_str}"
            f"&response_type=code"
            f"&redirect_uri={self.redirect_uri}"
        )
        if state:
            url += f"&state={state}"
        return url

    async def exchange_code_for_token(self, code: str) -> Dict:
        data = {
            "client_key": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_uri
        }
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.post(TIKTOK_TOKEN_URL, data=data)
            
            if resp.status_code != 200:
                error_text = resp.text
                error_json = {}
                try:
                    error_json = resp.json()
                except:
                    pass
                
                logger.error(f"TikTok token exchange failed: {resp.status_code}")
                logger.error(f"Response: {error_text}")
                logger.error(f"Response JSON: {error_json}")
                raise Exception(f"Failed to exchange code for token: {resp.status_code} - {error_text}")
            
            return resp.json()

    async def refresh_token(self, refresh_token: str) -> Dict:
        data = {
            "client_key": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.post(TIKTOK_TOKEN_URL, data=data)
            
            if resp.status_code != 200:
                error_text = resp.text
                error_json = {}
                try:
                    error_json = resp.json()
                except:
                    pass
                
                logger.error(f"TikTok token refresh failed: {resp.status_code}")
                logger.error(f"Response: {error_text}")
                logger.error(f"Response JSON: {error_json}")
                raise Exception(f"Failed to refresh token: {resp.status_code} - {error_text}")
            
            return resp.json()
