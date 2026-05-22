"""
Módulo OAuth modularizado
Organizado por provider y tipo de servicio
"""
from .routes.configs import router as configs_router
from .routes.flow import router as flow_router
from fastapi import APIRouter

# Crear router principal que combina todas las rutas
router = APIRouter()

# Incluir sub-routers
router.include_router(configs_router, tags=["OAuth - Config"])
router.include_router(flow_router, tags=["OAuth - Flow"])

__all__ = ["router"]





