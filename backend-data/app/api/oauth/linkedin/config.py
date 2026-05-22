"""
Configuración de LinkedIn OAuth 2.0
Define las URLs, scopes y parámetros para autenticación
"""

from typing import List, Dict

# LinkedIn OAuth Endpoints
LINKEDIN_AUTHORIZATION_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_API_BASE_URL = "https://api.linkedin.com/v2"

# OAuth 2.0 Configuration
LINKEDIN_OAUTH_CONFIG = {
    "authorization_url": LINKEDIN_AUTHORIZATION_URL,
    "token_url": LINKEDIN_TOKEN_URL,
    "api_base_url": LINKEDIN_API_BASE_URL,
    "token_time_to_live": 5184000,  # 2 months in seconds
    "token_type": "Bearer",
}

# Default Scopes for LinkedIn OAuth
LINKEDIN_DEFAULT_SCOPES: List[str] = [
    "openid",      # Use your name and photo
    "profile",     # Use your name and photo
    "email"        # Use the primary email address associated with your LinkedIn account
]

# Scopes for LinkedIn Ads API (if needed)
LINKEDIN_ADS_SCOPES: List[str] = [
    "r_ads",           # Read LinkedIn Ads data
    "r_ads_reporting", # Read LinkedIn Ads reporting
]

# Complete Scopes Configuration
LINKEDIN_SCOPES_CONFIG: Dict[str, List[str]] = {
    "default": LINKEDIN_DEFAULT_SCOPES,
    "ads": LINKEDIN_ADS_SCOPES,
    "all": list(set(LINKEDIN_DEFAULT_SCOPES + LINKEDIN_ADS_SCOPES))
}

# Redirect URI (will be configured per environment)
# Format: {BASE_URL}/api/oauth/callback/linkedin
LINKEDIN_REDIRECT_URI_PATH = "/api/oauth/callback/linkedin"

# User Info Endpoints
LINKEDIN_USER_INFO_ENDPOINTS = {
    "me": f"{LINKEDIN_API_BASE_URL}/me",
    "emailAddress": f"{LINKEDIN_API_BASE_URL}/emailAddress?q=members&projection=(elements*(handle~))",
}

# Error Messages
LINKEDIN_ERROR_MESSAGES = {
    "invalid_grant": "Invalid authorization code or refresh token",
    "invalid_request": "Missing required parameters",
    "invalid_client": "Client ID or Client Secret is invalid",
    "invalid_scope": "Requested scope is invalid",
    "unauthorized_client": "Client is not authorized to use this grant type",
    "unsupported_grant_type": "Grant type is not supported",
    "invalid_json": "Invalid JSON in request body",
}
