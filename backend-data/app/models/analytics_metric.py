from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Integer as SQLInteger, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class AnalyticsMetric(Base):
    """Métricas de Analytics (Google Analytics GA4)"""
    __tablename__ = "analytics_metrics"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    source = Column(String(50), nullable=False, default="ga4")  # ga4, etc.
    
    # Métricas principales
    sessions = Column(SQLInteger, default=0, nullable=False)
    users = Column(SQLInteger, default=0, nullable=False)
    new_users = Column(SQLInteger, default=0, nullable=False)
    pageviews = Column(SQLInteger, default=0, nullable=False)
    bounce_rate = Column(Float, nullable=True)
    avg_session_duration = Column(Float, nullable=True)  # en segundos
    conversions = Column(SQLInteger, default=0, nullable=False)
    revenue = Column(Float, default=0.0, nullable=False)
    
    # Dimensiones
    device_category = Column(String(50), nullable=True)  # desktop, mobile, tablet
    country = Column(String(100), nullable=True)
    source_medium = Column(String(255), nullable=True)
    landing_page = Column(Text, nullable=True)
    
    # Metadata adicional
    extra_data = Column(Text, nullable=True)  # JSON string
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="analytics_metrics")

