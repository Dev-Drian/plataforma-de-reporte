"""
URI de redirección OAuth: authorize y token deben usar la misma.

Si FRONTEND_URL apunta a entorno local, se ignora oauth_configs.redirect_uri
para no quedar atados a una URL de producción guardada en BD (p. ej. tras un seed).
"""
from app.core.config import settings
from app.models.oauth_config import OAuthConfig


def _is_local_frontend() -> bool:
    u = (settings.FRONTEND_URL or "").lower()
    return "localhost" in u or "127.0.0.1" in u


def resolve_oauth_redirect_uri(config: OAuthConfig, _platform: str = "") -> str:
    """
    URI efectiva para construir la URL de autorización y para el intercambio de código.

    En local (localhost / 127.0.0.1), para Google/Meta/TikTok se ignora redirect_uri en BD
    y se usa FRONTEND_URL + /oauth/callback (evita quedar atados a monitor.239web.com, etc.).
    LinkedIn mantiene el redirect guardado en BD (suele requerir path propio).
    """
    base = settings.FRONTEND_URL.rstrip("/")
    path = "/oauth/callback"
    pl = (_platform or "").lower()
    if _is_local_frontend() and pl in ("google", "meta", "tiktok"):
        return f"{base}{path}"
    stored = (config.redirect_uri or "").strip()
    if stored:
        return stored
    return f"{base}{path}"
