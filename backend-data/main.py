from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.api import google, meta, linkedin, tiktok, seo, analytics, ads, auth, gbp, dashboard, share_links, public
from app.core.config import settings
from app.core.database import get_db
from app.core.auth_middleware import get_current_user
from app.models import User
import logging
import sys

# Configurar logging para ver todos los mensajes
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

# Configurar logger específico para OAuth
oauth_logger = logging.getLogger('app.api.oauth')
oauth_logger.setLevel(logging.INFO)

app = FastAPI(
    title="Marketing & SEO Data API",
    description="API para integración con plataformas externas",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes de autenticación
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Routes de configuración
from app.api import accounts, settings
from app.api.oauth import router as oauth_router
app.include_router(accounts.router, prefix="/accounts", tags=["Accounts"])
app.include_router(settings.router, prefix="/settings", tags=["Settings"])
app.include_router(oauth_router, prefix="/oauth", tags=["OAuth"])

# Routes consolidadas para Gateway
app.include_router(seo.router, prefix="/seo", tags=["SEO"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(ads.router, prefix="/ads", tags=["Ads"])
app.include_router(gbp.router, prefix="/gbp", tags=["Google Business Profile"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(share_links.router, prefix="/share-links", tags=["Share Links"])

# Routes públicas (sin autenticación)
app.include_router(public.router, prefix="/public/dashboard", tags=["Public Dashboard"])

# Routes detalladas por plataforma
app.include_router(google.router, prefix="/api/google", tags=["Google"])
app.include_router(meta.router, prefix="/api/meta", tags=["Meta"])
app.include_router(linkedin.router, prefix="/api/linkedin", tags=["LinkedIn"])
app.include_router(tiktok.router, prefix="/api/tiktok", tags=["TikTok"])

@app.get("/health")
async def health_check():
    """Health check endpoint para Docker"""
    return {"status": "ok", "message": "Data API is running"}

@app.get("/auth/profile")
async def get_profile_alias(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Alias para /auth/me para compatibilidad con el frontend"""
    from app.core.response import success_response, error_response
    from app.services.auth_service import get_user_with_roles
    try:
        user_response = get_user_with_roles(db, current_user)
        return success_response(
            data=user_response.model_dump() if hasattr(user_response, 'model_dump') else user_response,
            message="Profile retrieved successfully",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        return error_response(
            "Error al obtener el perfil",
            500,
            str(e),
            str(request.url.path)
        )

@app.get("/")
async def root():
    return {"message": "Marketing & SEO Data API"}

