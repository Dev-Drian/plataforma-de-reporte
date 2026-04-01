"""
Funciones de Google OAuth organizadas por servicio
"""
from .ads import get_google_ads_customer_id
from .analytics import get_first_analytics_property
from .search_console import get_search_console_sites
from .common import get_google_user_info, get_account_id_for_type

__all__ = [
    "get_google_ads_customer_id",
    "get_first_analytics_property",
    "get_search_console_sites",
    "get_google_user_info",
    "get_account_id_for_type",
]
