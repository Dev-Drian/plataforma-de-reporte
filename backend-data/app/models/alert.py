from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Alert(Base):
    """Alertas y notificaciones"""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    alert_type = Column(String(50), nullable=False, index=True)  # metric_drop, threshold, error, etc.
    severity = Column(String(20), nullable=False, default="info")  # info, warning, error, critical
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    is_resolved = Column(Boolean, default=False, nullable=False, index=True)
    extra_data = Column(Text, nullable=True)  # JSON string con datos relacionados
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="alerts")

