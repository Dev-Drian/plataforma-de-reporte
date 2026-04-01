from typing import Optional
from sqlalchemy.orm import Session
from app.models import Organization
from app.repositories.base_repository import BaseRepository


class OrganizationRepository(BaseRepository[Organization]):
    """Repository para operaciones con organizaciones"""
    
    def get_by_slug(self, slug: str) -> Optional[Organization]:
        """Obtiene una organización por slug"""
        return self.db.query(Organization).filter(Organization.slug == slug).first()
    
    def get_active(self) -> list[Organization]:
        """Obtiene todas las organizaciones activas"""
        return self.db.query(Organization).filter(Organization.is_active == True).all()




