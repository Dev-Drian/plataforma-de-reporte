"""
API para gestionar links de compartir dashboards
"""
from fastapi import APIRouter, Depends, Request, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
import logging
import hashlib

from app.core.database import get_db
from app.core.auth_middleware import get_current_user
from app.core.response import success_response, error_response
from app.core.config import settings
from app.models import User, Account, ShareLink
from app.models.share_link import generate_share_token

logger = logging.getLogger(__name__)

router = APIRouter()


# Schemas
class ShareLinkConfig(BaseModel):
    show_cost: bool = True
    show_chart_types: List[str] = ["line", "bar", "pie"]
    date_range_days: int = 30
    allow_date_selection: bool = True
    brand_name: Optional[str] = None
    brand_logo_url: Optional[str] = None
    custom_colors: Optional[dict] = None


class CreateShareLinkRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    account_ids: List[int] = Field(..., min_items=1)
    platforms: Optional[List[str]] = None
    metrics: Optional[List[str]] = None
    config: Optional[ShareLinkConfig] = None
    password: Optional[str] = None
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)


class UpdateShareLinkRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    account_ids: Optional[List[int]] = None
    platforms: Optional[List[str]] = None
    metrics: Optional[List[str]] = None
    config: Optional[ShareLinkConfig] = None
    password: Optional[str] = None
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)
    is_active: Optional[bool] = None


class ShareLinkResponse(BaseModel):
    id: int
    name: str
    token: str
    account_ids: List[int]
    platforms: Optional[List[str]]
    metrics: Optional[List[str]]
    config: Optional[dict]
    is_active: bool
    has_password: bool
    expires_at: Optional[datetime]
    last_accessed: Optional[datetime]
    access_count: int
    created_at: datetime
    share_url: str
    accounts: List[dict]  # Info de las cuentas seleccionadas


