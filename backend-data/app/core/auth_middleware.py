from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.config import settings
from app.core.proxy_user import ProxyUser
from app.models import User

security = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db)
) -> User | ProxyUser:
    """
    Obtiene el usuario actual: vía proxy Limopress (headers) o JWT (Bearer).
    """
    proxy_key = request.headers.get("X-Limopress-Proxy-Key")
    # En entorno Limopress, si viene cabecera de proxy confiamos en ella (dev/local)
    if proxy_key:
        user_id_str = request.headers.get("X-Limopress-User-ID")
        tenant_id_str = request.headers.get("X-Limopress-Tenant-ID")
        email = request.headers.get("X-Limopress-User-Email", "")

        if not user_id_str or not tenant_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Proxy headers incomplete: X-Limopress-User-ID and X-Limopress-Tenant-ID required",
            )
        try:
            user_id = int(user_id_str)
            organization_id = int(tenant_id_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid proxy headers: user_id and tenant_id must be integers",
            )
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
        logger.error(f"Token payload missing user_id. Payload keys: {payload.keys() if payload else 'None'}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user_id",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user




