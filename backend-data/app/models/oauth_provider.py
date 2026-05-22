from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import json


class OAuthProvider(Base):
    """
    Proveedores OAuth disponibles en el sistema
    Define qué campos son requeridos para cada provider
    """
    __tablename__ = "oauth_providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)  # google, meta, linkedin, tiktok
    display_name = Column(String(100), nullable=False)  # Google, Meta (Facebook), etc.
    icon = Column(String(10), nullable=True)  # Emoji o icono para la plataforma
    color = Column(String(50), nullable=True)  # Color CSS para la plataforma (ej: bg-blue-500)
    required_fields = Column(Text, nullable=False)  # JSON string con campos requeridos
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    oauth_configs = relationship("OAuthConfig", back_populates="provider")

    def get_required_fields(self) -> dict:
        """Retorna los campos requeridos como diccionario"""
        try:
            return json.loads(self.required_fields) if self.required_fields else {}
        except:
            return {}

    def set_required_fields(self, fields: dict):
        """Establece los campos requeridos desde un diccionario"""
        self.required_fields = json.dumps(fields)

