from sqlalchemy.orm import Session
from typing import Optional
from app.models import User, Role, UserRole, Organization
from app.core.security import verify_password, get_password_hash
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse
from app.repositories.user_repository import UserRepository
from app.repositories.organization_repository import OrganizationRepository
from app.exceptions.auth_exceptions import (
    InvalidCredentialsError,
    UserNotFoundError,
    UserInactiveError,
    EmailAlreadyExistsError
)
from datetime import datetime


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Autentica un usuario y retorna el usuario si las credenciales son válidas"""
    user_repo = UserRepository(User, db)
    user = user_repo.get_by_email(email)
    
    if not user:
        return None
    
    if not verify_password(password, user.password_hash):
        return None
    
    if not user.is_active:
        raise UserInactiveError()
    
    return user


def get_user_roles(db: Session, user_id: int) -> list[str]:
    """Obtiene los roles de un usuario"""
    user_repo = UserRepository(User, db)
    return user_repo.get_user_roles(user_id)


def get_user_with_roles(db: Session, user: User) -> UserResponse:
    """Obtiene un usuario con sus roles y organización"""
    roles = get_user_roles(db, user.id)
    organization = db.query(Organization).filter(Organization.id == user.organization_id).first()
    
    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        organization_id=user.organization_id,
        organization_name=organization.name if organization else None,
        roles=roles,
        is_active=user.is_active,
        is_verified=user.is_verified
    )


def create_user(db: Session, register_data: RegisterRequest, organization_id: int) -> User:
    """Crea un nuevo usuario"""
    user_repo = UserRepository(User, db)
    
    # Verificar si el email ya existe
    existing_user = user_repo.get_by_email(register_data.email)
    if existing_user:
        raise EmailAlreadyExistsError()
    
    # Crear usuario
    user = User(
        organization_id=organization_id,
        email=register_data.email,
        password_hash=get_password_hash(register_data.password),
        first_name=register_data.first_name,
        last_name=register_data.last_name,
        is_active=True,
        is_verified=False  # Requiere verificación por email en producción
    )
    
    db.add(user)
    db.flush()
    
    # Asignar rol "user" por defecto
    user_role = db.query(Role).filter(Role.name == "user").first()
    if user_role:
        user_role_assignment = UserRole(user_id=user.id, role_id=user_role.id)
        db.add(user_role_assignment)
    
    db.commit()
    db.refresh(user)
    return user


def create_organization_with_user(db: Session, register_data: RegisterRequest) -> tuple[Organization, User]:
    """Crea una nueva organización con su usuario administrador"""
    org_repo = OrganizationRepository(Organization, db)
    
    # Generar slug único
    base_slug = register_data.organization_name.lower().replace(" ", "-") if register_data.organization_name else "org"
    slug = base_slug
    counter = 1
    while org_repo.get_by_slug(slug):
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    # Crear organización
    organization = Organization(
        name=register_data.organization_name or "New Organization",
        slug=slug,
        is_active=True,
        plan="free"
    )
    db.add(organization)
    db.flush()
    
    # Crear usuario admin
    user = create_user(db, register_data, organization.id)
    
    # Asignar rol admin
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if admin_role:
        user_role_assignment = UserRole(user_id=user.id, role_id=admin_role.id)
        db.add(user_role_assignment)
        # Remover rol user si existe
        user_role = db.query(Role).filter(Role.name == "user").first()
        if user_role:
            existing_user_role = db.query(UserRole).filter(
                UserRole.user_id == user.id,
                UserRole.role_id == user_role.id
            ).first()
            if existing_user_role:
                db.delete(existing_user_role)
    
    db.commit()
    db.refresh(organization)
    db.refresh(user)
    
    return organization, user

