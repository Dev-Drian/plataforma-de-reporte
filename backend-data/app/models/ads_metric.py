from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Integer as SQLInteger, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class AdsMetric(Base):
    """Métricas de publicidad (Google Ads, Meta Ads, LinkedIn Ads, TikTok Ads)"""
    __tablename__ = "ads_metrics"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    platform = Column(String(50), nullable=False, index=True)  # google_ads, meta_ads, linkedin_ads, tiktok_ads
    
    # Métricas principales
    campaign_name = Column(String(255), nullable=True)
    campaign_id = Column(String(255), nullable=True)
    ad_group_name = Column(String(255), nullable=True)
    ad_group_id = Column(String(255), nullable=True)
    
    impressions = Column(SQLInteger, default=0, nullable=False)
    clicks = Column(SQLInteger, default=0, nullable=False)
    conversions = Column(SQLInteger, default=0, nullable=False)
    cost = Column(Float, default=0.0, nullable=False)
    revenue = Column(Float, default=0.0, nullable=False)
    
    # KPIs calculados
    ctr = Column(Float, nullable=True)  # Click-through rate
    cpc = Column(Float, nullable=True)  # Cost per click
    cpm = Column(Float, nullable=True)  # Cost per mille
    roas = Column(Float, nullable=True)  # Return on ad spend
    conversion_rate = Column(Float, nullable=True)
    
    # Metadata adicional
    extra_data = Column(Text, nullable=True)  # JSON string
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="ads_metrics")

