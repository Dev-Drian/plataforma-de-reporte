"""
Servicio para obtener credenciales de cuentas desde la BD
Diseñado para SaaS multi-tenant
"""
from sqlalchemy.orm import Session
from typing import Optional, Dict
from app.models import Account
import json


def get_account_credentials(
    db: Session,
    organization_id: int,
    platform: str,
    account_type: str
) -> Optional[Dict]:
    """
    Obtiene las credenciales de una cuenta específica
    Retorna None si no existe o está inactiva
    """
    account = db.query(Account).filter(
        Account.organization_id == organization_id,
        Account.platform == platform,
        Account.account_type == account_type,
        Account.is_active == True
    ).first()
    
    if not account or not account.credentials:
        return None
    
    try:
        return json.loads(account.credentials)
    except json.JSONDecodeError:
        return None


def get_all_accounts_for_platform(
    db: Session,
    organization_id: int,
    platform: str
) -> list[Account]:
    """Obtiene todas las cuentas activas de una plataforma para una organización"""
    return db.query(Account).filter(
        Account.organization_id == organization_id,
        Account.platform == platform,
        Account.is_active == True
    ).all()


def get_credentials_by_account_id(
    db: Session,
    organization_id: int,
    account_id: int
) -> Optional[Dict]:
    """Obtiene credenciales por ID de cuenta"""
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.organization_id == organization_id,
        Account.is_active == True
    ).first()
    
    if not account or not account.credentials:
        return None
    
    try:
        return json.loads(account.credentials)
    except json.JSONDecodeError:
        return None




