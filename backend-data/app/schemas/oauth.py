from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class OAuthConfigBase(BaseModel):
    platform: str = Field(..., description="Plataforma: google, meta, linkedin, tiktok")
    client_id: str = Field(..., min_length=1, description="OAuth Client ID")
    client_secret: str = Field(..., min_length=1, description="OAuth Client Secret")
    redirect_uri: Optional[str] = Field(None, description="Redirect URI configurado en la plataforma")
    scopes: Optional[List[str]] = Field(None, description="Lista de scopes requeridos")
    developer_token: Optional[str] = Field(None, description="Developer Token (requerido para Google Ads)")


class OAuthConfigCreate(OAuthConfigBase):
    pass


class OAuthConfigUpdate(BaseModel):
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    redirect_uri: Optional[str] = None
    scopes: Optional[List[str]] = None
    developer_token: Optional[str] = None
    is_active: Optional[bool] = None


class OAuthConfigResponse(OAuthConfigBase):
    id: int
    organization_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OAuthInitRequest(BaseModel):
    platform: str = Field(..., description="Plataforma: google, meta, linkedin, tiktok")
    account_type: str = Field(..., description="Tipo de cuenta: search_console, analytics, ads, etc.")


class OAuthInitResponse(BaseModel):
    auth_url: str = Field(..., description="URL para iniciar el flujo OAuth")
    state: str = Field(..., description="State token para validar el callback")


class OAuthCallbackRequest(BaseModel):
    platform: str
    account_type: str
    code: Optional[str] = Field(None, description="Authorization code recibido del OAuth provider (opcional si hay tokens en cache)")
    state: str = Field(..., description="State token para validar")
    account_id: Optional[str] = Field(None, description="ID de la cuenta en la plataforma (obtenido después de OAuth)")
    account_name: Optional[str] = Field(None, description="Nombre de la cuenta")
    selected_customer_id: Optional[str] = Field(None, description="Customer ID seleccionado para Google Ads (si hay múltiples cuentas)")
    selected_customer_ids: Optional[List[str]] = Field(None, description="Lista de Customer IDs seleccionados para Google Ads MCC (múltiples cuentas)")
    selected_analytics_property_ids: Optional[List[str]] = Field(None, description="Lista de property_id de Analytics a conectar (flujo 'all')")
    selected_search_console_sites: Optional[List[str]] = Field(None, description="Lista de site_url de Search Console a conectar (flujo 'all')")


class OAuthCallbackResponse(BaseModel):
    account_id: Optional[int] = None
    account_name: Optional[str] = None
    platform: str
    account_type: str
    message: str = "Cuenta conectada exitosamente"
    requires_selection: Optional[bool] = Field(False, description="Indica si se requiere selección de cuentas")
    available_accounts: Optional[List[dict]] = Field(None, description="Lista de cuentas disponibles para selección")

