"""
Modelo para links de compartir dashboards con clientes externos
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import secrets
import string


def generate_share_token(length: int = 32) -> str:
    """Genera un token único y seguro para compartir"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


class ShareLink(Base):
    """
    Links para compartir dashboards con clientes externos sin necesidad de login
    """
    __tablename__ = "share_links"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Token único para acceso público (va en la URL)
    token = Column(String(64), unique=True, nullable=False, index=True, default=generate_share_token)
    
    # Nombre descriptivo del link (ej: "Reporte Mensual Cliente X")
    name = Column(String(255), nullable=False)
    
    # IDs de cuentas seleccionadas para este dashboard (JSON array)
    # Permite múltiples cuentas de diferentes plataformas
    account_ids = Column(JSON, nullable=False, default=list)
    
    # Plataformas habilitadas para mostrar (google, meta, linkedin, tiktok, seo)
    platforms = Column(JSON, nullable=True)  # null = todas las plataformas de las cuentas seleccionadas
    
    # Métricas a mostrar (null = todas)
    metrics = Column(JSON, nullable=True)
    
    # Configuración de visualización
    config = Column(JSON, nullable=True, default=dict)
    # Ejemplo de config:
    # {
    #   "show_cost": false,  // Ocultar costos al cliente
    #   "show_chart_types": ["line", "bar", "pie"],
    #   "date_range_days": 30,  // Rango por defecto
    #   "allow_date_selection": true,
    #   "brand_name": "Mi Agencia",
    #   "brand_logo_url": "https://...",
    #   "custom_colors": {"primary": "#FF0000"}
    # }
    
    # Contraseña opcional para acceso adicional
    password_hash = Column(String(255), nullable=True)
    
    # Estado y fechas
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # null = sin expiración
    
    # Auditoría
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    last_accessed = Column(DateTime(timezone=True), nullable=True)
    access_count = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", backref="share_links")
    creator = relationship("User", backref="created_share_links", foreign_keys=[created_by])

    def is_expired(self) -> bool:
        """Verifica si el link ha expirado"""
        if self.expires_at is None:
            return False
        from datetime import datetime, timezone
        return datetime.now(timezone.utc) > self.expires_at

    def is_valid(self) -> bool:
        """Verifica si el link es válido para acceso"""
        return self.is_active and not self.is_expired()

    def record_access(self):
        """Registra un acceso al link"""
        from datetime import datetime, timezone
        self.last_accessed = datetime.now(timezone.utc)
        self.access_count += 1
