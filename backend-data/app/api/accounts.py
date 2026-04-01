from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from typing import Union
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.core.auth_middleware import get_current_user
from app.core.response import success_response, error_response, created_response, no_content_response
from app.models import User, Account
from app.core.proxy_user import ProxyUser
from app.core.config import settings
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse
import json

router = APIRouter()


@router.get("")
async def get_accounts(
    request: Request,
    include_deleted: bool = Query(False, description="Incluir cuentas eliminadas (soft delete)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene todas las cuentas de la organización del usuario"""
    query = db.query(Account).filter(
        Account.organization_id == current_user.organization_id
    )
    
    # Por defecto, excluir cuentas eliminadas (soft delete)
    if not include_deleted:
        query = query.filter(Account.deleted_at.is_(None))
    
    accounts = query.all()
    
    # Convertir a diccionarios para la respuesta (mode='json' convierte datetime a strings)
    accounts_data = [AccountResponse.model_validate(account).model_dump(mode='json') for account in accounts]
    
    return success_response(
        data=accounts_data,
        message="Cuentas obtenidas exitosamente",
        status_code=200,
        path=str(request.url.path)
    )


@router.get("/google-ads-credentials-for-limopress-sync")
async def google_ads_credentials_for_limopress_sync(
    request: Request,
    current_user: Union[User, ProxyUser] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Solo para Limopress (servidor): devuelve refresh_token e is_mcc de cuentas Google Ads
    del mismo organization_id, con cabecera X-Limopress-Proxy-Key válida.
    No usar desde el navegador.
    """
    proxy_key = request.headers.get("X-Limopress-Proxy-Key") or ""
    limopress_user_id = request.headers.get("X-Limopress-User-ID") or ""
    secret = (settings.LIMOPRESS_PROXY_SECRET or "").strip()
    if secret:
        if proxy_key != secret:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid Limopress proxy credentials",
            )
    elif not limopress_user_id:
        # Sin secret: solo peticiones con contexto Limopress (no desde el navegador a pelo)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Configure LIMOPRESS_PROXY_SECRET or call from Limopress with X-Limopress-User-ID",
        )

    org_id = getattr(current_user, "organization_id", None)
    if org_id is None:
        raise HTTPException(status_code=400, detail="No organization context")

    rows = (
        db.query(Account)
        .filter(
            Account.organization_id == org_id,
            Account.platform == "google",
            Account.account_type == "ads",
            Account.deleted_at.is_(None),
            Account.is_active.is_(True),
        )
        .all()
    )

    out = []
    for a in rows:
        if not a.refresh_token:
            continue
        extra = {}
        if a.extra_data:
            try:
                extra = json.loads(a.extra_data)
            except (json.JSONDecodeError, TypeError):
                extra = {}
        out.append(
            {
                "monitor_account_id": a.id,
                "customer_id": a.account_id,
                "account_name": a.account_name,
                "refresh_token": a.refresh_token,
                "is_mcc": bool(extra.get("is_mcc", False)),
            }
        )

    return success_response(
        data=out,
        message="Google Ads credentials for Limopress sync",
        status_code=200,
        path=str(request.url.path),
    )


@router.post("")
async def create_account(
    account_data: AccountCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crea una nueva cuenta conectada"""
    # Preparar credenciales como JSON
    credentials = {}
    if account_data.access_token:
        credentials["access_token"] = account_data.access_token
    if account_data.refresh_token:
        credentials["refresh_token"] = account_data.refresh_token
    if account_data.credentials_json:
        credentials.update(account_data.credentials_json)
    
    # Verificar si ya existe (incluyendo eliminadas)
    existing = db.query(Account).filter(
        Account.organization_id == current_user.organization_id,
        Account.platform == account_data.platform,
        Account.account_type == account_data.account_type,
        Account.account_id == account_data.account_id
    ).first()
    
    # Si existe pero está eliminada, restaurarla
    if existing and existing.deleted_at:
        existing.deleted_at = None
        existing.is_active = account_data.is_active
        if account_data.access_token:
            existing.access_token = account_data.access_token
        if account_data.refresh_token:
            existing.refresh_token = account_data.refresh_token
        if account_data.token_expires_at:
            existing.token_expires_at = account_data.token_expires_at
        db.commit()
        db.refresh(existing)
        account_response = AccountResponse.model_validate(existing).model_dump(mode='json')
        return success_response(
            data=account_response,
            message="Cuenta restaurada exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    
    if existing:
        return error_response(
            message="La cuenta ya existe",
            status_code=400,
            error="Account already exists",
            path=str(request.url.path)
        )
    
    account = Account(
        organization_id=current_user.organization_id,
        platform=account_data.platform,
        account_type=account_data.account_type,
        account_id=account_data.account_id,
        account_name=account_data.account_name,
        user_email=account_data.user_email,
        is_active=account_data.is_active,
        access_token=account_data.access_token,
        refresh_token=account_data.refresh_token,
        token_expires_at=account_data.token_expires_at,
        credentials=json.dumps(credentials) if credentials else None
    )
    
    db.add(account)
    db.commit()
    db.refresh(account)
    
    account_response = AccountResponse.model_validate(account).model_dump(mode='json')
    
    return created_response(
        data=account_response,
        message="Cuenta creada exitosamente",
        path=str(request.url.path)
    )


@router.get("/{account_id:int}")
async def get_account(
    account_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene una cuenta específica"""
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.organization_id == current_user.organization_id,
        Account.deleted_at.is_(None)  # Excluir eliminadas
    ).first()
    
    if not account:
        return error_response(
            message="Cuenta no encontrada",
            status_code=404,
            error="Account not found",
            path=str(request.url.path)
        )
    
    account_data = AccountResponse.model_validate(account).model_dump(mode='json')
    
    return success_response(
        data=account_data,
        message="Cuenta obtenida exitosamente",
        status_code=200,
        path=str(request.url.path)
    )


@router.put("/{account_id:int}")
async def update_account(
    account_id: int,
    account_data: AccountUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualiza una cuenta"""
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.organization_id == current_user.organization_id,
        Account.deleted_at.is_(None)  # No permitir actualizar eliminadas
    ).first()
    
    if not account:
        return error_response(
            message="Cuenta no encontrada",
            status_code=404,
            error="Account not found",
            path=str(request.url.path)
        )
    
    # Actualizar campos
    if account_data.account_name is not None:
        account.account_name = account_data.account_name
    if account_data.is_active is not None:
        account.is_active = account_data.is_active
    
    # Actualizar tokens
    if account_data.access_token is not None:
        account.access_token = account_data.access_token
    if account_data.refresh_token is not None:
        account.refresh_token = account_data.refresh_token
    if account_data.token_expires_at is not None:
        account.token_expires_at = account_data.token_expires_at
    
    # Actualizar credenciales adicionales
    if account_data.credentials_json:
        credentials = json.loads(account.credentials) if account.credentials else {}
        credentials.update(account_data.credentials_json)
        account.credentials = json.dumps(credentials)
    
    db.commit()
    db.refresh(account)
    
    account_response = AccountResponse.model_validate(account).model_dump(mode='json')
    
    return success_response(
        data=account_response,
        message="Cuenta actualizada exitosamente",
        status_code=200,
        path=str(request.url.path)
    )


@router.delete("/{account_id:int}")
async def delete_account(
    account_id: int,
    request: Request,
    hard_delete: bool = Query(False, description="Eliminación permanente (hard delete)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina una cuenta (soft delete por defecto)"""
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.organization_id == current_user.organization_id
    ).first()
    
    if not account:
        return error_response(
            message="Cuenta no encontrada",
            status_code=404,
            error="Account not found",
            path=str(request.url.path)
        )
    
    if hard_delete:
        # Eliminación permanente
        db.delete(account)
        db.commit()
        return no_content_response()
    else:
        # Soft delete
        account.deleted_at = datetime.utcnow()
        account.is_active = False
        db.commit()
        db.refresh(account)
        
        account_response = AccountResponse.model_validate(account).model_dump(mode='json')
        return success_response(
            data=account_response,
            message="Cuenta deshabilitada exitosamente",
            status_code=200,
            path=str(request.url.path)
        )


@router.patch("/{account_id:int}/toggle-status")
async def toggle_account_status(
    account_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cambia el estado activo/inactivo de una cuenta"""
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.organization_id == current_user.organization_id,
        Account.deleted_at.is_(None)  # No permitir cambiar estado de eliminadas
    ).first()
    
    if not account:
        return error_response(
            message="Cuenta no encontrada",
            status_code=404,
            error="Account not found",
            path=str(request.url.path)
        )
    
    account.is_active = not account.is_active
    db.commit()
    db.refresh(account)
    
    account_response = AccountResponse.model_validate(account).model_dump(mode='json')
    return success_response(
        data=account_response,
        message=f"Cuenta {'activada' if account.is_active else 'desactivada'} exitosamente",
        status_code=200,
        path=str(request.url.path)
    )


@router.post("/{account_id:int}/restore")
async def restore_account(
    account_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Restaura una cuenta eliminada (soft delete)"""
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.organization_id == current_user.organization_id,
        Account.deleted_at.isnot(None)  # Solo restaurar si está eliminada
    ).first()
    
    if not account:
        return error_response(
            message="Cuenta no encontrada o no está eliminada",
            status_code=404,
            error="Account not found or not deleted",
            path=str(request.url.path)
        )
    
    account.deleted_at = None
    account.is_active = True
    db.commit()
    db.refresh(account)
    
    account_response = AccountResponse.model_validate(account).model_dump(mode='json')
    return success_response(
        data=account_response,
        message="Cuenta restaurada exitosamente",
        status_code=200,
        path=str(request.url.path)
    )


@router.post("/batch/toggle-status")
async def batch_toggle_account_status(
    account_ids: List[int],
    is_active: bool,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cambia el estado de múltiples cuentas a la vez"""
    accounts = db.query(Account).filter(
        Account.id.in_(account_ids),
        Account.organization_id == current_user.organization_id,
        Account.deleted_at.is_(None)
    ).all()
    
    if not accounts:
        return error_response(
            message="No se encontraron cuentas válidas",
            status_code=404,
            error="No valid accounts found",
            path=str(request.url.path)
        )
    
    for account in accounts:
        account.is_active = is_active
    
    db.commit()
    
    accounts_data = [AccountResponse.model_validate(account).model_dump(mode='json') for account in accounts]
    
    return success_response(
        data=accounts_data,
        message=f"{len(accounts)} cuenta(s) {'activada(s)' if is_active else 'desactivada(s)'} exitosamente",
        status_code=200,
        path=str(request.url.path)
    )




