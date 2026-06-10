"""
Autenticación para el Monitor: proxy Limopress (headers) o JWT (Bearer).
"""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.config import settings
from app.core.proxy_user import ProxyUser
from app.core.limopress_org import ensure_limopress_organization
from app.models import User

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
):
    proxy_key = request.headers.get("X-Limopress-Proxy-Key") or ""

    if proxy_key:
        user_id_str = request.headers.get("X-Limopress-User-ID")
        tenant_id_str = request.headers.get("X-Limopress-Tenant-ID")
        client_id_str = request.headers.get("X-Limopress-Client-ID")
        email = request.headers.get("X-Limopress-User-Email") or ""

        if not user_id_str or not tenant_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Proxy headers incomplete: X-Limopress-User-ID and X-Limopress-Tenant-ID required",
            )

        try:
            user_id = int(user_id_str)
            tenant_id = int(tenant_id_str)
            organization_id = int(client_id_str) if client_id_str else tenant_id
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid proxy headers: user_id and tenant_id must be integers",
            ) from exc

        if client_id_str:
            try:
                ensure_limopress_organization(
                    db,
                    organization_id=organization_id,
                    tenant_id=tenant_id,
                    org_name=request.headers.get("X-Limopress-Client-Name"),
                )
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=str(exc),
                ) from exc

        return ProxyUser(id=user_id, organization_id=organization_id, email=email)

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("user_id")
    if not user_id:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(
            "Token payload missing user_id. Payload keys: %s",
            list(payload.keys()) if payload else "None",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user_id",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    return user
