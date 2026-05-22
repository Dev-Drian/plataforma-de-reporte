from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import create_access_token
from app.core.auth_middleware import get_current_user
from app.core.response import success_response, created_response, error_response
from app.schemas.auth import LoginRequest, LoginResponse, RegisterRequest, UserResponse
from app.services.auth_service import (
    authenticate_user,
    get_user_with_roles,
    create_user,
    create_organization_with_user
)
from app.exceptions.auth_exceptions import InvalidCredentialsError
from app.models import User, Organization

router = APIRouter()


@router.post("/login")
async def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Endpoint de login"""
    try:
        user = authenticate_user(db, login_data.email, login_data.password)
        if not user:
            return error_response(
                "Credenciales inválidas",
                401,
                "Invalid email or password",
                str(request.url.path)
            )
        
        # Obtener roles del usuario
        from app.services.auth_service import get_user_roles
        roles = get_user_roles(db, user.id)
        
        # Crear token
        token_data = {
            "user_id": user.id,
            "email": user.email,
            "organization_id": user.organization_id,
            "roles": roles
        }
        access_token = create_access_token(data=token_data)
        
        # Obtener información completa del usuario
        user_response = get_user_with_roles(db, user)
        
        return success_response(
            data={
                "token": access_token,
                "user": user_response.model_dump(mode='json') if hasattr(user_response, 'model_dump') else user_response
            },
            message="Login successful",
            status_code=200,
            path=str(request.url.path)
        )
    except InvalidCredentialsError:
        return error_response(
            "Credenciales inválidas",
            401,
            "Invalid email or password",
            str(request.url.path)
        )
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        error_details = traceback.format_exc()
        logger.error(f"Login error: {str(e)}\n{error_details}")
        return error_response(
            "Error al iniciar sesión",
            500,
            str(e),
            str(request.url.path)
        )


@router.post("/register")
async def register(register_data: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Endpoint de registro"""
    # Si no se proporciona organización, crear una nueva
    if register_data.organization_name:
        organization, user = create_organization_with_user(db, register_data)
    else:
        # Buscar organización por defecto o crear una
        default_org = db.query(Organization).filter(Organization.slug == "demo-org").first()
        if not default_org:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No organization specified and no default organization found"
            )
        user = create_user(db, register_data, default_org.id)
        organization = default_org
    
    # Obtener roles
    from app.services.auth_service import get_user_roles
    roles = get_user_roles(db, user.id)
    
    # Crear token
    token_data = {
        "user_id": user.id,
        "email": user.email,
        "organization_id": user.organization_id,
        "roles": roles
    }
    access_token = create_access_token(data=token_data)
    
    # Obtener información completa del usuario
    user_response = get_user_with_roles(db, user)
    
    try:
        return created_response(
            data={
                "token": access_token,
                "user": user_response.model_dump(mode='json') if hasattr(user_response, 'model_dump') else user_response
            },
            message="User registered successfully",
            path=str(request.url.path)
        )
    except Exception as e:
        return error_response(
            "Error al registrar usuario",
            500,
            str(e),
            str(request.url.path)
        )


@router.get("/me")
async def get_me(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene el usuario actual desde el token"""
    try:
        user_response = get_user_with_roles(db, current_user)
        return success_response(
            data=user_response.model_dump(mode='json') if hasattr(user_response, 'model_dump') else user_response,
            message="Profile retrieved successfully",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        return error_response(
            "Error al obtener el perfil",
            500,
            str(e),
            str(request.url.path)
        )

