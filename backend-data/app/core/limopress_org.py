"""Organizaciones Monitor para clientes Limopress (proxy X-Limopress-Client-ID)."""
from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Organization

logger = logging.getLogger(__name__)


def ensure_limopress_organization(
    db: Session,
    *,
    organization_id: int,
    tenant_id: int,
    org_name: Optional[str] = None,
) -> Organization:
    """
    Garantiza que exista la fila en `organizations` antes de insertar cuentas OAuth.

    Limopress usa client_id como organization_id para usuarios del portal cliente.
    Sin esta fila, INSERT en `accounts` falla por FK (organization_id → organizations.id).
    """
    existing = db.query(Organization).filter(Organization.id == organization_id).first()
    if existing:
        return existing

    if organization_id == tenant_id:
        tenant = db.query(Organization).filter(Organization.id == tenant_id).first()
        if tenant:
            return tenant
        raise ValueError(f"Monitor organization {tenant_id} (Limopress tenant) does not exist")

    name = (org_name or "").strip() or f"Limopress Client {organization_id}"
    slug = f"limopress-client-{organization_id}"

    org = Organization(
        id=organization_id,
        name=name,
        slug=slug,
        description=f"Auto-created for Limopress client_id={organization_id}",
        is_active=True,
        plan="client",
    )
    db.add(org)
    try:
        db.commit()
        db.refresh(org)
        logger.info("Created Monitor organization %s for Limopress client %s", organization_id, name)
        return org
    except IntegrityError:
        db.rollback()
        existing = db.query(Organization).filter(Organization.id == organization_id).first()
        if existing:
            return existing
        raise
