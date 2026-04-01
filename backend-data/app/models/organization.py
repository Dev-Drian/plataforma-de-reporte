from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Organization(Base):
    """Organización/Tenant para SaaS multi-tenant"""
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    plan = Column(String(50), default="free", nullable=False)  # free, basic, pro, enterprise
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    settings = relationship("OrganizationSetting", back_populates="organization", cascade="all, delete-orphan")
    keywords = relationship("Keyword", back_populates="organization", cascade="all, delete-orphan")
    accounts = relationship("Account", back_populates="organization", cascade="all, delete-orphan")
    oauth_configs = relationship("OAuthConfig", back_populates="organization", cascade="all, delete-orphan")
    cities = relationship("City", back_populates="organization", cascade="all, delete-orphan")
    seo_metrics = relationship("SEOMetric", back_populates="organization", cascade="all, delete-orphan")
    ads_metrics = relationship("AdsMetric", back_populates="organization", cascade="all, delete-orphan")
    analytics_metrics = relationship("AnalyticsMetric", back_populates="organization", cascade="all, delete-orphan")
    gbp_metrics = relationship("GBPMetric", back_populates="organization", cascade="all, delete-orphan")
    sync_jobs = relationship("SyncJob", back_populates="organization", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="organization", cascade="all, delete-orphan")




