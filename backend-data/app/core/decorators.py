"""
Decoradores para verificar permisos y roles
"""
from functools import wraps
from typing import List, Callable
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.models import User
from app.core.database import get_db
from app.repositories.user_repository import UserRepository


def require_roles(allowed_roles: List[str]):
    """
    Decorador para verificar que el usuario tenga uno de los roles permitidos
    
    Uso:
        @router.get("/admin-only")
        @require_roles(["admin"])
        async def admin_endpoint(current_user: User = Depends(get_current_user)):
            ...
    
    Args:
        allowed_roles: Lista de roles permitidos (ej: ["admin", "user"])
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Obtener current_user y db de los kwargs
            current_user = kwargs.get("current_user")
            db = kwargs.get("db")
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Usuario no autenticado"
                )
            
            if not db:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error interno: sesión de base de datos no disponible"
                )
            
            # Obtener roles del usuario
            user_repo = UserRepository(User, db)
            user_roles = user_repo.get_user_roles(current_user.id)
            
            # Verificar si el usuario tiene alguno de los roles permitidos
            has_permission = any(role in allowed_roles for role in user_roles)
            
            if not has_permission:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Se requiere uno de los siguientes roles: {', '.join(allowed_roles)}"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def admin_only():
    """Decorador para endpoints que solo admins pueden acceder"""
    return require_roles(["admin"])


def authenticated_users():
    """Decorador para endpoints que requieren cualquier usuario autenticado"""
    return require_roles(["admin", "user", "viewer"])


def can_export():
    """Decorador para endpoints que permiten exportar datos"""
    return require_roles(["admin", "user"])


def can_sync():
    """Decorador para endpoints que permiten sincronizar datos"""
    return require_roles(["admin", "user"])
