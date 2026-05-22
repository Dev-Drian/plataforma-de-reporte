from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Integer as SQLInteger, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class SEOMetric(Base):
    """Métricas de SEO (Search Console, Rankings)"""
    __tablename__ = "seo_metrics"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.id", ondelete="SET NULL"), nullable=True, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    source = Column(String(50), nullable=False)  # search_console, rankings, etc.
    
    # Métricas principales
    keyword = Column(String(255), nullable=True, index=True)
    position = Column(Float, nullable=True)
    clicks = Column(SQLInteger, default=0, nullable=False)
    impressions = Column(SQLInteger, default=0, nullable=False)
    ctr = Column(Float, nullable=True)  # Click-through rate
    url = Column(Text, nullable=True)
    
    # Metadata adicional
    device = Column(String(50), nullable=True)  # desktop, mobile, tablet
    country = Column(String(100), nullable=True)
    extra_data = Column(Text, nullable=True)  # JSON string
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="seo_metrics")

