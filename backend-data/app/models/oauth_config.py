from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class OAuthConfig(Base):
    """
    Configuración OAuth por organización y plataforma
    Almacena Client ID y Client Secret que son configuración inicial
    """
    __tablename__ = "oauth_configs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_id = Column(Integer, ForeignKey("oauth_providers.id", ondelete="SET NULL"), nullable=True, index=True)
    platform = Column(String(50), nullable=False, index=True)  # google, meta, linkedin, tiktok
    client_id = Column(String(500), nullable=False)  # OAuth Client ID
    client_secret = Column(String(500), nullable=False)  # OAuth Client Secret (encriptado)
    redirect_uri = Column(String(500), nullable=True)  # Redirect URI configurado
    scopes = Column(Text, nullable=True)  # JSON array con los scopes requeridos
    developer_token = Column(String(500), nullable=True)  # Developer Token (para Google Ads, etc.)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="oauth_configs")
    provider = relationship("OAuthProvider", back_populates="oauth_configs")

    # Constraint: una organización solo puede tener una config OAuth por plataforma
    __table_args__ = (
        UniqueConstraint('organization_id', 'platform', name='uq_org_platform_oauth'),
    )

