from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Account(Base):
    """
    Cuentas conectadas de APIs externas (Google, Meta, LinkedIn, TikTok)
    Almacena tokens OAuth obtenidos después de la autenticación
    """
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(String(50), nullable=False, index=True)  # google, meta, linkedin, tiktok
    account_type = Column(String(50), nullable=False)  # search_console, analytics, ads, gbp, etc.
    account_id = Column(String(255), nullable=False)  # ID de la cuenta en la plataforma externa (obtenido después de OAuth)
    account_name = Column(String(255), nullable=True)  # Nombre de la cuenta (obtenido de la plataforma)
    user_email = Column(String(255), nullable=True)  # Email del usuario que conectó la cuenta
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Tokens OAuth (obtenidos después del flujo OAuth)
    access_token = Column(Text, nullable=True)  # Access token (puede estar encriptado)
    refresh_token = Column(Text, nullable=True)  # Refresh token (puede estar encriptado)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)  # Fecha de expiración del access token
    
    # Credenciales adicionales (para APIs que no usan OAuth)
    credentials = Column(Text, nullable=True)  # JSON string con credenciales adicionales (API keys, etc.)
    extra_data = Column(Text, nullable=True)  # JSON string con metadata adicional (is_mcc, customer_id, etc.)
    
    # Relación con cuenta MCC padre (para cuentas hijas de un MCC)
    parent_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    
    last_sync = Column(DateTime(timezone=True), nullable=True)
    last_sync_status = Column(String(50), nullable=True)  # success, error, pending
    last_sync_error = Column(Text, nullable=True)  # Mensaje de error si falló
    
    # Soft delete
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="accounts")
    parent_account = relationship("Account", remote_side=[id], backref="child_accounts")

