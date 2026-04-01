from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class SyncJob(Base):
    """Jobs de sincronización de datos"""
    __tablename__ = "sync_jobs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    job_type = Column(String(50), nullable=False, index=True)  # seo, ads, analytics, gbp
    platform = Column(String(50), nullable=False)  # google, meta, linkedin, tiktok
    status = Column(String(20), default=JobStatus.PENDING.value, nullable=False, index=True)
    
    # Fechas
    date_from = Column(DateTime(timezone=True), nullable=True)
    date_to = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Resultados
    records_synced = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    extra_data = Column(Text, nullable=True)  # JSON string
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="sync_jobs")

