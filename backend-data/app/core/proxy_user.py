"""
Usuario virtual para requests que vienen del proxy de Limopress.
Tiene la misma interfaz mínima que User (id, organization_id, email) para
compatibilidad con las rutas que usan get_current_user.
"""
from dataclasses import dataclass


@dataclass
class ProxyUser:
    """Usuario de contexto cuando la petición viene vía proxy de Limopress."""
    id: int
    organization_id: int  # tenant_id de Limopress, mapeado a organization_id en Monitor
    email: str
    is_proxy: bool = True
    is_active: bool = True
