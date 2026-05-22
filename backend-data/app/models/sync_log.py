from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class LogLevel(str, enum.Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class SyncLog(Base):
    """Logs de sincronización"""
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    sync_job_id = Column(Integer, ForeignKey("sync_jobs.id", ondelete="CASCADE"), nullable=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    level = Column(String(20), nullable=False, index=True)  # debug, info, warning, error, critical
    message = Column(Text, nullable=False)
    details = Column(Text, nullable=True)  # JSON string con detalles adicionales
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    sync_job = relationship("SyncJob", foreign_keys=[sync_job_id])

