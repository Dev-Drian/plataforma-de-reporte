from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://app:app@localhost:3306/marketing_seo"
    REDIS_URL: str = "redis://localhost:6379"
    JWT_SECRET: str = "your-secret-key-change-in-production"
    FRONTEND_URL: str = "http://localhost:3000"  # URL base del frontend para callbacks OAuth
    API_GATEWAY_URL: Optional[str] = None
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    META_ACCESS_TOKEN: Optional[str] = None
    META_APP_ID: Optional[str] = None
    META_APP_SECRET: Optional[str] = None
    LINKEDIN_CLIENT_ID: Optional[str] = None
    LINKEDIN_CLIENT_SECRET: Optional[str] = None
    TIKTOK_CLIENT_ID: Optional[str] = None
    TIKTOK_CLIENT_SECRET: Optional[str] = None
    
    # LinkedIn OAuth Configuration
    LINKEDIN_TOKEN_TTL: int = 5184000  # 2 months in seconds
    LINKEDIN_SCOPES: str = "openid profile email"
    LINKEDIN_API_VERSION: str = "202401"  # LinkedIn API version

    # Limopress proxy (Laravel hace proxy con token Sanctum; Monitor confía en este secret)
    LIMOPRESS_PROXY_SECRET: str = ""
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