def hash_password(password: str) -> str:
    """Hash simple para contraseña del link"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    """Verifica contraseña del link"""
    return hash_password(password) == hashed


@router.get("")
async def list_share_links(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista todos los links de compartir de la organización"""
    try:
        links = db.query(ShareLink).filter(
            ShareLink.organization_id == current_user.organization_id
        ).order_by(ShareLink.created_at.desc()).all()
        
        # Obtener info de cuentas para cada link
        result = []
        for link in links:
            accounts = db.query(Account).filter(
                Account.id.in_(link.account_ids or []),
                Account.organization_id == current_user.organization_id
            ).all()
            
            base_url = settings.FRONTEND_URL.rstrip('/')
            share_url = f"{base_url}/shared/{link.token}"
            
            result.append({
                "id": link.id,
                "name": link.name,
                "token": link.token,
                "account_ids": link.account_ids or [],
                "platforms": link.platforms,
                "metrics": link.metrics,
                "config": link.config,
                "is_active": link.is_active,
                "has_password": link.password_hash is not None,
                "expires_at": link.expires_at.isoformat() if link.expires_at else None,
                "last_accessed": link.last_accessed.isoformat() if link.last_accessed else None,
                "access_count": link.access_count,
                "created_at": link.created_at.isoformat() if link.created_at else None,
                "share_url": share_url,
                "accounts": [
                    {
                        "id": acc.id,
                        "platform": acc.platform,
                        "account_type": acc.account_type,
                        "account_name": acc.account_name or acc.account_id,
                        "is_active": acc.is_active
                    }
                    for acc in accounts
                ]
            })
        
        return success_response(
            data=result,
            message="Links obtenidos exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        logger.error(f"Error listing share links: {e}")
        return error_response(
            message=f"Error al listar links: {str(e)}",
            status_code=500,
            path=str(request.url.path)
        )


@router.post("")
async def create_share_link(
    data: CreateShareLinkRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crea un nuevo link de compartir"""
    try:
        # Verificar que las cuentas pertenecen a la organización
        accounts = db.query(Account).filter(
            Account.id.in_(data.account_ids),
            Account.organization_id == current_user.organization_id,
            Account.is_active == True,
            Account.deleted_at.is_(None)
        ).all()
        
        if len(accounts) != len(data.account_ids):
            return error_response(
                message="Una o más cuentas no existen o no están activas",
                status_code=400,
                path=str(request.url.path)
            )
        
        # Calcular fecha de expiración
        expires_at = None
        if data.expires_in_days:
            expires_at = datetime.now(timezone.utc) + timedelta(days=data.expires_in_days)
        
        # Crear el link
        share_link = ShareLink(
            organization_id=current_user.organization_id,
            name=data.name,
            token=generate_share_token(),
            account_ids=data.account_ids,
            platforms=data.platforms,
            metrics=data.metrics,
            config=data.config.dict() if data.config else {},
            password_hash=hash_password(data.password) if data.password else None,
            expires_at=expires_at,
            created_by=current_user.id
        )
        
        db.add(share_link)
        db.commit()
        db.refresh(share_link)
        
        base_url = settings.FRONTEND_URL.rstrip('/')
        share_url = f"{base_url}/shared/{share_link.token}"
        
        return success_response(
            data={
                "id": share_link.id,
                "name": share_link.name,
                "token": share_link.token,
                "share_url": share_url,
                "account_ids": share_link.account_ids,
                "expires_at": share_link.expires_at.isoformat() if share_link.expires_at else None,
                "accounts": [
                    {
                        "id": acc.id,
                        "platform": acc.platform,
                        "account_type": acc.account_type,
                        "account_name": acc.account_name or acc.account_id
                    }
                    for acc in accounts
                ]
            },
            message="Link creado exitosamente",
            status_code=201,
            path=str(request.url.path)
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating share link: {e}")
        return error_response(
            message=f"Error al crear link: {str(e)}",
            status_code=500,
            path=str(request.url.path)
        )


@router.get("/{link_id}")
async def get_share_link(
    link_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene un link de compartir por ID"""
    try:
        link = db.query(ShareLink).filter(
            ShareLink.id == link_id,
            ShareLink.organization_id == current_user.organization_id
        ).first()
        
        if not link:
            return error_response(
                message="Link no encontrado",
                status_code=404,
                path=str(request.url.path)
            )
        
        accounts = db.query(Account).filter(
            Account.id.in_(link.account_ids or []),
            Account.organization_id == current_user.organization_id
        ).all()
        
        base_url = settings.FRONTEND_URL.rstrip('/')
        share_url = f"{base_url}/shared/{link.token}"
        
        return success_response(
            data={
                "id": link.id,
                "name": link.name,
                "token": link.token,
                "account_ids": link.account_ids or [],
                "platforms": link.platforms,
                "metrics": link.metrics,
                "config": link.config,
                "is_active": link.is_active,
                "has_password": link.password_hash is not None,
                "expires_at": link.expires_at.isoformat() if link.expires_at else None,
                "last_accessed": link.last_accessed.isoformat() if link.last_accessed else None,
                "access_count": link.access_count,
                "created_at": link.created_at.isoformat() if link.created_at else None,
                "share_url": share_url,
                "accounts": [
                    {
                        "id": acc.id,
                        "platform": acc.platform,
                        "account_type": acc.account_type,
                        "account_name": acc.account_name or acc.account_id,
                        "is_active": acc.is_active
                    }
                    for acc in accounts
                ]
            },
            message="Link obtenido exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        logger.error(f"Error getting share link: {e}")
        return error_response(
            message=f"Error al obtener link: {str(e)}",
            status_code=500,
            path=str(request.url.path)
        )


@router.put("/{link_id}")
async def update_share_link(
    link_id: int,
    data: UpdateShareLinkRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualiza un link de compartir"""
    try:
        link = db.query(ShareLink).filter(
            ShareLink.id == link_id,
            ShareLink.organization_id == current_user.organization_id
        ).first()
        
        if not link:
            return error_response(
                message="Link no encontrado",
                status_code=404,
                path=str(request.url.path)
            )
        
        # Actualizar campos
        if data.name is not None:
            link.name = data.name
        
        if data.account_ids is not None:
            # Verificar cuentas
            accounts = db.query(Account).filter(
                Account.id.in_(data.account_ids),
                Account.organization_id == current_user.organization_id,
                Account.is_active == True
            ).all()
            if len(accounts) != len(data.account_ids):
                return error_response(
                    message="Una o más cuentas no existen o no están activas",
                    status_code=400,
                    path=str(request.url.path)
                )
            link.account_ids = data.account_ids
        
        if data.platforms is not None:
            link.platforms = data.platforms
        
        if data.metrics is not None:
            link.metrics = data.metrics
        
        if data.config is not None:
            link.config = data.config.dict()
        
        if data.password is not None:
            link.password_hash = hash_password(data.password) if data.password else None
        
        if data.expires_in_days is not None:
            link.expires_at = datetime.now(timezone.utc) + timedelta(days=data.expires_in_days)
        
        if data.is_active is not None:
            link.is_active = data.is_active
        
        db.commit()
        db.refresh(link)
        
        base_url = settings.FRONTEND_URL.rstrip('/')
        share_url = f"{base_url}/shared/{link.token}"
        
        return success_response(
            data={
                "id": link.id,
                "name": link.name,
                "token": link.token,
                "share_url": share_url,
                "is_active": link.is_active
            },
            message="Link actualizado exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating share link: {e}")
        return error_response(
            message=f"Error al actualizar link: {str(e)}",
            status_code=500,
            path=str(request.url.path)
        )


@router.delete("/{link_id}")
async def delete_share_link(
    link_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina un link de compartir"""
    try:
        link = db.query(ShareLink).filter(
            ShareLink.id == link_id,
            ShareLink.organization_id == current_user.organization_id
        ).first()
        
        if not link:
            return error_response(
                message="Link no encontrado",
                status_code=404,
                path=str(request.url.path)
            )
        
        db.delete(link)
        db.commit()
        
        return success_response(
            data={"id": link_id},
            message="Link eliminado exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting share link: {e}")
        return error_response(
            message=f"Error al eliminar link: {str(e)}",
            status_code=500,
            path=str(request.url.path)
        )


@router.post("/{link_id}/regenerate-token")
async def regenerate_token(
    link_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Regenera el token de un link (invalida el anterior)"""
    try:
        link = db.query(ShareLink).filter(
            ShareLink.id == link_id,
            ShareLink.organization_id == current_user.organization_id
        ).first()
        
        if not link:
            return error_response(
                message="Link no encontrado",
                status_code=404,
                path=str(request.url.path)
            )
        
        link.token = generate_share_token()
        db.commit()
        db.refresh(link)
        
        base_url = settings.FRONTEND_URL.rstrip('/')
        share_url = f"{base_url}/shared/{link.token}"
        
        return success_response(
            data={
                "id": link.id,
                "token": link.token,
                "share_url": share_url
            },
            message="Token regenerado exitosamente. El link anterior ya no funcionará.",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error regenerating token: {e}")
        return error_response(
            message=f"Error al regenerar token: {str(e)}",
            status_code=500,
            path=str(request.url.path)
        )
