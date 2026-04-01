"""
Ejemplo: Guardar Configuración de LinkedIn OAuth en la Base de Datos
"""

import json
from sqlalchemy.orm import Session
from app.models import OAuthConfig, OAuthProvider, Organization


async def save_linkedin_oauth_config(
    db: Session,
    organization_id: int,
    client_id: str,
    client_secret: str,
    redirect_uri: str,
    scopes: list = None
) -> OAuthConfig:
    """
    Guarda la configuración de LinkedIn OAuth en la base de datos
    
    Args:
        db: Sesión de base de datos
        organization_id: ID de la organización
        client_id: LinkedIn Client ID
        client_secret: LinkedIn Client Secret (será encriptado)
        redirect_uri: Redirect URI registrada en LinkedIn
        scopes: Lista de scopes (por defecto: ["openid", "profile", "email"])
    
    Returns:
        OAuthConfig guardado
    """
    if scopes is None:
        scopes = ["openid", "profile", "email"]
    
    # Obtener el provider de LinkedIn
    provider = db.query(OAuthProvider).filter(
        OAuthProvider.name == "linkedin"
    ).first()
    
    if not provider:
        raise ValueError("LinkedIn provider not found. Run seeders first.")
    
    # Crear o actualizar configuración
    config = db.query(OAuthConfig).filter(
        OAuthConfig.organization_id == organization_id,
        OAuthConfig.platform == "linkedin"
    ).first()
    
    if config:
        # Actualizar existente
        config.client_id = client_id
        config.client_secret = client_secret  # Encriptar en producción
        config.redirect_uri = redirect_uri
        config.scopes = json.dumps(scopes)
    else:
        # Crear nuevo
        config = OAuthConfig(
            organization_id=organization_id,
            provider_id=provider.id,
            platform="linkedin",
            client_id=client_id,
            client_secret=client_secret,  # Encriptar en producción
            redirect_uri=redirect_uri,
            scopes=json.dumps(scopes),
            is_active=True
        )
        db.add(config)
    
    db.commit()
    db.refresh(config)
    
    return config


async def get_linkedin_oauth_config(
    db: Session,
    organization_id: int
) -> OAuthConfig:
    """
    Obtiene la configuración de LinkedIn OAuth de una organización
    
    Args:
        db: Sesión de base de datos
        organization_id: ID de la organización
    
    Returns:
        OAuthConfig o None si no existe
    """
    config = db.query(OAuthConfig).filter(
        OAuthConfig.organization_id == organization_id,
        OAuthConfig.platform == "linkedin",
        OAuthConfig.is_active == True
    ).first()
    
    if config and config.scopes:
        # Convertir JSON string a list
        config.scopes = json.loads(config.scopes)
    
    return config


async def delete_linkedin_oauth_config(
    db: Session,
    organization_id: int
) -> bool:
    """
    Elimina la configuración de LinkedIn OAuth de una organización
    
    Args:
        db: Sesión de base de datos
        organization_id: ID de la organización
    
    Returns:
        True si fue eliminado, False si no existía
    """
    config = db.query(OAuthConfig).filter(
        OAuthConfig.organization_id == organization_id,
        OAuthConfig.platform == "linkedin"
    ).first()
    
    if config:
        db.delete(config)
        db.commit()
        return True
    
    return False


# ============================================================================
# EJEMPLO DE USO
# ============================================================================

"""
# En una ruta FastAPI:

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_middleware import get_current_user
from app.models import User

router = APIRouter()


@router.post("/oauth/linkedin/config")
async def set_linkedin_config(
    client_id: str,
    client_secret: str,
    redirect_uri: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    '''Guarda la configuración de LinkedIn OAuth'''
    try:
        config = await save_linkedin_oauth_config(
            db=db,
            organization_id=current_user.organization_id,
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
            scopes=["openid", "profile", "email"]
        )
        
        return {
            "status": "success",
            "message": "LinkedIn OAuth configured successfully",
            "config": {
                "platform": config.platform,
                "client_id": config.client_id[:20] + "...",
                "redirect_uri": config.redirect_uri
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/oauth/linkedin/config")
async def get_linkedin_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    '''Obtiene la configuración de LinkedIn OAuth'''
    config = await get_linkedin_oauth_config(
        db=db,
        organization_id=current_user.organization_id
    )
    
    if not config:
        raise HTTPException(status_code=404, detail="LinkedIn OAuth not configured")
    
    return {
        "status": "success",
        "config": {
            "platform": config.platform,
            "client_id": config.client_id[:20] + "...",
            "redirect_uri": config.redirect_uri,
            "scopes": config.scopes,
            "is_active": config.is_active,
            "created_at": config.created_at.isoformat()
        }
    }


@router.delete("/oauth/linkedin/config")
async def delete_linkedin_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    '''Elimina la configuración de LinkedIn OAuth'''
    deleted = await delete_linkedin_oauth_config(
        db=db,
        organization_id=current_user.organization_id
    )
    
    if not deleted:
        raise HTTPException(status_code=404, detail="LinkedIn OAuth not configured")
    
    return {"status": "success", "message": "LinkedIn OAuth configuration deleted"}
"""
