from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Integer as SQLInteger, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class GBPMetric(Base):
    """Métricas de Google Business Profile"""
    __tablename__ = "gbp_metrics"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    city_id = Column(Integer, ForeignKey("cities.id", ondelete="SET NULL"), nullable=True, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Métricas principales
    location_name = Column(String(255), nullable=True)
    location_id = Column(String(255), nullable=True)
    
    views_search = Column(SQLInteger, default=0, nullable=False)  # Vistas desde búsqueda
    views_maps = Column(SQLInteger, default=0, nullable=False)  # Vistas desde Maps
    total_views = Column(SQLInteger, default=0, nullable=False)
    
    actions_website = Column(SQLInteger, default=0, nullable=False)
    actions_directions = Column(SQLInteger, default=0, nullable=False)
    actions_phone = Column(SQLInteger, default=0, nullable=False)
    total_actions = Column(SQLInteger, default=0, nullable=False)
    
    # Reviews
    total_reviews = Column(SQLInteger, default=0, nullable=False)
    average_rating = Column(Float, nullable=True)
    new_reviews = Column(SQLInteger, default=0, nullable=False)
    
    # Metadata adicional
    extra_data = Column(Text, nullable=True)  # JSON string
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="gbp_metrics")

