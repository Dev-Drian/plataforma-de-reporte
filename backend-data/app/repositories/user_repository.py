from typing import Optional, List
from sqlalchemy.orm import Session
from app.models import User, UserRole, Role
from app.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository para operaciones con usuarios"""
    
    def get_by_email(self, email: str) -> Optional[User]:
        """Obtiene un usuario por email"""
        return self.db.query(User).filter(User.email == email).first()
    
    def get_by_organization(self, organization_id: int) -> List[User]:
        """Obtiene todos los usuarios de una organización"""
        return self.db.query(User).filter(
            User.organization_id == organization_id,
            User.is_active == True
        ).all()
    
    def get_user_roles(self, user_id: int) -> List[str]:
        """Obtiene los nombres de los roles de un usuario"""
        user_roles = self.db.query(UserRole).filter(UserRole.user_id == user_id).all()
        roles = []
        for ur in user_roles:
            role = self.db.query(Role).filter(Role.id == ur.role_id).first()
            if role:
                roles.append(role.name)
        return roles




