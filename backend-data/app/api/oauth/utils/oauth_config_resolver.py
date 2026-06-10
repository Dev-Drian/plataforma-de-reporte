"""Resuelve OAuthConfig por organización, con fallback al tenant Limopress."""
from __future__ import annotations

from typing import Optional, Union

from fastapi import Request
from sqlalchemy.orm import Session

from app.core.proxy_user import ProxyUser
from app.models import OAuthConfig, User


def _tenant_id_from_request(request: Request | None) -> Optional[int]:
    if request is None:
        return None
    raw = request.headers.get("X-Limopress-Tenant-ID")
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def resolve_oauth_config(
    db: Session,
    current_user: Union[User, ProxyUser],
    platform: str,
    request: Request | None = None,
    *,
    organization_id: int | None = None,
) -> Optional[OAuthConfig]:
    """
    Busca credenciales OAuth de la plataforma.

    Las cuentas conectadas se guardan bajo organization_id del usuario (cliente o tenant),
    pero las credenciales de la app OAuth (client_id/secret) suelen estar a nivel tenant.
    Si un usuario del portal cliente (X-Limopress-Client-ID) no tiene fila propia, se usa el tenant.
    """
    org_id = organization_id if organization_id is not None else current_user.organization_id
    platform_key = platform.lower()

    def query_for(org: int) -> Optional[OAuthConfig]:
        return (
            db.query(OAuthConfig)
            .filter(
                OAuthConfig.organization_id == org,
                OAuthConfig.platform == platform_key,
                OAuthConfig.is_active.is_(True),
            )
            .first()
        )

    config = query_for(org_id)
    if config:
        return config

    tenant_id = _tenant_id_from_request(request)
    if tenant_id is not None and tenant_id != org_id:
        return query_for(tenant_id)

    return None
