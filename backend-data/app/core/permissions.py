"""
Funciones helper para verificar permisos y roles de usuarios
"""
from sqlalchemy.orm import Session
from app.models import User
from app.repositories.user_repository import UserRepository


def is_admin(user, db: Session) -> bool:
    """Verifica si el usuario tiene rol de administrador"""
    if getattr(user, "is_proxy", False):
        return True
    user_repo = UserRepository(User, db)
    roles = user_repo.get_user_roles(user.id)
    return "admin" in roles


def require_admin(user: User, db: Session):
    """Lanza una excepción si el usuario no es admin"""
    from fastapi import HTTPException, status
    
    if not is_admin(user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden realizar esta acción"
        )

