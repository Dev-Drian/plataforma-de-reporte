from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.auth_middleware import get_current_user
from app.models import User, OrganizationSetting
import json

router = APIRouter()


class ThemeColors(BaseModel):
    primary: str = "#0ea5e9"  # sky-500 (azul)
    secondary: str = "#3b82f6"  # blue-500
    accent: str = "#06b6d4"  # cyan-500
    background: str = "#f9fafb"  # gray-50
    surface: str = "#ffffff"  # white
    text: str = "#111827"  # gray-900
    textSecondary: str = "#6b7280"  # gray-500
    border: str = "#e5e7eb"  # gray-200
    success: str = "#10b981"  # green-500
    warning: str = "#f59e0b"  # amber-500
    error: str = "#ef4444"  # red-500


class ThemeUpdate(BaseModel):
    colors: Optional[ThemeColors] = None


@router.get("/theme")
async def get_theme(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene los colores del tema de la organización"""
    from app.core.response import success_response, error_response
    
    try:
        # Buscar configuración de tema
        theme_setting = db.query(OrganizationSetting).filter(
            OrganizationSetting.organization_id == current_user.organization_id,
            OrganizationSetting.key == "theme_colors"
        ).first()
        
        # Si no existe, devolver valores por defecto
        if not theme_setting or not theme_setting.value:
            default_theme = ThemeColors()
            return success_response(
                data={"colors": default_theme.model_dump(mode='json')},
                message="Theme retrieved successfully",
                status_code=200,
                path=str(request.url.path)
            )
        
        # Parsear JSON desde la BD
        try:
            colors_dict = json.loads(theme_setting.value)
            return success_response(
                data={"colors": colors_dict},
                message="Theme retrieved successfully",
                status_code=200,
                path=str(request.url.path)
            )
        except json.JSONDecodeError:
            default_theme = ThemeColors()
            return success_response(
                data={"colors": default_theme.model_dump(mode='json')},
                message="Theme retrieved successfully",
                status_code=200,
                path=str(request.url.path)
            )
    except Exception as e:
        return error_response(
            "Error al obtener el tema",
            500,
            str(e),
            str(request.url.path)
        )


@router.put("/theme")
async def update_theme(
    request: Request,
    theme_data: ThemeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualiza los colores del tema de la organización"""
    from app.core.response import success_response, error_response
    
    try:
        if not theme_data.colors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Colors are required"
            )
        
        # Buscar o crear configuración de tema
        theme_setting = db.query(OrganizationSetting).filter(
            OrganizationSetting.organization_id == current_user.organization_id,
            OrganizationSetting.key == "theme_colors"
        ).first()
        
        if theme_setting:
            # Actualizar existente
            theme_setting.value = json.dumps(theme_data.colors.model_dump())
        else:
            # Crear nuevo
            theme_setting = OrganizationSetting(
                organization_id=current_user.organization_id,
                key="theme_colors",
                value=json.dumps(theme_data.colors.model_dump()),
                description="Theme colors configuration"
            )
            db.add(theme_setting)
        
        db.commit()
        db.refresh(theme_setting)
        
        return success_response(
            data={"colors": theme_data.colors.model_dump(mode='json')},
            message="Theme updated successfully",
            status_code=200,
            path=str(request.url.path)
        )
    except HTTPException:
        raise
    except Exception as e:
        return error_response(
            "Error al actualizar el tema",
            500,
            str(e),
            str(request.url.path)
        )




