from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime


class AccountBase(BaseModel):
    platform: str  # google, meta, linkedin, tiktok
    account_type: str  # search_console, analytics, ads, gbp
    account_id: str  # ID de la cuenta en la plataforma externa (obtenido después de OAuth)
    account_name: Optional[str] = None
    user_email: Optional[str] = None  # Email del usuario que conectó la cuenta


class AccountCreate(AccountBase):
    # Tokens OAuth (obtenidos después del flujo OAuth)
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    
    # Credenciales adicionales (para APIs que no usan OAuth)
    credentials_json: Optional[Dict] = None  # Para credenciales complejas (API keys, etc.)
    is_active: bool = True
    parent_account_id: Optional[int] = None  # Para cuentas hijas de MCC


class AccountUpdate(BaseModel):
    account_name: Optional[str] = None
    is_active: Optional[bool] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    credentials_json: Optional[Dict] = None
    parent_account_id: Optional[int] = None


class AccountResponse(AccountBase):
    id: int
    organization_id: int
    is_active: bool
    parent_account_id: Optional[int] = None
    last_sync: Optional[datetime]
    last_sync_status: Optional[str]
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BatchToggleStatusRequest(BaseModel):
    account_ids: List[int]
    is_active: bool


